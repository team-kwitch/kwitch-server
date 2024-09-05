import express from "express";

import authRouter from "./AuthRouter";
import channelRouter from "./ChannelRouter";
import userRouter from "./UserRouter";

const rootRouter = express.Router();

rootRouter.use("/api/auth", authRouter);
rootRouter.use("/api/users", userRouter);
rootRouter.use("/api/channels", channelRouter);

export default rootRouter;
