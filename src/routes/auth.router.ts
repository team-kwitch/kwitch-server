import bcrypt from "bcrypt";
import express, { Request, Response } from "express";
import passport from "passport";

import prisma from "../lib/prisma";

const authRouter = express.Router();

authRouter.post("/sign-up", async (req: Request, res: Response) => {
  try {
    const { username, password }: { username: string; password: string } =
      req.body;

    const checkUser = await prisma.user.findUnique({ where: { username } });
    if (checkUser) {
      return res.status(400).json({ message: "username already exists" });
    }

    const salt = bcrypt.genSaltSync(12);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const createdUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        salt,
        channel: {
          create: {
            name: username,
          },
        },
      },
    });

    res.json({
      result: true,
      message: "successfully created user",
      data: { user: createdUser },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

authRouter.post("/sign-in", async (req: Request, res: Response) => {
  try {
    passport.authenticate("local", (authErr, user, info) => {
      if (authErr) {
        return res.status(500).json({ message: authErr.message });
      }

      if (!user) {
        return res.status(400).json({ message: info.message });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: loginErr.message });
        }
        return res.json({
          result: true,
          message: "successfully logged in",
          user: { id: user.id, username: user.username },
        });
      });
    })(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

authRouter.post("/sign-out", (req: Request, res: Response, next) => {
  req.logout((err) => {
    if (err) {
      next(err);
    }
    res.json({ result: true, message: "Successfully logged out" });
  });
});

export default authRouter;
