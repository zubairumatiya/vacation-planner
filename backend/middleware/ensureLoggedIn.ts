import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

declare module "express" {
  interface Request {
    user?: MyPayload; // adjust to your user shape
  }
}

type MyPayload = {
  id: string;
  name: string;
};

dotenv.config();

const SECRET = process.env.SIGNATURE;

export default function ensureLoggedIn(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token not found" });
    }
    if (!SECRET) {
      return res
        .status(501)
        .json({ message: "Unable to Authenticate Token, check secret" });
    }
    const decodedToken = jwt.verify(token, SECRET);
    const user = decodedToken as MyPayload;
    req.user = user;
  } catch (err) {
    next(err);
  }
}
