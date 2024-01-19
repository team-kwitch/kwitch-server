import passportLocal from "passport-local";
import passport from "passport";
import bcrypt from "bcrypt";
import prisma from "./prisma";

import { User } from "@prisma/client";

const LocalStrategy = passportLocal.Strategy;

export function configPassport() {
  passport.use(
    new LocalStrategy(
      {
        usernameField: "username",
        passwordField: "password",
      },
      async (username, password, done) => {
        try {
          const findUser = await prisma.user.findUnique({
            where: { username },
          });

          if (!findUser) {
            return done(null, false, {
              message: "존재하지 않는 사용자입니다!",
            });
          }

          const result = await bcrypt.compare(password, findUser.password);
          if (!result) {
            return done(null, false, {
              message: "비밀번호가 틀렸습니다!",
            });
          }

          return done(null, findUser);
        } catch (err) {
          console.error(err);
          done(err);
        }
      }
    )
  );
}
