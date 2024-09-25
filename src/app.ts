import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Request } from "express";
import session from "express-session";
import http from "http";
import passport from "passport";
import "reflect-metadata";
import express from "express";
import {
  ActionMetadata,
  useContainer,
  useExpressServer,
} from "routing-controllers";
import { Server, Socket } from "socket.io";
import Container from "typedi";

import "@/lib/passport";
import prisma from "@/lib/prisma";

import { config } from "./config";
import { createWorker } from "./lib/mediasoup";
import { redisConnection } from "./lib/redis";
import { socketHandlerToken } from "./socket";
import { BroadcastHandler } from "./socket/BroadcastHandler";
import { SFUConnectionHandler } from "./socket/SFUConnectionHandler";

useContainer(Container);

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

app.use(cors(corsOption));
app.use(cookieParser(process.env.SECRET_KEY));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());

useExpressServer(app, {
  routePrefix: "/api",
  controllers: [__dirname + "/controllers/*.ts", __dirname + "/controllers/*.js"],
  authorizationChecker: async (action, roles) => {
    const request = action.request as Request;
    return request.isAuthenticated();
  },
  currentUserChecker: async (action) => {
    const request = action.request as Request;
    return request.user;
  }
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

Container.import([BroadcastHandler, SFUConnectionHandler]);
io.on("connection", (socket: Socket) => {
  Container.getMany(socketHandlerToken).forEach((handler) => {
    handler.register(io, socket);
  });
});

httpServer.listen(config.https.listenPort, async () => {
  await redisConnection.FLUSHALL();

  await createWorker();

  console.log(`server is running on port ${config.https.listenPort}`);
});
