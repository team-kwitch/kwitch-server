import { Channel, User } from "@prisma/client";
import express, { Request, Response } from "express";

import { isAuthenticated } from "../middleware/Authentication";

const userRouter = express.Router();

userRouter.get("/me", isAuthenticated, async (req: Request, res: Response) => {
  const user = req.user as User & { channel: Channel };
  return res.json({
    user: { id: user.id, username: user.username, channelId: user.channel.id },
  });
});

export default userRouter;
