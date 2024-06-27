import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request } from "express";
import session, { Session } from "express-session";
import http from "http";
import passport from "passport";
import { Server, Socket } from "socket.io";

import rootRouter from "@routes/index";

import "@lib/passport";
import prisma from "@lib/prisma";

import { Broadcast } from "../typings";
import { redisConnection } from "./lib/redis";
import {
  getChannelKey,
  registerBroadcastHandler,
  registerP2PConnectionHandler,
} from "./socket";

const app = express();

const sessionOptions: session.SessionOptions = {
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: false,
  store: new PrismaSessionStore(prisma, {
    checkPeriod: 2 * 60 * 1000, //ms
    dbRecordIdIsSessionId: true,
    dbRecordIdFunction: undefined,
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    secure: true,
    httpOnly: true,
  },
};

app.use(cookieParser(process.env.SECRET_KEY));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());
app.use(rootRouter);

const httpServer = http.createServer(app);
const io = new Server(httpServer);

const wrap = (middleware) => (socket, next) =>
  middleware(socket.request, {}, next);

io.use(wrap(cookieParser()));
io.use(wrap(session(sessionOptions)));
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

const PORT = process.env.PORT || 8000;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  redisConnection.FLUSHALL();
});
