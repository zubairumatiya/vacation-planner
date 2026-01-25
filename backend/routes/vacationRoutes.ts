import express from "express";
const router = express.Router();
import db from "../db/db.js";
import ensureLoggedIn from "../middleware/ensureLoggedIn.js";
import dotenv from "dotenv";
import { snakeToCamel } from "../helpers/snakeToCamel.js";
import { QueryResult } from "pg";
import checkIndexSpacing from "../helpers/checkIndexSpacing.js";
import ensureOwnership from "../middleware/ensureOwnership.js";
import renumberIndexDb from "../helpers/renumberIndexDb.js";
import { Schedule } from "../types/express.js";
import stateAwareConfirmation from "../middleware/stateAwareConfirmation.js";

dotenv.config();
const API_KEY = process.env.MAPS_API_KEY;

router.get("/home", ensureLoggedIn, async (req, res, next) => {
  try {
    const results = await db.query(
      "SELECT trip_id FROM user_trips WHERE user_id=$1",
      [req.user.id]
    );
    const ids: Array<string> = results.rows.map((row) => row.trip_id); // make an array of id's instead of an array of objects
    const results2 = await db.query(
      "SELECT * FROM trips WHERE id = ANY($1::uuid[])", // query an array, matching if ANY id in the array matches
      [ids]
    );
    res.status(200).json(results2.rows);
    return;
  } catch (err) {
    next(err);
  }
});

router.get(
  "/add-vacation/:tripId",
  ensureLoggedIn,
  ensureOwnership,
  async (req, res, next) => {
    try {
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
  }
);

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
      .status(400)
      .json({ message: "Invalid input - make sure all the fields are filled" });
    return;
  }
  const startDate = new Date(req.body.startDate);
  const endDate = new Date(req.body.endDate);

  if (startDate > endDate) {
    res
      .status(400)
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

router.patch(
  "/add-vacation/:tripId",
  ensureLoggedIn,
  ensureOwnership,
  async (req, res, next) => {
    if (
      !req.body.tripname ||
      !req.body.location ||
      !req.body.startDate ||
      !req.body.endDate ||
      !req.body.gId ||
      !req.body.gVp
    ) {
      res.sendStatus(400);
      return;
    }
    const startDate = new Date(req.body.startDate);
    const endDate = new Date(req.body.endDate);

    if (startDate > endDate) {
      res.sendStatus(400);
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
          req.params.tripId,
        ]
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

router.delete(
  "/delete-vacation/:tripId",
  ensureLoggedIn,
  ensureOwnership,
  async (req, res, next) => {
    try {
      const result = await db.query(
        "DELETE FROM trips WHERE id=$1 RETURNING *",
        [req.params.tripId]
      );
      if (result.rowCount > 0) {
        res.status(200).json({ message: "success" });
        return;
      }
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
);

router.get(
  "/schedule/:tripId",
  ensureLoggedIn,
  ensureOwnership,
  async (req, res, next) => {
    try {
      const role = req.user.role;
      const result2 = await db.query("SELECT * FROM trips WHERE id=$1", [
        req.params.tripId,
      ]);
      if (result2.rowCount < 1) {
        console.log("~~~~LOG~~~~~ could not find trip info");
        res.sendStatus(404);
        return;
      }
      snakeToCamel(result2.rows);
      console.log("~~~~~~~~~~~~~~~~~~~", req.params.tripId);
      const result3 = await db.query(
        "SELECT * FROM trip_schedule WHERE trip_id=$1 ORDER BY start_time ASC, sort_index ASC",
        [req.params.tripId]
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
  }
);

router.post(
  "/schedule/:tripId",
  ensureLoggedIn,
  ensureOwnership,
  async (req, res, next) => {
    const client = await db.connect();

    try {
      await client.query("BEGIN");
      const newSortIndex = await checkIndexSpacing(
        req.body,
        client,
        req.params.tripId
      );
      req.body.cost =
        isNaN(Number(req.body.cost)) || req.body.cost === ""
          ? 0
          : req.body.cost;
      console.log(req.body.cost);
      let values: (string | number | Date | boolean)[];
      let queryText: string =
        "INSERT INTO trip_schedule (trip_id, start_time, end_time, location, cost, details, multi_day, sort_index) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *";
      req.body.multiDay = req.body.multiDay ?? false;
      if (newSortIndex === undefined) {
        // insert item, call renumbering fn, call db to get item and add to response obj
        const placeHolderIndex = req.body.chunk.above?.sortIndex + 1;
        values = [
          req.params.tripId,
          req.body.start,
          req.body.end,
          req.body.location,
          req.body.cost,
          req.body.details,
          req.body.multiDay,
          placeHolderIndex,
        ];
        if (req.body.id) {
          queryText =
            "INSERT INTO trip_schedule (id, trip_id, start_time, end_time, location, cost, details, multi_day, sort_index) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *";
          values = [
            req.body.id,
            req.params.tripId,
            req.body.start,
            req.body.end,
            req.body.location,
            req.body.cost,
            req.body.details,
            req.body.multiDay,
            placeHolderIndex,
          ];
        }
      } else {
        // add sort index to insert query and add to response obj
        values = [
          req.params.tripId,
          req.body.start,
          req.body.end,
          req.body.location,
          req.body.cost,
          req.body.details,
          req.body.multiDay,
          newSortIndex,
        ];
        if (req.body.id) {
          queryText =
            "INSERT INTO trip_schedule (id, trip_id, start_time, end_time, location, cost, details, multi_day, sort_index) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *";
          values = [
            req.body.id,
            req.params.tripId,
            req.body.start,
            req.body.end,
            req.body.location,
            req.body.cost,
            req.body.details,
            req.body.multiDay,
            newSortIndex,
          ];
        }
      }
      const result = await client.query<Schedule>(queryText, values);

      if (result.rowCount > 0) {
        if (newSortIndex === undefined) {
          const renumRows = await renumberIndexDb(req.params.tripId, client);
          if (renumRows.length < 1) {
            console.log("renumbering error");
            await client.query("ROLLBACK");
            res.status(500).json({ message: "Internal server error" });
            return;
          }
          snakeToCamel(renumRows);
          await client.query("COMMIT");
          res.status(200).json({ newlyIndexedSchedule: renumRows });
          return;
        }
        const rowToReturn: QueryResult<Schedule> = await client.query(
          "SELECT * FROM trip_schedule WHERE id=$1",
          [result.rows[0].id]
        );
        snakeToCamel(rowToReturn.rows);
        await client.query("COMMIT");
        res.status(200).json({ addedItem: rowToReturn.rows[0] });
        return;
      } else {
        await client.query("ROLLBACK");
        console.log("rolling this way");
        res.sendStatus(500);
        return;
      }
    } catch (err) {
      console.log(err);
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  }
);

router.patch(
  "/schedule/:id",
  ensureLoggedIn,
  ensureOwnership,
  stateAwareConfirmation,
  async (req, res, next) => {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const newSortIndex = await checkIndexSpacing(
        req.body,
        client,
        undefined,
        undefined,
        req.params.id
      );
      if (newSortIndex === undefined) {
        console.log("Renumbering error");
        await client.query("ROLLBACK");
        res.sendStatus(500);
        return;
      }
      let query: string;
      let values: Array<string | number | object | boolean>;
      if (typeof newSortIndex === "object") {
        query =
          "UPDATE trip_schedule SET location=$1, details=$2, start_time=$3, end_time=$4, cost=$5, multi_day=$6, last_modified=NOW() WHERE id=$7 RETURNING *";
        values = [
          req.body.location,
          req.body.details,
          req.body.start,
          req.body.end,
          req.body.cost,
          req.body.multiDay,
          req.params.id,
        ];
      } else {
        query =
          "UPDATE trip_schedule SET location=$1, details=$2, start_time=$3, end_time=$4, cost=$5, multi_day=$6, sort_index=$7, last_modified=NOW() WHERE id=$8 RETURNING *";
        values = [
          req.body.location,
          req.body.details,
          req.body.start,
          req.body.end,
          req.body.cost,
          req.body.multiDay,
          newSortIndex,
          req.params.id,
        ];
      }
      const result = await client.query(query, values);
      if (result.rowCount > 0) {
        await client.query("COMMIT");
        if (typeof newSortIndex === "object") {
          const newlyIndexedSchedule = newSortIndex.map((v) =>
            v.id === result.rows[0].id ? result.rows[0] : v
          );
          snakeToCamel(newlyIndexedSchedule);
          res.status(200).json({ newlyIndexedSchedule });
        } else {
          snakeToCamel(result.rows);
          res.status(200).json({ updatedData: result.rows[0] });
          return;
        }
      } else {
        await client.query("ROLLBACK");
        res.sendStatus(500);
        return;
      }
      // will have to update last-modified field in trips as well
    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }
  }
);

router.patch(
  "/update-time/:id",
  ensureLoggedIn,
  ensureOwnership,
  stateAwareConfirmation,
  async (req, res, next) => {
    const client = await db.connect();
    try {
      client.query("BEGIN");
      const newSortIndex = await checkIndexSpacing(
        req.body,
        client,
        undefined,
        undefined,
        req.params.id
      );
      if (newSortIndex === undefined) {
        console.log("Renumbering error");
        await client.query("ROLLBACK");
        res.sendStatus(500);
        return;
      }
      let query: string;
      let values: Array<string | number | object | boolean>;
      console.log("newSortIndex in update-time", newSortIndex);
      if (typeof newSortIndex === "object") {
        query =
          "UPDATE trip_schedule SET start_time=$1, end_time=$2, last_modified=NOW() WHERE id=$3 RETURNING *";
        values = [req.body.start, req.body.end, req.params.id];
      } else {
        query =
          "UPDATE trip_schedule SET start_time=$1, end_time=$2, sort_index=$3, last_modified=NOW() WHERE id=$4 RETURNING *";
        values = [req.body.start, req.body.end, newSortIndex, req.params.id];
      }

      const result = await client.query(query, values);

      if (result.rowCount > 0) {
        console.log("CHANGING TIME WAS A SUCCESS, COMMITING NOW....");
        await client.query("COMMIT");
        if (typeof newSortIndex === "object") {
          const newlyIndexedSchedule = newSortIndex.map((v) =>
            v.id === result.rows[0].id ? result.rows[0] : v
          );
          snakeToCamel(newlyIndexedSchedule);
          res.status(200).json({ newlyIndexedSchedule });
        } else {
          snakeToCamel(result.rows);
          res.status(200).json({ updatedData: result.rows[0] });
          return;
        }
      } else {
        await client.query("ROLLBACK");
        res.sendStatus(500);
        return;
      }
    } catch (err) {
      await client.query("ROLLBACK");
      console.log("CATCH ERR:", err);
      next(err);
    } finally {
      client.release();
    }
  }
);

router.delete(
  "/schedule/:id",
  ensureLoggedIn,
  ensureOwnership,
  stateAwareConfirmation,
  async (req, res, next) => {
    try {
      const result = await db.query(
        "DELETE FROM trip_schedule WHERE id=$1 RETURNING *",
        [req.params.id]
      );
      if (result.rowCount > 0) {
        snakeToCamel(result.rows);
        res.status(200).json({ deletedData: result.rows[0] });
        return;
      } else if (result.rowCount === 0) {
        res
          .status(404)
          .json({ deletedId: req.params.id, queryComplete: "true" }); //not really necessary since stateAware will catch it before. Super unlikely case but it can be triggered if another user deletes between stateAware and our deleteQuery since this is not atomized (BEGIN COMMIT)
        return;
      }
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/list/:tripId",
  ensureLoggedIn,
  ensureOwnership,
  async (req, res, next) => {
    try {
      const result = await db.query(
        "SELECT id, value, from_google, item_added, last_modified FROM trip_list WHERE trip_id=$1 ORDER BY created_at ASC",
        [req.params.tripId]
      );
      snakeToCamel(result.rows);
      res.status(200).json({ data: result.rows });
      return;
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/list/:tripId",
  ensureLoggedIn,
  ensureOwnership,
  async (req, res, next) => {
    try {
      let queryText: string;
      let queryParams: Array<string>;
      if (req.body.fromGoogle) {
        queryText =
          "INSERT INTO trip_list (trip_id, value, from_google) VALUES ($1, $2, $3) RETURNING id, value, from_google, last_modified, item_added";
        queryParams = [req.params.tripId, req.body.value, req.body.fromGoogle];
      } else {
        queryText =
          "INSERT INTO trip_list (trip_id, value) VALUES ($1, $2) RETURNING id, value, from_google, last_modified, item_added";
        queryParams = [req.params.tripId, req.body.value];
      }
      const result = await db.query(queryText, queryParams);
      snakeToCamel(result.rows);
      res.status(200).json({ data: result.rows[0] });
      return;
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/list/:id",
  ensureLoggedIn,
  ensureOwnership,
  stateAwareConfirmation,
  async (req, res, next) => {
    try {
      const result = await db.query(
        "UPDATE trip_list SET value=$1, last_modified=NOW() WHERE id=$2 RETURNING *",
        [req.body.value, req.params.id]
      );
      snakeToCamel(result.rows);
      res.status(200).json({ data: result.rows });
      return;
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/check-list-item/:itemId",
  ensureLoggedIn,
  ensureOwnership,
  ensureLoggedIn,
  async (req, res, next) => {
    try {
      const result = await db.query(
        "UPDATE trip_list SET item_added=$1, last_modified=NOW() WHERE id=$2 RETURNING *",
        [req.body.newValue, req.params.itemId]
      );
      snakeToCamel(result.rows);
      res.status(200).json({ data: result.rows });
      return;
    } catch (err) {
      res.sendStatus(500);
      next(err);
      return;
    }
  }
);

router.delete(
  "/list/:itemId",
  ensureLoggedIn,
  ensureOwnership,
  async (req, res, next) => {
    try {
      let result: QueryResult;
      if (req.body.isGoogleId) {
        result = await db.query(
          "DELETE FROM trip_list WHERE from_google=$1 RETURNING *",
          [req.params.itemId]
        );
      } else {
        result = await db.query(
          "DELETE FROM trip_list WHERE id=$1 RETURNING *",
          [req.params.itemId]
        );
      }
      res.status(200).json({ deletedData: result.rows });
      return;
    } catch (err) {
      next(err);
    }
  }
);

router.post("/map", ensureLoggedIn, ensureOwnership, async (req, res, next) => {
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

router.post(
  "/autocomplete",
  ensureLoggedIn,
  ensureOwnership,
  async (req, res, next) => {
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
  }
);

router.post(
  "/details/:itemId",
  ensureLoggedIn,
  ensureOwnership,
  async (req, res, next) => {
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
  }
);

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
