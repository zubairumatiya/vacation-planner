import db from "../db/db.js";
import { Request, Response, NextFunction } from "express";

export default async function ensureOwnership(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) {
      res.status(500).json({ message: "User information not found" });
      return;
    }
    console.log(req.body?.skipEO);
    if (req.body?.skipEO) {
      next();
      return;
    }
    const tripId = req.params.tripId ?? req.body.tripId;

    if (tripId == null) {
      res.sendStatus(404);
      return;
    }
    const result = await db.query(
      "SELECT * FROM user_trips WHERE trip_id=$1 AND user_id=$2 AND (role=$3 OR role=$4)",
      [tripId, req.user.id, "owner", "editor"]
    );
    if (!result || result.rowCount < 1) {
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
