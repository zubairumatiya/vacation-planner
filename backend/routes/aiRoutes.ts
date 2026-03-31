import express, { NextFunction } from "express";
import db from "../db/db.js";
import ensureLoggedIn from "../middleware/ensureLoggedIn.js";
import {
  chat,
  getRecommendedPlaces,
  getListPlaces,
  clearRecommendedPlaces,
  clearListPlaces,
  markPlaceAdded,
  markPlaceAddedByName,
  markListPlaceAdded,
} from "../helpers/aiService.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import type {
  TypedRequest,
  TypedResponse,
  TokenExchangeBody,
  AiChatBody,
  AiChatResponse,
  AiStatusResponse,
  AiRecommendedPlace,
  AiListPlace,
  GoogleTokenRow,
  TripIdParam,
} from "../types/app-types.js";

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

// ──────────────────────────────────────────────
// OAuth endpoints (kept wired but no longer used by AI chat)
// ──────────────────────────────────────────────

// POST /ai/token-exchange
router.post(
  "/ai/token-exchange",
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
        console.error("[AI] Token exchange error:", errorData);
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

// ──────────────────────────────────────────────
// AI Chat (API key, no OAuth needed)
// ──────────────────────────────────────────────

// POST /ai/chat
router.post(
  "/ai/chat",
  ensureLoggedIn,
  async (
    req: TypedRequest<AiChatBody>,
    res: TypedResponse<AiChatResponse>,
    next: NextFunction
  ) => {
    const { tripId, prompt, mode, categories, previousResponse, fillInTheRest } = req.body;
    const hasPrompt = prompt && prompt.trim();
    const hasMode = mode === "list" || mode === "schedule";
    if (!hasPrompt && !hasMode) {
      res.status(400).json({ text: "", message: "Prompt or mode is required" });
      return;
    }
    if (!tripId) {
      res.status(400).json({ text: "", message: "tripId is required" });
      return;
    }
    if (prompt && prompt.length > 2000) {
      res.status(400).json({ text: "", message: "Prompt must be 2000 characters or less" });
      return;
    }
    if (previousResponse && previousResponse.length > 10000) {
      res.status(400).json({ text: "", message: "Previous response too large" });
      return;
    }

    try {
      const result = await chat(
        tripId,
        prompt?.trim() || "",
        mode ?? null,
        categories,
        previousResponse,
        fillInTheRest,
      );
      res.status(200).json(result);
      return;
    } catch (err) {
      next(err);
    }
  }
);

// GET /ai/status
router.get(
  "/ai/status",
  ensureLoggedIn,
  async (
    req: TypedRequest,
    res: TypedResponse<AiStatusResponse>,
    next: NextFunction
  ) => {
    try {
      res.status(200).json({ connected: !!process.env.GEMINI_API_KEY });
      return;
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────
// Recommended Places
// ──────────────────────────────────────────────

// GET /ai/recommended-places/:tripId
router.get(
  "/ai/recommended-places/:tripId",
  ensureLoggedIn,
  async (
    req: TypedRequest<unknown, unknown, TripIdParam>,
    res: TypedResponse<{ places: AiRecommendedPlace[] }>,
    next: NextFunction
  ) => {
    try {
      const places = await getRecommendedPlaces(req.params.tripId);
      res.status(200).json({ places });
      return;
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /ai/recommended-places/:tripId
router.delete(
  "/ai/recommended-places/:tripId",
  ensureLoggedIn,
  async (
    req: TypedRequest<unknown, unknown, TripIdParam>,
    res: TypedResponse<{ message: string }>,
    next: NextFunction
  ) => {
    try {
      await clearRecommendedPlaces(req.params.tripId);
      res.status(200).json({ message: "Cleared" });
      return;
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /ai/recommended-places/:id/added
router.patch(
  "/ai/recommended-places/:id/added",
  ensureLoggedIn,
  async (
    req: TypedRequest<{ added?: boolean }, unknown, { id: string }>,
    res: TypedResponse<{ message: string }>,
    next: NextFunction
  ) => {
    try {
      const added = req.body?.added ?? true;
      await markPlaceAdded(req.params.id, added);
      res.status(200).json({ message: added ? "Marked as added" : "Unmarked" });
      return;
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /ai/mark-added-by-name/:tripId
router.patch(
  "/ai/mark-added-by-name/:tripId",
  ensureLoggedIn,
  async (
    req: TypedRequest<{ placeName: string }, unknown, TripIdParam>,
    res: TypedResponse<{ message: string }>,
    next: NextFunction
  ) => {
    try {
      const { placeName } = req.body;
      if (!placeName) {
        res.status(400).json({ message: "placeName is required" });
        return;
      }
      await markPlaceAddedByName(req.params.tripId, placeName);
      res.status(200).json({ message: "Marked as added" });
      return;
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────
// List Places
// ──────────────────────────────────────────────

// GET /ai/list-places/:tripId
router.get(
  "/ai/list-places/:tripId",
  ensureLoggedIn,
  async (
    req: TypedRequest<unknown, unknown, TripIdParam>,
    res: TypedResponse<{ places: AiListPlace[] }>,
    next: NextFunction
  ) => {
    try {
      const places = await getListPlaces(req.params.tripId);
      res.status(200).json({ places });
      return;
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /ai/list-places/:tripId
router.delete(
  "/ai/list-places/:tripId",
  ensureLoggedIn,
  async (
    req: TypedRequest<unknown, unknown, TripIdParam>,
    res: TypedResponse<{ message: string }>,
    next: NextFunction
  ) => {
    try {
      await clearListPlaces(req.params.tripId);
      res.status(200).json({ message: "Cleared" });
      return;
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /ai/list-places/:id/added
router.patch(
  "/ai/list-places/:id/added",
  ensureLoggedIn,
  async (
    req: TypedRequest<{ added?: boolean }, unknown, { id: string }>,
    res: TypedResponse<{ message: string }>,
    next: NextFunction
  ) => {
    try {
      const added = req.body?.added ?? true;
      await markListPlaceAdded(req.params.id, added);
      res.status(200).json({ message: added ? "Marked as added" : "Unmarked" });
      return;
    } catch (err) {
      next(err);
    }
  }
);

export default router;
