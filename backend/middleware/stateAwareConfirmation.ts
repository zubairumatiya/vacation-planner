import { NextFunction } from "express";
import db from "../db/db.js";
import { snakeToCamel } from "../helpers/snakeToCamel.js";
import { TypedRequest, TypedResponse, Schedule, TripList, ScheduleResponse, StateAwareBody, CamelCaseRow } from "../types/express.js";
import { QueryResult } from "pg";

export default async function stateAwareConfirmation(
  req: TypedRequest<StateAwareBody>,
  res: TypedResponse<ScheduleResponse>,
  next: NextFunction
): Promise<void> {
  const path: string = req.path;
  try {
    let queryText = "";
    if (
      /^\/schedule\/[^/]+$/.test(path) ||
      /^\/update-time\/[^/]+$/.test(path)
    ) {
      queryText = "SELECT * FROM trip_schedule WHERE id=$1";
    } else if (/^\/list\/[^/]+$/.test(path)) {
      queryText = "SELECT * FROM trip_list WHERE id=$1";
    }
    
    if (!queryText) {
      next();
      return;
    }

    const result: QueryResult<Schedule | TripList> = await db.query(queryText, [req.params.id]);
    if (!result) {
      res.status(500).json({ message: "Server Error" });
      return;
    }
    if (result.rowCount !== null && result.rowCount < 1 && req.method === "DELETE") {
      res.status(404).json({ deletedId: req.params.id, queryComplete: "true" });
      return;
    }
    
    snakeToCamel(result.rows);
    const row = result.rows[0] as unknown as CamelCaseRow | undefined;

    if (
      (result.rowCount !== null && result.rowCount < 1) ||
      (row && req.body.lastModified !== new Date(row.lastModified as string | Date).toISOString())
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
      const tripId = row?.tripId ?? req.body.tripId;
      const refreshData: QueryResult<Schedule | TripList> = await db.query(queryText, [tripId]);
      snakeToCamel(refreshData.rows);
      res
        .status(409)
        .json({ message: "Conflict detected", newData: refreshData.rows as Schedule[] | TripList[] });
      return;
    } else {
      next();
    }
  } catch (err) {
    next(err);
  }
}
