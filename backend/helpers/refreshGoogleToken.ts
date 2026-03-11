import db from "../db/db.js";
import type { GoogleTokenRow } from "../types/app-types.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GEMINI_CLIENT_SECRET;

interface GoogleRefreshResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export default async function refreshGoogleToken(
  userId: string
): Promise<string> {
  const result = await db.query<GoogleTokenRow>(
    "SELECT * FROM google_tokens WHERE user_id = $1",
    [userId]
  );

  if (result.rowCount === null || result.rowCount < 1) {
    throw new Error("NoAiAuth");
  }

  const row = result.rows[0];
  if (!row.refresh_token) {
    await db.query("DELETE FROM google_tokens WHERE user_id = $1", [userId]);
    throw new Error("NoRefreshToken");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: row.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    await db.query("DELETE FROM google_tokens WHERE user_id = $1", [userId]);
    throw new Error("RefreshFailed");
  }

  const data: GoogleRefreshResponse = await response.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await db.query(
    "UPDATE google_tokens SET access_token = $1, expires_at = $2, updated_at = NOW() WHERE user_id = $3",
    [data.access_token, expiresAt, userId]
  );

  return data.access_token;
}
