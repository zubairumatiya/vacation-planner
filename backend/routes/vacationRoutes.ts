import express from "express";
const router = express.Router();
import db from "../db/db.js";

type Event = {
  id: number;
  trip_name: string;
  start_date: string;
  end_date: string;
  location: string;
};

router.get("/home", async (req, res, next) => {
  try {
    const results: { rows: Event[] } = await db.query("SELECT * FROM trips");
    res.status(200).json(results.rows);
    return;
  } catch (err) {
    next(err);
  }
});

router.post("/add-vacation", async (req, res, next) => {
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
    await db.query(
      "INSERT INTO trips (trip_name, location, start_date, end_date) VALUES ($1, $2, $3, $4)",
      [
        req.body.tripname,
        req.body.location,
        req.body.startDate,
        req.body.endDate,
      ]
    );
    res.status(200).json({ message: "success" });
    return;
  } catch (err) {
    next(err);
  }
});

export default router;
