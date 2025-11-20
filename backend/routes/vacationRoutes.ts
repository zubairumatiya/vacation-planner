import express from "express";
const router = express.Router();
import db from "../db/db.js";
import ensureLoggedIn from "../middleware/ensureLoggedIn.js";
import dotenv from "dotenv";
import { snakeToCamel } from "../helpers/snakeToCamel.js";

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

router.get("/add-vacation/:tripId", ensureLoggedIn, async (req, res, next) => {
  try {
    const confirmUser = await db.query(
      "SELECT * FROM user_trips WHERE user_id=$1 AND trip_id=$2 AND (role=$3 OR role=$4)",
      [req.user.id, req.params.tripId, "owner", "editor"]
    );
    if (confirmUser.rowCount < 1) {
      res.sendStatus(404);
      return;
    }
    const results = await db.query("SELECT * FROM trips WHERE id=$1", [
      req.params.tripId,
    ]);
    if (results.rowCount < 1) {
      res.sendStatus(404);
      return;
    } else {
      res.status(200).json({
        gId: results.rows[0].g_id,
        gLocation: results.rows[0].location,
        gVp: results.rows[0].g_vp,
      });
      return;
    }
  } catch (err) {
    next(err);
  }
});

router.post("/add-vacation", ensureLoggedIn, async (req, res, next) => {
  if (
    !req.body.tripname ||
    !req.body.location ||
    !req.body.startDate ||
    !req.body.endDate ||
    !req.body.gId ||
    !req.body.gVp
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
      "INSERT INTO trips (trip_name, location, start_date, end_date, g_id, g_vp) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [
        req.body.tripname,
        req.body.location,
        req.body.startDate,
        req.body.endDate,
        req.body.gId,
        req.body.gVp,
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
    !req.body.endDate ||
    !req.body.gId ||
    !req.body.gVp
  ) {
    res
      .status(403)
      .json({ message: "Invalid input - make sure all the fields are filled" });
    return;
  }
  const confirmUser = await db.query(
    "SELECT * FROM user_trips WHERE user_id=$1 AND trip_id=$2 AND (role=$3 OR role=$4)",
    [req.user.id, req.params.id, "owner", "editor"]
  );
  if (confirmUser.rowCount < 1) {
    res.sendStatus(404);
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
      "UPDATE trips SET trip_name=$1, start_date=$2, end_date=$3, location=$4, g_id=$5, g_vp=$6, last_modified=NOW() WHERE id=$7 RETURNING *",
      [
        req.body.tripname,
        req.body.startDate,
        req.body.endDate,
        req.body.location,
        req.body.gId,
        req.body.gVp,
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
    try {
      const confirmUser = await db.query(
        "SELECT * FROM user_trips WHERE user_id=$1 AND trip_id=$2 AND (role=$3 OR role=$4)",
        [req.user.id, req.params.id, "owner", "editor"]
      );
      if (confirmUser.rowCount < 1) {
        res.sendStatus(404);
        return;
      }
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

router.get("/schedule/:id", ensureLoggedIn, async (req, res, next) => {
  try {
    const result = await db.query(
      "SELECT * FROM user_trips WHERE user_id=$1 AND trip_id=$2 AND (role=$3 OR role=$4)",
      [req.user.id, req.params.id, "owner", "editor"]
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
    snakeToCamel(result2.rows);
    console.log("~~~~~~~~~~~~~~~~~~~", req.params.id);
    const result3 = await db.query(
      "SELECT * FROM trip_schedule WHERE trip_id=$1",
      [req.params.id]
    );
    if (result3.rowCount > 0) {
      snakeToCamel(result3.rows);
    }
    const arrCargo = result3.rowCount > 0 ? result3.rows : [];

    res.status(200).json({
      role,
      ...result2.rows[0],
      schedule: arrCargo,
    });
    return;
  } catch (err) {
    next(err);
  }
});

router.post("/schedule/:id", ensureLoggedIn, async (req, res, next) => {
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
      "INSERT INTO trip_schedule (trip_id, start_time, end_time, location, cost, details, multi_day) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
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
    if (result.rowCount > 0) {
      snakeToCamel(result.rows);
      res.status(200).json({ addedItem: result.rows[0] });
      return;
    }
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
      snakeToCamel(result.rows);
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
      snakeToCamel(result.rows);
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
      snakeToCamel(result.rows);
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
      "SELECT id, value, from_google, item_added FROM trip_list WHERE trip_id=$1 ORDER BY created_at ASC",
      [req.params.tripId]
    );
    snakeToCamel(result.rows);
    res.status(200).json({ data: result.rows });
    return;
  } catch (err) {
    next(err);
  }
});

router.post("/list/:tripId", ensureLoggedIn, async (req, res, next) => {
  try {
    let queryText: string;
    let queryParams: string[];
    if (req.body.id) {
      queryText =
        "INSERT INTO trip_list (trip_id, value, id, from_google) VALUES ($1, $2, $3, true) RETURNING id, value, from_google";
      queryParams = [req.params.tripId, req.body.value, req.body.id];
    } else {
      queryText =
        "INSERT INTO trip_list (trip_id, value) VALUES ($1, $2) RETURNING id, value, from_google";
      queryParams = [req.params.tripId, req.body.value];
    }
    const result = await db.query(queryText, queryParams);
    snakeToCamel(result.rows);
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
    snakeToCamel(result.rows);
    res.status(200).json({ data: result.rows });
    return;
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/check-list-item/:itemId",
  ensureLoggedIn,
  async (req, res, next) => {
    try {
      const result = await db.query(
        "UPDATE trip_list SET item_added=$1 WHERE id=$2 RETURNING *",
        [req.body.newValue, req.params.itemId]
      );
      snakeToCamel(result.rows);
      res.status(200).json({ data: result.rows });
      return;
    } catch (err) {
      next(err);
    }
  }
);

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

router.post("/map", async (req, res, next) => {
  let countOfPlaces = 0;
  const gatherPlaces = [];
  let holdToken =
    req.body.nextPageToken === undefined ? "" : req.body.nextPageToken;
  console.log(req.body.locationName);
  console.log(req.body.placeType);
  try {
    if (req.body.nextPageToken === undefined) {
      res.sendStatus(406);
      return;
    }
    const query = `${req.body.placeType}s near ${req.body.locationName}`;
    while (countOfPlaces < 20 && holdToken !== undefined) {
      //why not just to length of gather places instead of tracking count?
      const result = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": `${API_KEY}`,
            "X-Goog-FieldMask": "places.id,nextPageToken",
            //"places.id,nextPageToken,places.displayName,places.location,places.shortFormattedAddress,places.primaryType"
            //"places.id,nextPageToken,places.displayName,places.location,places.shortFormattedAddress,places.primaryType,places.rating,places.userRatingCount"
          },
          body: JSON.stringify({
            textQuery: `${query}`,
            pageToken: holdToken,
            minRating: req.body.ratingFilter,
            pageSize: 20,
            includedType: `${req.body.placeType}`,
            strictTypeFiltering: true,
            locationRestriction: { rectangle: req.body.viewport },
          }),
        }
      );
      if (!result.ok) throw new Error(`HTTP error! status: ${result.status}`);
      const data: TextSearchResponse = await result.json();
      // if(req.body.placeType){ //should always have this but lets check just in case
      // data.places = data.places.filter((v:Place)=>v.primaryType === req.body.placeType) // will have to make sure i am typing the types in as they have them on places, museum vs museums
      // }else{
      //   throw new Error(`REQUEST ERROR: INVALID PLACETYPE`)
      // }
      if (req.body.reviewFilter) {
        data.places.forEach((v: Place) => {
          if (v.userRatingCount >= req.body.reviewFilter) {
            countOfPlaces++;
            gatherPlaces.push(v);
          }
        });
      } else {
        countOfPlaces += data.places.length;
        gatherPlaces.push(...data.places);
      }
      holdToken = data.nextPageToken;
    }
    console.log("array length:", gatherPlaces.length);
    console.log("count", countOfPlaces);

    console.log("holdToken", typeof holdToken);
    res.status(200).json({ places: gatherPlaces, nextPageToken: holdToken });
    return;
  } catch (err) {
    next(err);
  }
});

router.post("/autocomplete", async (req, res, next) => {
  const query = req.body.query;
  try {
    const result = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": `${API_KEY}`,
          "X-Goog-FieldMask": "suggestions.placePrediction",
        },
        body: JSON.stringify({
          input: `${query}`,
          includedPrimaryTypes: ["locality", "country", "political"], // will suggest cities, countries, political boundaries, etc, instead of places of business
        }),
      }
    );
    if (!result.ok) throw new Error(`HTTP error! status: ${result.status}`);
    const data = await result.json();
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/details/:itemId", async (req, res, next) => {
  try {
    if (!req.params.itemId) {
      throw new Error("Error finishing req");
    }
    const result = await fetch(
      `https://places.googleapis.com/v1/places/${req.params.itemId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": `${API_KEY}`,
          "X-Goog-FieldMask": "viewport",
        },
      }
    );
    if (!result.ok) throw new Error(`HTTP error! status: ${result.status}`);
    const data = await result.json();
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});

/*
router.post("/map", async (req, res, next) => {
  try {
    res.status(200).json(storedData);
    return;
  } catch (err) {
    next(err);
  }
});
*/
export default router;
