import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request } from "express";
import session from "express-session";
import http from "http";
import passport from "passport";
import "reflect-metadata";
import { Server, Socket } from "socket.io";

import "@/lib/Passport";
import prisma from "@/lib/Prisma";

import rootRouter from "@routes/index";

import { redisConnection } from "./lib/Redis";
import { registerBroadcastHandler } from "./socket/BroadcastHandler";
import { registerDisconnectingHandler } from "./socket/DisconnectingHandler";
import { registerP2PConnectionHandler } from "./socket/P2PConnectionHandler";
import { registerSFUConnectionHandler } from "./socket/SFUConnectionHandler";

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
app.use(rootRouter);

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
  registerBroadcastHandler(io, socket);
  registerSFUConnectionHandler(io, socket);
  registerDisconnectingHandler(io, socket);
});

const PORT = process.env.PORT || 8000;

httpServer.listen(PORT, async () => {
  await redisConnection.FLUSHALL();
  console.log(`Server is running on port ${PORT}`);
});
