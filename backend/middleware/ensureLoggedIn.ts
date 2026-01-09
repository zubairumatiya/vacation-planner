import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { MyPayload } from "../types/express";

dotenv.config();

const SECRET = process.env.SIGNATURE;

function extractBearerToken(authHeader: string) {
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer") return null;
  if (!token) return null;

  // catch common coercion cases
  if (token === "null" || token === "undefined") return null;

  return token;
}

export default function ensureLoggedIn(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      console.log("malformed token/invalid auth!! ~~~~~ console logging");
      res.status(401).json({ message: "Token not found" });
      return;
    }
    if (!SECRET) {
      res
        .status(501)
        .json({ message: "Unable to Authenticate Token, check secret" });
      return;
    }
    const decodedToken = jwt.verify(token, SECRET);
    req.user = decodedToken as MyPayload;
    req.user.id = "019b1f45-2f92-7904-ae7f-3cef72b71b74";
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      console.log("token expired --- console logging");
      res.status(401).json({ error: "TokenExpired" });
      return;
    }
    next(err);
  }
}
