import { Request, Response } from "express";
import passport from "passport";
import { Authorized, Controller, Post, Req, Res, UseBefore } from "routing-controllers";
import { Service } from "typedi";

import AuthService from "@/services/AuthService";

@Service()
@Controller("/api/auth")
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
  public async signIn(
    @Req() req: Request,
    @Res() res: Response,
    next: (err?: any) => any,
  ) {
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
          success: true,
          content: { id: user.id, username: user.username },
        });
      });
    })(req, res, next);
  }

  @Post("/sign-out")
  @Authorized()
  public async signOut(
    @Req() req: Request,
    @Res() res: Response,
    next: (err?: any) => any,
  ) {
    req.logOut((err) => {
      if (err) {
        next(err);
      }
      return res.json({ success: true });
    });
  }
}
