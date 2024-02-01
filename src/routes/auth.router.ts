import express from "express";
import prisma from "../lib/prisma";
import passport from "passport";
import bcrypt from "bcrypt";

const authRouter = express.Router();

/**
 * 회원가입
 */
authRouter.post("/sign-up", async (req, res) => {
  try {
    const { username, password }: { username: string; password: string } =
      req.body;

    const checkUser = await prisma.user.findUnique({ where: { username } });
    if (checkUser) {
      return res.status(400).json({ message: "이미 존재하는 아이디입니다." });
    }

    const salt = bcrypt.genSaltSync(12);
    const hashedPassword = bcrypt.hashSync(password, salt);

    await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        salt,
      },
    });

    res.json({ result: true, message: "회원가입이 완료되었습니다." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * 로그인
 */
authRouter.post("/sign-in", async (req, res) => {
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
        return res.json({ result: true, message: "로그인 성공" });
      });
    })(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

export default authRouter;
