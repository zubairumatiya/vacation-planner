import express from "express";
const router = express.Router();
import db from "../db/db.js";
import ensureLoggedIn from "../middleware/ensureLoggedIn.js";

router.get("/home", ensureLoggedIn, async (req, res, next) => {
  try {
    const results = await db.query(
      "SELECT trip_id FROM user_trips WHERE user_id=$1",
      [req.user.id]
    );
    const ids: Array<number> = results.rows.map((row) => row.trip_id); // make an array of id's instead of an array of objects
    const results2 = await db.query(
      "SELECT * FROM trips WHERE id = ANY($1::int[])", // query an array, matching if ANY id in the array matches
      ids
    );
    res.status(200).json(results2.rows);
    return;
  } catch (err) {
    next(err);
  }
});

router.post("/add-vacation", ensureLoggedIn, async (req, res, next) => {
  if (
    req.body.tripname ||
    req.body.location ||
    req.body.startDate ||
    req.body.endDate
  ) {
    res
      .status(403)
      .json({ message: "Invalid input - make sure all the fields are filled" });
    return;
  }
  const startDate = new Date(req.body.startDate);
  const endDate = new Date(req.body.endDate);

  if (startDate > endDate) {
    res
      .status(403)
      .json({ message: "Invalid date - End date cannot be before start date" });
    return;
  }

  try {
    const results = await db.query(
      "INSERT INTO trips (trip_name, location, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING id",
      [
        req.body.tripname,
        req.body.location,
        req.body.startDate,
        req.body.endDate,
      ]
    );
    await db.query(
      "INSERT INTO user_trips (user_id, trip_id, owner) VALUES ($1, $2, TRUE)",
      [req.user.id, results.rows[0].id]
    );
    res.status(200).json({ message: "success" });
    return;
  } catch (err) {
    next(err);
  }
});

export default router;
