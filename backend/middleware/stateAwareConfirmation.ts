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
    if (path === "/schedule/:id" || path === "/update-time/:id") {
      queryText = "SELECT * FROM trip_schedule WHERE id=$1";
    } else if (path === "/list/:itemId") {
      queryText = "SELECT * FROM trip_list WHERE id=$1";
    }
    const result = await db.query(queryText, [req.params.id]);
    if (!result) {
      console.log("Server Error");
      res.status(500).json({ message: "Server Error" });
      return;
    }
    if (result.rowCount < 1 && req.method === "DELETE") {
      // item has most likely been deleted already which is a conflict and should be in the statement below as well, only in DELETE does is it ok it's missing
      console.log("Item not found");
      res.status(404).json({ deletedId: req.params.id, queryComplete: "true" });
      return;
    }
    snakeToCamel(result.rows);
    if (
      req.body.lastModified !== result.rows?.[0]?.lastModified ||
      result.rowCount < 1
    ) {
      console.log("Conflict detected");
      if (path === "/schedule/:id" || path === "/update-time/:id") {
        queryText =
          "SELECT * FROM trip_schedule WHERE trip_id=$1 ORDER BY start_time ASC, sort_index ASC";
      } else if (path === "/list/:itemId") {
        queryText =
          "SELECT id, value, from_google, item_added FROM trip_list WHERE trip_id=$1 ORDER BY created_at ASC";
      }
      const refreshData = await db.query(queryText, [result.rows[0].tripId]);
      snakeToCamel(refreshData.rows);
      res
        .status(409)
        .json({ message: "Conflict detected", newData: refreshData.rows });
      return;
    } else if (req.body.lastModified === result.rows[0].lastModified) {
      next();
    }
  } catch (err) {
    next(err);
  }
}
