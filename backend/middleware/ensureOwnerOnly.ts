import db from "../db/db.js";
import { NextFunction } from "express";
import { TypedRequest, TypedResponse, MessageResponse, OwnershipBody } from "../types/express.js";
import { QueryResult } from "pg";

export default async function ensureOwnerOnly(
  req: TypedRequest<OwnershipBody>,
  res: TypedResponse<MessageResponse>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(500).json({ message: "User information not found" });
      return;
    }
    const tripId = req.params.tripId ?? req.body.tripId;

    if (tripId == null) {
      res.sendStatus(404);
      return;
    }
    const result: QueryResult<{ role: string }> = await db.query(
      "SELECT role FROM user_trips WHERE trip_id=$1 AND user_id=$2 AND role='owner'",
      [tripId, req.user.id]
    );
    if (!result || result.rowCount === null || result.rowCount < 1) {
      res.sendStatus(403);
      return;
    } else {
      req.user.role = result.rows[0].role;
      next();
    }
  } catch (err) {
    next(err);
    return;
  }
}
