import { NextFunction, Request, Response } from "express";
import passport from "passport";
import {
  Authorized,
  Controller,
  JsonController,
  Post,
  Req,
  Res,
  UseBefore,
} from "routing-controllers";
import { Service } from "typedi";

import AuthService from "@/services/AuthService";

@Service()
@JsonController("/auth")
export class AuthController {
  private readonly authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  @Post("/sign-up")
  public async signUp(@Req() req: Request, @Res() res: Response) {
    const { username, password }: { username: string; password: string } =
      req.body;

    const createdUser = await this.authService.signUp(username, password);
    return res.json({
      success: true,
      content: { user: createdUser },
    });
  }

  @Post("/sign-in")
  public async signIn(@Req() req: Request, @Res() res: Response) {
    return new Promise((resolve, reject) => {
      passport.authenticate("local", (authErr, user, info) => {
        if (authErr) {
          return reject(authErr);
        }

        if (!user) {
          return res
            .status(401)
            .json({ success: false, message: info.message });
        }

        req.logIn(user, (loginErr) => {
          if (loginErr) {
            return reject(loginErr);
          }

          delete user.password;
          return resolve({
            success: true,
            content: { user },
          });
        });
      })(req, res);
    });
  }

  @Post("/sign-out")
  public async signOut(
    @Req() req: Request,
    @Res() res: Response,
  ) {
      req.logOut((err) => {
        if (err) {
          return res.status(500).json({ success: false, message: err.message });
        }
        return res.json({ success: true });
      });
  }
}
