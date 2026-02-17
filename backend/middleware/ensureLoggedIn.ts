import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { NextFunction } from "express";
import {
  MyPayload,
  AuthResponse,
  TypedRequest,
  TypedResponse,
} from "../types/express.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const SECRET = process.env.SIGNATURE;

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer") return null;
  if (!token) return null;

  // catch common coercion cases
  if (token === "null" || token === "undefined") return null;

  return token;
}

export default function ensureLoggedIn(
  req: TypedRequest,
  res: TypedResponse<AuthResponse>,
  next: NextFunction,
): void {
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
    next();
  } catch (err) {
    if (err instanceof Error && err.name === "TokenExpiredError") {
      console.log("token expired --- console logging");
      res.status(401).json({ error: "TokenExpired" });
      return;
    }
    if (err instanceof Error && err.name === "JsonWebTokenError") {
      res.status(401).json({ error: "JwtError" });
      return;
    }
    next(err);
  }
}
