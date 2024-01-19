import express from "express";

const rootRouter = express.Router();

import authRouter from "./auth.router";
import userRouter from "./user.router";

rootRouter.use("/api/auth", authRouter);
rootRouter.use("/api/user", userRouter);

export default rootRouter;
