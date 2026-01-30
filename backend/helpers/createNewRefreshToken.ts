import crypto from "crypto";
import db from "../db/db.js";
import jwt from "jsonwebtoken";

export default async function createNewRefreshToken(
  userId: string,
  exp?: number
): Promise<undefined | string> {
  const SECRET2 = process.env.SIGNATURE2;

  const jti = crypto.randomBytes(16).toString("hex");

  const refreshToken = jwt.sign(
    {
      sub: userId,
      jti,
      exp: exp ?? Math.floor(Date.now() / 1000) + 10800, // time stamp instead of time duration using expires in.
    },
    SECRET2
  );
  const decoded = jwt.decode(refreshToken);
  if (decoded && typeof decoded === "object" && !Array.isArray(decoded)) {
    const exp = decoded.exp;
    const addRefTokenToDb = await db.query(
      "INSERT INTO refresh_tokens (user_id, jti, expires_at) VALUES ($1,$2,$3) RETURNING *",
      [userId, jti, new Date(exp * 1000)]
    );

    if (addRefTokenToDb.rowCount < 1) {
      return undefined;
    } else {
      return refreshToken;
    }
  }
}
