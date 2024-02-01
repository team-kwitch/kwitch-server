import express from "express";
import passport from "passport";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import prisma from "./lib/prisma";
import http from "http";
import { Server, Socket } from "socket.io";
import bodyParser from "body-parser";
import session from "express-session";
import rootRouter from "./routes";
import "./lib/passport";
import { SECRET_KEY, SERVER_PORT } from "./util/env";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(
  session({
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
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(rootRouter);

io.on("connection", (socket: Socket) => {
  const req = socket.request;
});

server.listen(SERVER_PORT);
