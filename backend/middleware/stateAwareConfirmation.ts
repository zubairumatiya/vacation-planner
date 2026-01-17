import { Request, Response, NextFunction } from "express";
import db from "../db/db.js";
import { snakeToCamel } from "../helpers/snakeToCamel.js";

export default async function stateAwareConfirmation(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const path: string = req.path;
  try {
    let queryText: string;
    if (
      /^\/schedule\/[^/]+$/.test(path) ||
      /^\/update-time\/[^/]+$/.test(path)
    ) {
      queryText = "SELECT * FROM trip_schedule WHERE id=$1";
    } else if (/^\/list\/[^/]+$/.test(path)) {
      queryText = "SELECT * FROM trip_list WHERE id=$1";
    }
    const result = await db.query(queryText, [req.params.id]);
    if (!result) {
      res.status(500).json({ message: "Server Error" });
      return;
    }
    if (result.rowCount < 1 && req.method === "DELETE") {
      // item has most likely been deleted already which is a conflict and should be in the statement below as well, only in DELETE does is it ok it's missing

      res.status(404).json({ deletedId: req.params.id, queryComplete: "true" });
      return;
    }
    snakeToCamel(result.rows);
    if (
      req.body.lastModified !== result.rows?.[0]?.lastModified.toISOString() ||
      result.rowCount < 1
    ) {
      if (
        /^\/schedule\/[^/]+$/.test(path) ||
        /^\/update-time\/[^/]+$/.test(path)
      ) {
        queryText =
          "SELECT * FROM trip_schedule WHERE trip_id=$1 ORDER BY start_time ASC, sort_index ASC";
      } else if (/^\/list\/[^/]+$/.test(path)) {
        queryText =
          "SELECT id, value, from_google, item_added FROM trip_list WHERE trip_id=$1 ORDER BY created_at ASC";
      }
      const refreshData = await db.query(queryText, [
        result.rows[0]?.tripId ?? req.body.tripId,
      ]);
      snakeToCamel(refreshData.rows);
      res
        .status(409)
        .json({ message: "Conflict detected", newData: refreshData.rows });
      return;
    } else if (
      req.body.lastModified === result.rows[0].lastModified.toISOString()
    ) {
      next();
    }
  } catch (err) {
    next(err);
  }
}
