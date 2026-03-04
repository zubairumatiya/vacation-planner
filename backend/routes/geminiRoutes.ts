import express, { NextFunction } from "express";
import db from "../db/db.js";
import ensureLoggedIn from "../middleware/ensureLoggedIn.js";
import refreshGoogleToken from "../helpers/refreshGoogleToken.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import type {
  TypedRequest,
  TypedResponse,
  TokenExchangeBody,
  GeminiChatBody,
  GeminiChatResponse,
  GeminiStatusResponse,
  GoogleTokenRow,
} from "../types/express.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GEMINI_CLIENT_SECRET;

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

// POST /gemini/token-exchange
router.post(
  "/gemini/token-exchange",
  ensureLoggedIn,
  async (
    req: TypedRequest<TokenExchangeBody>,
    res: TypedResponse<{ message: string }>,
    next: NextFunction
  ) => {
    const { code, codeVerifier, redirectUri } = req.body;
    if (!code || !codeVerifier || !redirectUri) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          code,
          code_verifier: codeVerifier,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[Gemini] Token exchange error:", errorData);
        res.status(502).json({
          message:
            errorData.error_description || "Token exchange with Google failed",
        });
        return;
      }

      const data: GoogleTokenResponse = await response.json();
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);

      await db.query(
        `INSERT INTO google_tokens (user_id, access_token, refresh_token, expires_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET
           access_token = $2,
           refresh_token = COALESCE($3, google_tokens.refresh_token),
           expires_at = $4,
           updated_at = NOW()`,
        [req.user.id, data.access_token, data.refresh_token ?? null, expiresAt]
      );

      res.status(200).json({ message: "success" });
      return;
    } catch (err) {
      next(err);
    }
  }
);

// POST /gemini/chat
router.post(
  "/gemini/chat",
  ensureLoggedIn,
  async (
    req: TypedRequest<GeminiChatBody>,
    res: TypedResponse<GeminiChatResponse>,
    next: NextFunction
  ) => {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
      res.status(400).json({ message: "Prompt is required" });
      return;
    }

    try {
      const result = await db.query<GoogleTokenRow>(
        "SELECT * FROM google_tokens WHERE user_id = $1",
        [req.user.id]
      );

      if (result.rowCount === null || result.rowCount < 1) {
        res
          .status(401)
          .json({ error: "NoGeminiAuth", message: "Google authentication required" });
        return;
      }

      let accessToken = result.rows[0].access_token;
      const expiresAt = new Date(result.rows[0].expires_at);

      // Refresh if token expires within 60 seconds
      if (expiresAt.getTime() - Date.now() < 60000) {
        try {
          accessToken = await refreshGoogleToken(req.user.id);
        } catch {
          res
            .status(401)
            .json({ error: "NoGeminiAuth", message: "Google authentication expired" });
          return;
        }
      }

      const geminiResponse = await callGemini(accessToken, prompt);

      if (geminiResponse.status === 401) {
        // Token was rejected, try one refresh
        try {
          accessToken = await refreshGoogleToken(req.user.id);
          const retryResponse = await callGemini(accessToken, prompt);
          if (!retryResponse.ok) {
            res.status(502).json({ message: "Gemini API error after token refresh" });
            return;
          }
          const retryData = await retryResponse.json();
          const text = retryData?.candidates?.[0]?.content?.parts?.[0]?.text;
          res.status(200).json({ text: text ?? "" });
          return;
        } catch {
          res
            .status(401)
            .json({ error: "NoGeminiAuth", message: "Google authentication expired" });
          return;
        }
      }

      if (!geminiResponse.ok) {
        const errorData = await geminiResponse.json();
        console.error("[Gemini] API error:", errorData);
        res.status(502).json({ message: "Gemini API error" });
        return;
      }

      const data = await geminiResponse.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      res.status(200).json({ text: text ?? "" });
      return;
    } catch (err) {
      next(err);
    }
  }
);

// GET /gemini/status
router.get(
  "/gemini/status",
  ensureLoggedIn,
  async (
    req: TypedRequest,
    res: TypedResponse<GeminiStatusResponse>,
    next: NextFunction
  ) => {
    try {
      const result = await db.query(
        "SELECT 1 FROM google_tokens WHERE user_id = $1",
        [req.user.id]
      );
      res
        .status(200)
        .json({ connected: result.rowCount !== null && result.rowCount > 0 });
      return;
    } catch (err) {
      next(err);
    }
  }
);

async function callGemini(accessToken: string, prompt: string) {
  return fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );
}

export default router;
