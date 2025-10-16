import express from "express";
const router = express.Router();
import db from "../db/db.js";
import ensureLoggedIn from "../middleware/ensureLoggedIn.js";
import dotenv from "dotenv";

dotenv.config();
const API_KEY = process.env.MAPS_API_KEY;

router.get("/home", ensureLoggedIn, async (req, res, next) => {
  try {
    const results = await db.query(
      "SELECT trip_id FROM user_trips WHERE user_id=$1",
      [req.user.id]
    );
    const ids: Array<number> = results.rows.map((row) => row.trip_id); // make an array of id's instead of an array of objects
    const results2 = await db.query(
      "SELECT * FROM trips WHERE id = ANY($1::int[])", // query an array, matching if ANY id in the array matches
      [ids]
    );
    res.status(200).json(results2.rows);
    return;
  } catch (err) {
    next(err);
  }
});

router.post("/add-vacation", ensureLoggedIn, async (req, res, next) => {
  if (
    !req.body.tripname ||
    !req.body.location ||
    !req.body.startDate ||
    !req.body.endDate
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
      "INSERT INTO user_trips (user_id, trip_id, role) VALUES ($1, $2, 'owner')",
      [req.user.id, results.rows[0].id]
    );
    res.status(200).json({ message: "success" });
    return;
  } catch (err) {
    next(err);
  }
});

router.patch("/add-vacation/:id", ensureLoggedIn, async (req, res, next) => {
  if (
    !req.body.tripname ||
    !req.body.location ||
    !req.body.startDate ||
    !req.body.endDate
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
    const result = await db.query(
      "UPDATE trips SET trip_name=$1, start_date=$2, end_date=$3, location=$4, last_modified=NOW() WHERE id=$5 RETURNING *",
      [
        req.body.tripname,
        req.body.startDate,
        req.body.endDate,
        req.body.location,
        req.params.id,
      ]
    );
    if (result.rowCount > 0) {
      res.status(200).json({ message: "success" });
      return;
    }
  } catch (err) {
    next(err);
  }
});

router.delete(
  "/delete-vacation/:id",
  ensureLoggedIn,
  async (req, res, next) => {
    console.log("ENTERRR");
    try {
      const result = await db.query(
        "DELETE FROM trips WHERE id=$1 RETURNING *",
        [req.params.id]
      );
      if (result.rowCount > 0) {
        res.status(200).json({ message: "success" });
        return;
      }
    } catch (err) {
      next(err);
    }
  }
);

router.get("/vacation/:id", ensureLoggedIn, async (req, res, next) => {
  try {
    const result = await db.query(
      "SELECT * FROM user_trips WHERE user_id=$1 AND trip_id=$2",
      [req.user.id, req.params.id]
    );
    if (result.rowCount < 1) {
      console.log("~~~~LOG~~~~~ this trip is not assigned to this user");
      res.sendStatus(404);
      return;
    }
    const role = result.rows[0].role;
    const result2 = await db.query("SELECT * FROM trips WHERE id=$1", [
      req.params.id,
    ]);
    if (result2.rowCount < 1) {
      console.log("~~~~LOG~~~~~ could not find trip info");
      res.sendStatus(404);
      return;
    }
    const startDate = result2.rows[0].start_date;
    const endDate = result2.rows[0].end_date;
    const tripName = result2.rows[0].trip_name;
    console.log("~~~~~~~~~~~~~~~~~~~", req.params.id);
    const result3 = await db.query(
      "SELECT * FROM trip_schedule WHERE trip_id=$1",
      [req.params.id]
    );
    const arrCargo = result3.rowCount > 0 ? result3.rows : [];
    res
      .status(200)
      .json({ role, tripName, startDate, endDate, schedule: arrCargo });
    return;
  } catch (err) {
    next(err);
  }
});

router.post("/vacation/:id", ensureLoggedIn, async (req, res, next) => {
  try {
    const match = await db.query(
      "SELECT * FROM user_trips WHERE user_id=$1 AND trip_id=$2 AND (role=$3 OR role=$4)",
      [req.user.id, req.params.id, "owner", "editor"]
    );
    if (match.rowCount < 1) {
      res.sendStatus(403);
      return;
    }
    const result = await db.query(
      "INSERT INTO trip_schedule (trip_id,start_time, end_time, location, cost, details, multi_day) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [
        match.rows[0].trip_id,
        req.body.start,
        req.body.end,
        req.body.location,
        req.body.cost,
        req.body.details,
        req.body.multiDay,
      ]
    );
    res.status(200).json({ addedItem: result.rows[0] });
    return;
  } catch (err) {
    next(err);
  }
});

router.patch("/schedule/:id", ensureLoggedIn, async (req, res, next) => {
  try {
    const result = await db.query(
      "UPDATE trip_schedule SET location=$1, details=$2, start_time=$3, end_time=$4, cost=$5, multi_day=$6 WHERE id=$7 RETURNING *",
      [
        req.body.location,
        req.body.details,
        req.body.start,
        req.body.end,
        req.body.cost,
        req.body.multiDay,
        req.params.id,
      ]
    );
    if (result.rowCount > 0) {
      res.status(200).json({ updatedData: result.rows[0] });
      return;
    }
    // will have to update last-modified field in trips as well
  } catch (err) {
    next(err);
  }
});

router.patch("/update-time/:id", ensureLoggedIn, async (req, res, next) => {
  try {
    const result = await db.query(
      "UPDATE trip_schedule SET start_time=$1, end_time=$2 WHERE id=$3 RETURNING *",
      [req.body.start, req.body.end, req.params.id]
    );
    if (result.rowCount > 0) {
      res.status(200).json({ updatedData: result.rows[0] });
      return;
    }
  } catch (err) {
    next(err);
  }
});

router.delete("/schedule/:id", ensureLoggedIn, async (req, res, next) => {
  try {
    const result = await db.query(
      "DELETE FROM trip_schedule WHERE id=$1 RETURNING *",
      [req.params.id]
    );
    if (result.rowCount > 0) {
      res.status(200).json({ deletedData: result.rows[0] });
      return;
    }
  } catch (err) {
    next(err);
  }
});

router.get("/list/:tripId", ensureLoggedIn, async (req, res, next) => {
  try {
    const result = await db.query(
      "SELECT id, value FROM trip_list WHERE trip_id=$1",
      [req.params.tripId]
    );
    res.status(200).json({ data: result.rows });
    return;
  } catch (err) {
    next(err);
  }
});

router.post("/list/:tripId", ensureLoggedIn, async (req, res, next) => {
  try {
    const result = await db.query(
      "INSERT INTO trip_list (trip_id, value) VALUES ($1, $2) RETURNING id, value",
      [req.params.tripId, req.body.value]
    );
    res.status(200).json({ data: result.rows[0] });
    return;
  } catch (err) {
    next(err);
  }
});

router.patch("/list/:itemId", ensureLoggedIn, async (req, res, next) => {
  try {
    const result = await db.query(
      "UPDATE trip_list SET value=$1 WHERE id=$2 RETURNING *",
      [req.body.value, req.params.itemId]
    );
    res.status(200).json({ data: result.rows });
    return;
  } catch (err) {
    next(err);
  }
});

router.delete("/list/:itemId", ensureLoggedIn, async (req, res, next) => {
  try {
    const result = await db.query(
      "DELETE FROM trip_list WHERE id=$1 RETURNING *",
      [req.params.itemId]
    );
    res.status(200).json({ deletedData: result.rows });
    return;
  } catch (err) {
    next(err);
  }
});

router.get("/map", async (req, res, next) => {
  try {
    const query = "coffee in Austin";

    const result = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": `${API_KEY}`,
          "X-Goog-FieldMask": "places.id,nextPageToken,places.name",
          //"places.displayName,places.rating,places.userRatingCount,places.location,nextPageToken",
        },
        body: JSON.stringify({
          textQuery: `${query}`,
          pageSize: 3,
        }),
      }
    );
    if (!result.ok) throw new Error(`HTTP error! status: ${result.status}`);
    const data = await result.json();
    res.status(200).json(data);
    return;
  } catch (err) {
    next(err);
  }
});

export default router;
