import { User as UserModel } from "@prisma/client";

declare module "express" {
  interface Request {
    user: UserModel;
  }
}
