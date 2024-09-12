import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Request } from "express";
import express from "express";
import session from "express-session";
import http from "http";
import passport from "passport";
import "reflect-metadata";
import {
  Action,
  createExpressServer,
  useContainer,
  useExpressServer,
} from "routing-controllers";
import { Server, Socket } from "socket.io";

import "@/lib/passport";
import prisma from "@/lib/prisma";

import { config } from "./config";
import { AuthController } from "./controllers/AuthController";
import { ChannelController } from "./controllers/ChannelController";
import { UserController } from "./controllers/UserController";
import { createWorker } from "./lib/mediasoup";
import { redisConnection } from "./lib/redis";
import { BroadcastHandler } from "./socket/BroadcastHandler";
import { SFUConnectionHandler } from "./socket/SFUConnectionHandler";
import { registerDisconnectingHandler } from "./socket/disconnecting.handler";
import Container from "typedi";

const app = express();
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const corsOption: cors.CorsOptions = {
  origin: ["https://kwitch.online", "http://localhost:3000"],
  credentials: true,
};

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
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  },
};

useContainer(Container);

app.use(cors(corsOption));
app.use(cookieParser(process.env.SECRET_KEY));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());
useExpressServer(app, {
  authorizationChecker: (action: Action) => new Promise<boolean>((resolve, reject) => {
    passport.authenticate('session', (err, user) => {
      if (err) {
        return reject(err);
      }
      if (!user) {
        return resolve(false);
      }
      action.request.user = user;
      return resolve(true);
    })(action.request, action.response, action.next);
  }),
  currentUserChecker: (action: Action) => action.request.user,
  controllers: [AuthController, UserController, ChannelController],
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: corsOption,
});

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
  BroadcastHandler.register(io, socket);
  SFUConnectionHandler.register(io, socket);
  registerDisconnectingHandler(io, socket);
});

httpServer.listen(config.app.port, async () => {
  await redisConnection.FLUSHALL();

  await createWorker();

  console.log(`server is running on port ${config.app.port}`);
});
