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
    if (!result || result.rowCount < 1) {
      console.log("invalid query");
      res.status(404).json({ message: "Could not locate item" });
      return;
    }
    snakeToCamel(result.rows);
    if (req.body.lastModified !== result.rows[0].lastModified) {
      console.log("conflict detected");
      const refreshData = await db.query(
        "SELECT * FROM trip_schedule WHERE trip_id=$1 ORDER BY start_time ASC, sort_index ASC",
        [result.rows[0].tripId]
      );
      snakeToCamel(refreshData.rows);
      res
        .status(409)
        .json({ message: "Conflict detected", newData: refreshData.rows });
    } else if (req.body.lastModified === result.rows[0].lastModified) {
      next();
    }
  } catch (err) {
    next(err);
  }
}
