import express from "express";

const rootRouter = express.Router();

import authRouter from "./auth.router";
import userRouter from "./user.router";
import channelRouter from "./channel.router";

rootRouter.use("/api/auth", authRouter);
rootRouter.use("/api/users", userRouter);
rootRouter.use("/api/channels", channelRouter);

export default rootRouter;
