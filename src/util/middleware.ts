import { NextFunction, Request, Response } from "express";

export function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "not authenticated" });
  }
  next();
}

export function isAdmin(req: Request, res: Response, next: NextFunction) {
  throw new Error("Not Implemented");
  // if (req.user.role !== "admin") {
  //   return res.status(401).send("not authorized");
  // }
  // next();
}
