import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import bodyParser from "body-parser";
import express, { Request } from "express";
import session from "express-session";
import http from "http";
import passport from "passport";
import { Server, Socket } from "socket.io";

import rootRouter from "@routes/index";

import "@lib/passport";
import prisma from "@lib/prisma";

import { SECRET_KEY, SERVER_PORT } from "@utils/env";

import { Broadcast } from "../typings";
import { redisConnection } from "./lib/redis";
import {
  getChannelKey,
  registerBroadcastHandler,
  registerP2PConnectionHandler,
} from "./socket";

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);

const sessionMiddleware = session({
  secret: SECRET_KEY,
  resave: false,
  saveUninitialized: true,
  store: new PrismaSessionStore(prisma, {
    checkPeriod: 2 * 60 * 1000, //ms
    dbRecordIdIsSessionId: true,
    dbRecordIdFunction: undefined,
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // Equals 1 day (1 day * 24 hr/1 day * 60 min/1 hr * 60 sec/1 min * 1000 ms / 1 sec)
  },
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
app.use(rootRouter);

const wrap = (middleware) => (socket, next) =>
  middleware(socket.request, {}, next);

io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

io.use((socket: Socket, next) => {
  const req = socket.request as Request;
  const user = req.user;

  if (user) {
    console.log(`socket connected: ${socket.id}`);
    console.log(`recognized user: ${req.user.username}`);
    next();
  } else {
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket: Socket) => {
  const req = socket.request as Request;
  const user = req.user;

  registerBroadcastHandler(io, socket);
  registerP2PConnectionHandler(io, socket);

  socket.on("disconnecting", async () => {
    console.log(`socket disconnected: ${socket.id}`);

    socket.rooms.forEach(async (roomName: string) => {
      if (roomName === socket.id) {
        return;
      }

      const channelKey = getChannelKey(roomName);
      const isOnLive = await redisConnection.exists(channelKey);

      if (!isOnLive) {
        return;
      }

      const broadcast: Broadcast = JSON.parse(
        await redisConnection.HGET(channelKey, "broadcast"),
      );

      if (broadcast.ownerId === user.id) {
        await redisConnection.DEL(channelKey);
        socket.to(broadcast.roomName).emit("broadcasts:destroy");
        io.sockets.socketsLeave(roomName);
        io.emit("broadcasts:update");
        console.log("broadcast is automatically ended");
      } else {
        await redisConnection.HINCRBY(channelKey, "viewers", -1);
      }
    });
  });
});

httpServer.listen(SERVER_PORT, () => {
  console.log(`Server is running on port ${SERVER_PORT}`);
  redisConnection.FLUSHALL();
});
