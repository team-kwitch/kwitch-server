import express, { Request, Response } from "express";
import { isAuthenticated } from "../util/middleware";

const userRouter = express.Router();

userRouter.get("/me", isAuthenticated, async (req: Request, res: Response) => {
  return res.json({ username: req.user.username });
});

export default userRouter;
