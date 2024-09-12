import { User } from "@prisma/client";
import bcrypt from "bcrypt";
import passport from "passport";
import passportLocal from "passport-local";

import prisma from "./prisma";

const LocalStrategy = passportLocal.Strategy;

const verifyCallback = async (
  username: string,
  password: string,
  done: Function,
) => {
  try {
    const findUser = await prisma.user.findUnique({ where: { username } });

    if (!findUser) {
      return done(null, false, { message: "존재하지 않는 사용자입니다." });
    }

    const checkPassword = await bcrypt.compare(password, findUser.password);

    if (!checkPassword) {
      return done(null, false, { message: "비밀번호가 일치하지 않습니다." });
    }

    return done(null, findUser);
  } catch (err) {
    done(err);
  }
};

const localStrategy = new LocalStrategy(
  { usernameField: "username", passwordField: "password", session: true },
  verifyCallback,
);

passport.use(localStrategy);

passport.serializeUser((user: User, done) => {
  done(null, user.id);
});

passport.deserializeUser((userId: number, done) => {
  prisma.user
    .findFirst({
      where: { id: userId },
      include: { channel: true },
    })
    .then((user) => done(null, user))
    .catch((err) => done(err));
});
