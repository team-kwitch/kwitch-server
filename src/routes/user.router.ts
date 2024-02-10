import express, { Request, Response } from "express";
import { isAuthenticated } from "../util/middleware";

const userRouter = express.Router();

userRouter.get("/me", isAuthenticated, async (req: Request, res: Response) => {
  return res.json({ user: { id: req.user.id, username: req.user.username } });
});

export default userRouter;
