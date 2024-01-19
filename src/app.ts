import express from "express";
import bodyParser = require("body-parser");
import passport from "passport";
import { configPassport } from "./util/passport";

import rootRouter from "./routes";

const SERVER_PORT = 8000;

const app = express();

configPassport();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static("./src/public"));

app.use(passport.initialize());

app.use("/", rootRouter);

app.listen(SERVER_PORT, async () => {
  console.log(`${SERVER_PORT}번 포트에서 서버 온!`);
});
