import express, { Request, Response } from "express";
import passport from "passport";
import Container from "typedi";

import AuthService from "@/services/auth.service";

const authRouter = express.Router();
const userService = Container.get(AuthService);

authRouter.post("/sign-up", async (req: Request, res: Response) => {
  const { username, password }: { username: string; password: string } =
    req.body;

  const createdUser = await userService.signUp(username, password);
  res.json({
    result: true,
    message: "successfully created user",
    data: { user: createdUser },
  });
});

authRouter.post("/sign-in", (req: Request, res: Response, next) => {
  passport.authenticate("local", (authErr, user, info) => {
    if (authErr) {
      console.error(authErr);
      return res.status(500).json({ message: authErr.message });
    }

    if (!user) {
      return res.status(401).json({ message: info.message });
    }

    return req.logIn(user, (loginErr) => {
      if (loginErr) {
        return res.status(500).json({ message: loginErr.message });
      }
      return res.json({
        result: true,
        message: "successfully logged in",
        user: { id: user.id, username: user.username },
      });
    });
  })(req, res, next);
});

authRouter.post("/sign-out", (req: Request, res: Response, next) => {
  req.logOut((err) => {
    if (err) {
      next(err);
    }
    res.json({ result: true, message: "Successfully logged out" });
  });
});

export default authRouter;
