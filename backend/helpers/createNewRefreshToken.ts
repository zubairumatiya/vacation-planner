import crypto from "crypto";
import db from "../db/db.js";
import jwt from "jsonwebtoken";

export default async function createNewRefreshToken(
  userId: string,
  exp?: number
): Promise<string | undefined> {
  const SECRET2 = process.env.SIGNATURE2;
  if (!SECRET2) {
    return undefined;
  }

  const jti = crypto.randomBytes(16).toString("hex");

  const refreshToken = jwt.sign(
    {
      sub: userId,
      jti,
      exp: exp ?? Math.floor(Date.now() / 1000) + 86400 * 3, // time stamp instead of time duration using expires in. Should be seconds in a day * days we want
    },
    SECRET2
  );
  const decoded = jwt.decode(refreshToken);
  if (decoded && typeof decoded === "object" && !Array.isArray(decoded)) {
    const decodedExp = decoded.exp;
    if (decodedExp === undefined) {
      return undefined;
    }
    const addRefTokenToDb = await db.query(
      "INSERT INTO refresh_tokens (user_id, jti, expires_at) VALUES ($1,$2,$3) RETURNING *",
      [userId, jti, new Date(decodedExp * 1000)]
    );

    if (addRefTokenToDb.rowCount !== null && addRefTokenToDb.rowCount < 1) {
      return undefined;
    } else {
      return refreshToken;
    }
  }
}
