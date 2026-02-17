import express, { NextFunction } from "express";
const router = express.Router();
import db from "../db/db.js";
import ensureLoggedIn from "../middleware/ensureLoggedIn.js";
import dotenv from "dotenv";
import { snakeToCamel } from "../helpers/snakeToCamel.js";
import { QueryResult } from "pg";
import checkIndexSpacing from "../helpers/checkIndexSpacing.js";
import ensureOwnership from "../middleware/ensureOwnership.js";
import renumberIndexDb from "../helpers/renumberIndexDb.js";
import {
  Schedule,
  TypedRequest,
  TypedResponse,
  Trip,
  TripIdParam,
  AddVacationBody,
  AddVacationResponse,
  ScheduleBody,
  ScheduleResponse,
  IdParam,
  TripList,
  ListBody,
  ListResponse,
  ItemIdParam,
  MapBody,
  MapResponse,
  AutocompleteBody,
  TextSearchResponse,
  Place,
  TripWithSchedule,
  AutocompleteResponse,
  DetailsResponse,
  CheckListItemBody,
  DeleteListBody,
} from "../types/express.js";
import stateAwareConfirmation from "../middleware/stateAwareConfirmation.js";
import camelToSpacedLower from "../helpers/camelToSpacedLower.js";

dotenv.config();
const API_KEY = process.env.MAPS_API_KEY;

router.get(
  "/home",
  ensureLoggedIn,
  async (req: TypedRequest, res: TypedResponse<Trip[]>, next: NextFunction) => {
    try {
      const results: QueryResult<{ trip_id: string }> = await db.query(
        "SELECT trip_id FROM user_trips WHERE user_id=$1",
        [req.user.id],
      );
      const ids: Array<string> = results.rows.map((row) => row.trip_id);
      const results2: QueryResult<Trip> = await db.query(
        "SELECT * FROM trips WHERE id = ANY($1::uuid[])",
        [ids],
      );
      res.status(200).json(results2.rows);
      return;
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/add-vacation/:tripId",
  ensureLoggedIn,
  ensureOwnership,
  async (
    req: TypedRequest<unknown, unknown, TripIdParam>,
    res: TypedResponse<AddVacationResponse>,
    next: NextFunction,
  ) => {
    try {
      const results: QueryResult<Trip> = await db.query(
        "SELECT * FROM trips WHERE id=$1",
        [req.params.tripId],
      );
      if (results.rowCount === null || results.rowCount < 1) {
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
  },
);

router.post(
  "/add-vacation",
  ensureLoggedIn,
  async (
    req: TypedRequest<AddVacationBody>,
    res: TypedResponse<AddVacationResponse>,
    next: NextFunction,
  ) => {
    const { tripname, location, startDate, endDate, gId, gVp } = req.body;
    if (!tripname || !location || !startDate || !endDate || !gId || !gVp) {
      res.status(400).json({
        message: "Invalid input - make sure all the fields are filled",
      });
      return;
    }
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);

    if (sDate > eDate) {
      res.status(400).json({
        message: "Invalid date - End date cannot be before start date",
      });
      return;
    }

    try {
      const results: QueryResult<{ id: string }> = await db.query(
        "INSERT INTO trips (trip_name, location, start_date, end_date, g_id, g_vp) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        [tripname, location, startDate, endDate, gId, gVp],
      );
      await db.query(
        "INSERT INTO user_trips (user_id, trip_id, role) VALUES ($1, $2, 'owner')",
        [req.user.id, results.rows[0].id],
      );
      res.status(200).json({ message: "success" });
      return;
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  "/add-vacation/:tripId",
  ensureLoggedIn,
  ensureOwnership,
  async (
    req: TypedRequest<AddVacationBody, unknown, TripIdParam>,
    res: TypedResponse<AddVacationResponse>,
    next: NextFunction,
  ) => {
    const { tripname, location, startDate, endDate, gId, gVp } = req.body;
    if (!tripname || !location || !startDate || !endDate || !gId || !gVp) {
      res.sendStatus(400);
      return;
    }
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);

    if (sDate > eDate) {
      res.sendStatus(400);
      return;
    }

    try {
      const result: QueryResult<Trip> = await db.query(
        "UPDATE trips SET trip_name=$1, start_date=$2, end_date=$3, location=$4, g_id=$5, g_vp=$6, last_modified=NOW() WHERE id=$7 RETURNING *",
        [tripname, startDate, endDate, location, gId, gVp, req.params.tripId],
      );
      if (result.rowCount !== null && result.rowCount > 0) {
        res.status(200).json({ message: "success" });
        return;
      }
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/delete-vacation/:tripId",
  ensureLoggedIn,
  ensureOwnership,
  async (
    req: TypedRequest<unknown, unknown, TripIdParam>,
    res: TypedResponse<AddVacationResponse>,
    next: NextFunction,
  ) => {
    try {
      const result: QueryResult<Trip> = await db.query(
        "DELETE FROM trips WHERE id=$1 RETURNING *",
        [req.params.tripId],
      );
      if (result.rowCount !== null && result.rowCount > 0) {
        res.status(200).json({ message: "success" });
        return;
      }
    } catch (err) {
      console.log(err);
      next(err);
    }
  },
);

router.get(
  "/schedule/:tripId",
  ensureLoggedIn,
  ensureOwnership,
  async (
    req: TypedRequest<unknown, unknown, TripIdParam>,
    res: TypedResponse<TripWithSchedule>,
    next: NextFunction,
  ) => {
    try {
      const role = req.user.role;
      const result2: QueryResult<Trip> = await db.query(
        "SELECT * FROM trips WHERE id=$1",
        [req.params.tripId],
      );
      if (result2.rowCount === null || result2.rowCount < 1) {
        res.sendStatus(404);
        return;
      }
      snakeToCamel<Trip>(result2.rows);
      const result3: QueryResult<Schedule> = await db.query(
        "SELECT * FROM trip_schedule WHERE trip_id=$1 ORDER BY start_time ASC, sort_index ASC",
        [req.params.tripId],
      );
      if (result3.rowCount !== null && result3.rowCount > 0) {
        snakeToCamel<Schedule>(result3.rows);
      }
      const arrCargo =
        result3.rowCount !== null && result3.rowCount > 0 ? result3.rows : [];

      const response: TripWithSchedule = {
        role,
        ...result2.rows[0],
        schedule: arrCargo,
      };

      res.status(200).json(response);
      return;
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/schedule/:tripId",
  ensureLoggedIn,
  ensureOwnership,
  async (
    req: TypedRequest<ScheduleBody, unknown, TripIdParam>,
    res: TypedResponse<ScheduleResponse>,
    next: NextFunction,
  ) => {
    const client = await db.connect();

    try {
      await client.query("BEGIN");
      const newSortIndex = await checkIndexSpacing(
        req.body,
        client,
        req.params.tripId,
      );
      const cost =
        isNaN(Number(req.body.cost)) || req.body.cost === ""
          ? 0
          : Number(req.body.cost);
      let values: (string | number | Date | boolean)[];
      let queryText: string =
        "INSERT INTO trip_schedule (trip_id, start_time, end_time, location, cost, details, multi_day, sort_index) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *";
      const multiDay = req.body.multiDay ?? false;
      if (newSortIndex === undefined) {
        const placeHolderIndex = (req.body.chunk.above?.sortIndex ?? 0) + 1;
        values = [
          req.params.tripId,
          req.body.start,
          req.body.end,
          req.body.location,
          cost,
          req.body.details,
          multiDay,
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
            cost,
            req.body.details,
            multiDay,
            placeHolderIndex,
          ];
        }
      } else if (typeof newSortIndex === "number") {
        values = [
          req.params.tripId,
          req.body.start,
          req.body.end,
          req.body.location,
          cost,
          req.body.details,
          multiDay,
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
            cost,
            req.body.details,
            multiDay,
            newSortIndex,
          ];
        }
      } else {
        throw new Error("Unexpected sort index result");
      }
      const result = await client.query<Schedule>(queryText, values);

      if (result.rowCount !== null && result.rowCount > 0) {
        if (newSortIndex === undefined) {
          const renumRows = await renumberIndexDb(req.params.tripId, client);
          if (renumRows.length < 1) {
            await client.query("ROLLBACK");
            res.status(500).json({ message: "Internal server error" });
            return;
          }
          snakeToCamel<Schedule>(renumRows);
          await client.query("COMMIT");
          res.status(200).json({ newlyIndexedSchedule: renumRows });
          return;
        }
        const rowToReturn: QueryResult<Schedule> = await client.query(
          "SELECT * FROM trip_schedule WHERE id=$1",
          [result.rows[0].id],
        );
        snakeToCamel<Schedule>(rowToReturn.rows);
        await client.query("COMMIT");
        res.status(200).json({ addedItem: rowToReturn.rows[0] });
        return;
      } else {
        await client.query("ROLLBACK");
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
  },
);

router.patch(
  "/schedule/:id",
  ensureLoggedIn,
  ensureOwnership,
  stateAwareConfirmation,
  async (
    req: TypedRequest<ScheduleBody, unknown, IdParam>,
    res: TypedResponse<ScheduleResponse>,
    next: NextFunction,
  ) => {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const newSortIndex = await checkIndexSpacing(
        req.body,
        client,
        undefined,
        undefined,
        req.params.id,
      );
      if (newSortIndex === undefined) {
        await client.query("ROLLBACK");
        res.sendStatus(500);
        return;
      }
      let query: string;
      let values: Array<string | number | object | boolean>;
      const multiDay = req.body.multiDay ?? false;
      const cost = Number(req.body.cost) || 0;

      if (Array.isArray(newSortIndex)) {
        query =
          "UPDATE trip_schedule SET location=$1, details=$2, start_time=$3, end_time=$4, cost=$5, multi_day=$6, last_modified=NOW() WHERE id=$7 RETURNING *";
        values = [
          req.body.location,
          req.body.details,
          req.body.start,
          req.body.end,
          cost,
          multiDay,
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
          cost,
          multiDay,
          newSortIndex as number,
          req.params.id,
        ];
      }
      const result = await client.query<Schedule>(query, values);
      if (result.rowCount !== null && result.rowCount > 0) {
        await client.query("COMMIT");
        if (Array.isArray(newSortIndex)) {
          const newlyIndexedSchedule = newSortIndex.map((v) =>
            v.id === result.rows[0].id ? result.rows[0] : v,
          );
          snakeToCamel<Schedule>(newlyIndexedSchedule);
          res.status(200).json({ newlyIndexedSchedule });
        } else {
          snakeToCamel<Schedule>(result.rows);
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
      next(err);
    } finally {
      client.release();
    }
  },
);

router.patch(
  "/update-time/:id",
  ensureLoggedIn,
  ensureOwnership,
  stateAwareConfirmation,
  async (
    req: TypedRequest<ScheduleBody, unknown, IdParam>,
    res: TypedResponse<ScheduleResponse>,
    next: NextFunction,
  ) => {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const newSortIndex = await checkIndexSpacing(
        req.body,
        client,
        undefined,
        undefined,
        req.params.id,
      );
      if (newSortIndex === undefined) {
        await client.query("ROLLBACK");
        res.sendStatus(500);
        return;
      }
      let query: string;
      let values: Array<string | number | object | boolean>;
      if (Array.isArray(newSortIndex)) {
        query =
          "UPDATE trip_schedule SET start_time=$1, end_time=$2, last_modified=NOW() WHERE id=$3 RETURNING *";
        values = [req.body.start, req.body.end, req.params.id];
      } else {
        query =
          "UPDATE trip_schedule SET start_time=$1, end_time=$2, sort_index=$3, last_modified=NOW() WHERE id=$4 RETURNING *";
        values = [
          req.body.start,
          req.body.end,
          newSortIndex as number,
          req.params.id,
        ];
      }

      const result = await client.query<Schedule>(query, values);

      if (result.rowCount !== null && result.rowCount > 0) {
        await client.query("COMMIT");
        if (Array.isArray(newSortIndex)) {
          const newlyIndexedSchedule = newSortIndex.map((v) =>
            v.id === result.rows[0].id ? result.rows[0] : v,
          );
          snakeToCamel<Schedule>(newlyIndexedSchedule);
          res.status(200).json({ newlyIndexedSchedule });
        } else {
          snakeToCamel<Schedule>(result.rows);
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
      next(err);
    } finally {
      client.release();
    }
  },
);

router.delete(
  "/schedule/:id",
  ensureLoggedIn,
  ensureOwnership,
  stateAwareConfirmation,
  async (
    req: TypedRequest<unknown, unknown, IdParam>,
    res: TypedResponse<ScheduleResponse>,
    next: NextFunction,
  ) => {
    try {
      const result: QueryResult<Schedule> = await db.query(
        "DELETE FROM trip_schedule WHERE id=$1 RETURNING *",
        [req.params.id],
      );
      if (result.rowCount !== null && result.rowCount > 0) {
        snakeToCamel<Schedule>(result.rows);
        res.status(200).json({ deletedData: result.rows[0] });
        return;
      } else if (result.rowCount === 0) {
        res
          .status(404)
          .json({ deletedId: req.params.id, queryComplete: "true" });
        return;
      }
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/list/:tripId",
  ensureLoggedIn,
  ensureOwnership,
  async (
    req: TypedRequest<unknown, unknown, TripIdParam>,
    res: TypedResponse<ListResponse>,
    next: NextFunction,
  ) => {
    try {
      const result: QueryResult<TripList> = await db.query(
        "SELECT id, value, from_google, item_added, last_modified FROM trip_list WHERE trip_id=$1 ORDER BY created_at ASC",
        [req.params.tripId],
      );
      snakeToCamel<TripList>(result.rows);
      res.status(200).json({ data: result.rows });
      return;
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/list/:tripId",
  ensureLoggedIn,
  ensureOwnership,
  async (
    req: TypedRequest<ListBody, unknown, TripIdParam>,
    res: TypedResponse<ListResponse>,
    next: NextFunction,
  ) => {
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
      const result: QueryResult<TripList> = await db.query(
        queryText,
        queryParams,
      );
      snakeToCamel<TripList>(result.rows);
      res.status(200).json({ data: result.rows[0] });
      return;
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  "/list/:id",
  ensureLoggedIn,
  ensureOwnership,
  stateAwareConfirmation,
  async (
    req: TypedRequest<ListBody, unknown, IdParam>,
    res: TypedResponse<ListResponse>,
    next: NextFunction,
  ) => {
    try {
      const result: QueryResult<TripList> = await db.query(
        "UPDATE trip_list SET value=$1, last_modified=NOW() WHERE id=$2 RETURNING *",
        [req.body.value, req.params.id],
      );
      snakeToCamel<TripList>(result.rows);
      res.status(200).json({ data: result.rows });
      return;
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  "/check-list-item/:itemId",
  ensureLoggedIn,
  ensureOwnership,
  async (
    req: TypedRequest<CheckListItemBody, unknown, ItemIdParam>,
    res: TypedResponse<ListResponse>,
    next: NextFunction,
  ) => {
    try {
      const result: QueryResult<TripList> = await db.query(
        "UPDATE trip_list SET item_added=$1, last_modified=NOW() WHERE id=$2 RETURNING *",
        [req.body.newValue, req.params.itemId],
      );
      snakeToCamel<TripList>(result.rows);
      res.status(200).json({ data: result.rows });
      return;
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/list/:itemId",
  ensureLoggedIn,
  ensureOwnership,
  async (
    req: TypedRequest<DeleteListBody, unknown, ItemIdParam>,
    res: TypedResponse<ListResponse>,
    next: NextFunction,
  ) => {
    try {
      let result: QueryResult<TripList>;
      if (req.body.isGoogleId) {
        result = await db.query(
          "DELETE FROM trip_list WHERE from_google=$1 RETURNING *",
          [req.params.itemId],
        );
      } else {
        result = await db.query(
          "DELETE FROM trip_list WHERE id=$1 RETURNING *",
          [req.params.itemId],
        );
      }
      res.status(200).json({ deletedData: result.rows });
      return;
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/map",
  ensureLoggedIn,
  ensureOwnership,
  async (
    req: TypedRequest<MapBody>,
    res: TypedResponse<MapResponse>,
    next: NextFunction,
  ) => {
    let countOfPlaces = 0;
    const gatherPlaces: Place[] = [];
    let holdToken = req.body.nextPageToken ?? "";
    try {
      if (req.body.nextPageToken === undefined) {
        res.sendStatus(406);
        return;
      }
      if (!req.body.placeType) {
        res.sendStatus(400);
        return;
      }
      const normalPlaceType = camelToSpacedLower(req.body.placeType);
      const snakePlaceType = req.body.placeType
        .replace(/([A-Z])/g, "_$1")
        .replace(/^_/, "")
        .toLowerCase()
        .trim();
      const query = `${normalPlaceType}s near ${req.body.locationName}`;
      while (countOfPlaces < 20 && holdToken !== undefined) {
        const result = await fetch(
          "https://places.googleapis.com/v1/places:searchText",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": `${API_KEY}`,
              "X-Goog-FieldMask":
                "places.id,nextPageToken,places.displayName,places.location,places.shortFormattedAddress,places.primaryType,places.rating,places.userRatingCount,places.types",
            },
            body: JSON.stringify({
              textQuery: `${query}`,
              pageToken: holdToken,
              minRating: req.body.ratingFilter,
              pageSize: 20,
              includedType: `${snakePlaceType}`,
              strictTypeFiltering: true,
              locationRestriction: { rectangle: req.body.viewport },
            }),
          },
        );
        if (!result.ok) throw new Error(`HTTP error! status: ${result.status}`);
        const data = (await result.json()) as TextSearchResponse;

        let filteredPlaces = data.places ?? [];
        filteredPlaces = filteredPlaces.filter((v: Place) => {
          return v.types.includes(snakePlaceType);
        });

        if (req.body.reviewFilter) {
          filteredPlaces.forEach((v: Place) => {
            if (v.userRatingCount >= (req.body.reviewFilter ?? 0)) {
              countOfPlaces++;
              gatherPlaces.push(v);
            }
          });
        } else {
          countOfPlaces += filteredPlaces.length;
          gatherPlaces.push(...filteredPlaces);
        }
        holdToken = data.nextPageToken ?? "";
        if (holdToken === "") break;
      }
      res.status(200).json({ places: gatherPlaces, nextPageToken: holdToken });
      return;
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/autocomplete",
  ensureLoggedIn,
  ensureOwnership,
  async (
    req: TypedRequest<AutocompleteBody>,
    res: TypedResponse<AutocompleteResponse>,
    next: NextFunction,
  ) => {
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
            includedPrimaryTypes: ["locality", "country", "political"],
          }),
        },
      );
      if (!result.ok) throw new Error(`HTTP error! status: ${result.status}`);
      const data = (await result.json()) as AutocompleteResponse;
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/details/:itemId",
  ensureLoggedIn,
  ensureOwnership,
  async (
    req: TypedRequest<unknown, unknown, ItemIdParam>,
    res: TypedResponse<DetailsResponse>,
    next: NextFunction,
  ) => {
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
        },
      );
      if (!result.ok) throw new Error(`HTTP error! status: ${result.status}`);
      const data = (await result.json()) as DetailsResponse;
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
