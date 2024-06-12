import express from "express";

import authRouter from "./auth.router";
import channelRouter from "./channel.router";
import userRouter from "./user.router";

const rootRouter = express.Router();

rootRouter.use("/api/auth", authRouter);
rootRouter.use("/api/users", userRouter);
rootRouter.use("/api/channels", channelRouter);

export default rootRouter;
