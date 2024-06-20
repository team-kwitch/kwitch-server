import dotenv from "dotenv";

dotenv.config();

export const SECRET_KEY = process.env.SECRET_KEY;

export const SERVER_PORT = process.env.SERVER_PORT || 8000;

export const REDIS_HOST = process.env.REDIS_HOST || "localhost";
export const REDIS_PORT = process.env.REDIS_PORT || "6379";
