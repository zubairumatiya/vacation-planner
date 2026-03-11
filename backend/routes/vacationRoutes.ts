import express, { NextFunction } from "express";
const router = express.Router();
import db from "../db/db.js";
import ensureLoggedIn from "../middleware/ensureLoggedIn.js";
import dotenv from "dotenv";
import { snakeToCamel } from "../helpers/snakeToCamel.js";
import { QueryResult } from "pg";
import checkIndexSpacing from "../helpers/checkIndexSpacing.js";
import ensureOwnership from "../middleware/ensureOwnership.js";
import ensureOwnerOnly from "../middleware/ensureOwnerOnly.js";
import ensureTripAccess from "../middleware/ensureTripAccess.js";
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
  QuestionnaireRow,
  QuestionnaireBody,
  QuestionnaireResponse,
  CountryInfoResponse,
} from "../types/app-types.js";
import stateAwareConfirmation from "../middleware/stateAwareConfirmation.js";
import camelToSpacedLower from "../helpers/camelToSpacedLower.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const API_KEY = process.env.MAPS_API_KEY;

const COUNTRY_ALIASES: Record<string, string> = {
  USA: "United States",
  US: "United States",
  "U.S.": "United States",
  "U.S.A.": "United States",
  "United States of America": "United States",
  UK: "United Kingdom",
  "U.K.": "United Kingdom",
  "Great Britain": "United Kingdom",
  England: "United Kingdom",
  Scotland: "United Kingdom",
  Wales: "United Kingdom",
  "Northern Ireland": "United Kingdom",
  "South Korea": "South Korea",
  "Republic of Korea": "South Korea",
  "North Korea": "North Korea",
  "DPRK": "North Korea",
  "Czech Republic": "Czech Republic",
  Czechia: "Czech Republic",
  "Ivory Coast": "Ivory Coast",
  "Côte d'Ivoire": "Ivory Coast",
  "Cote d'Ivoire": "Ivory Coast",
  UAE: "United Arab Emirates",
  "U.A.E.": "United Arab Emirates",
  "DR Congo": "Democratic Republic of the Congo",
  DRC: "Democratic Republic of the Congo",
  "Cabo Verde": "Cabo Verde",
  "Cape Verde": "Cabo Verde",
  "Timor-Leste": "Timor-Leste",
  "East Timor": "Timor-Leste",
  Eswatini: "Eswatini",
  Swaziland: "Eswatini",
  Myanmar: "Myanmar",
  Burma: "Myanmar",
  "The Gambia": "Gambia",
  "The Bahamas": "Bahamas",
  Holland: "Netherlands",
  "São Tomé and Príncipe": "São Tomé and Príncipe",
  "Sao Tome and Principe": "São Tomé and Príncipe",
};

function extractCountryFromLocation(location: string): string {
  const parts = location.split(",").map((p) => p.trim());
  return parts[parts.length - 1];
}

async function resolveCountryName(
  rawCountry: string,
): Promise<string | null> {
  // 1. Check alias map (case-insensitive)
  const aliasKey = Object.keys(COUNTRY_ALIASES).find(
    (k) => k.toLowerCase() === rawCountry.toLowerCase(),
  );
  const resolved = aliasKey ? COUNTRY_ALIASES[aliasKey] : rawCountry;

  // 2. Try exact match
  const exact = await db.query(
    "SELECT name FROM countries WHERE LOWER(name) = LOWER($1)",
    [resolved],
  );
  if (exact.rowCount && exact.rowCount > 0) {
    return exact.rows[0].name as string;
  }

  // 3. Try pg_trgm similarity
  const fuzzy = await db.query(
    "SELECT name, similarity(LOWER(name), LOWER($1)) AS sim FROM countries WHERE similarity(LOWER(name), LOWER($1)) > 0.3 ORDER BY sim DESC LIMIT 1",
    [resolved],
  );
  if (fuzzy.rowCount && fuzzy.rowCount > 0) {
    return fuzzy.rows[0].name as string;
  }

  return null;
}

router.get(
  "/home",
  ensureLoggedIn,
  async (req: TypedRequest, res: TypedResponse<Trip[]>, next: NextFunction) => {
    try {
      const results = await db.query(
        `SELECT DISTINCT ON (t.id) t.id, t.trip_name, t.location, t.start_date, t.end_date, t.g_id, t.g_vp, t.is_public, t.is_open_invite, t.created_at, t.last_modified, ut.role,
          owner_user.first_name AS owner_first_name,
          owner_user.last_name AS owner_last_name
        FROM user_trips ut
        JOIN trips t ON t.id = ut.trip_id
        LEFT JOIN user_trips owner_ut ON owner_ut.trip_id = t.id AND owner_ut.role = 'owner'
        LEFT JOIN users owner_user ON owner_user.id = owner_ut.user_id
        WHERE ut.user_id = $1
        ORDER BY t.id, ut.role = 'owner' DESC`,
        [req.user.id],
      );
      snakeToCamel(results.rows);
      res.status(200).json(results.rows);
      return;
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/add-vacation/:tripId",
  ensureLoggedIn,
  ensureOwnerOnly,
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
    const { tripname, location, startDate, endDate, gId, gVp, isPublic, isOpenInvite } = req.body;
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
        "INSERT INTO trips (trip_name, location, start_date, end_date, g_id, g_vp, is_public, is_open_invite) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
        [tripname, location, startDate, endDate, gId, gVp, isPublic ?? false, isOpenInvite ?? false],
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
  ensureOwnerOnly,
  async (
    req: TypedRequest<AddVacationBody, unknown, TripIdParam>,
    res: TypedResponse<AddVacationResponse>,
    next: NextFunction,
  ) => {
    const { tripname, location, startDate, endDate, gId, gVp, isPublic, isOpenInvite } = req.body;
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
        "UPDATE trips SET trip_name=$1, start_date=$2, end_date=$3, location=$4, g_id=$5, g_vp=$6, is_public=$7, is_open_invite=$8, last_modified=NOW() WHERE id=$9 RETURNING *",
        [tripname, startDate, endDate, location, gId, gVp, isPublic ?? false, isOpenInvite ?? false, req.params.tripId],
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

router.patch(
  "/toggle-visibility/:tripId",
  ensureLoggedIn,
  ensureOwnerOnly,
  async (
    req: TypedRequest<unknown, unknown, TripIdParam>,
    res: TypedResponse<AddVacationResponse>,
    next: NextFunction,
  ) => {
    try {
      const result = await db.query(
        "UPDATE trips SET is_public = NOT is_public, last_modified = NOW() WHERE id = $1 RETURNING is_public",
        [req.params.tripId],
      );
      if (result.rowCount !== null && result.rowCount > 0) {
        res.status(200).json({ is_public: result.rows[0].is_public });
        return;
      }
      res.sendStatus(404);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/delete-vacation/:tripId",
  ensureLoggedIn,
  ensureOwnerOnly,
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
  ensureTripAccess,
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

      const rawCountry = extractCountryFromLocation(
        result2.rows[0].location,
      );
      const countryName = await resolveCountryName(rawCountry);

      const response: TripWithSchedule = {
        role,
        ...result2.rows[0],
        schedule: arrCargo,
        countryName: countryName ?? undefined,
      };

      res.status(200).json(response);
      return;
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/country-info/:tripId",
  ensureLoggedIn,
  ensureTripAccess,
  async (
    req: TypedRequest<unknown, unknown, TripIdParam>,
    res: TypedResponse<CountryInfoResponse>,
    next: NextFunction,
  ) => {
    try {
      const tripResult = await db.query<Trip>(
        "SELECT location FROM trips WHERE id=$1",
        [req.params.tripId],
      );
      if (!tripResult.rowCount || tripResult.rowCount < 1) {
        res.sendStatus(404);
        return;
      }

      const rawCountry = extractCountryFromLocation(
        tripResult.rows[0].location,
      );
      const countryName = await resolveCountryName(rawCountry);

      if (!countryName) {
        res.sendStatus(404);
        return;
      }

      const countryResult = await db.query(
        "SELECT name, population, geography, info, language, currency, happiness_rank FROM countries WHERE name = $1",
        [countryName],
      );

      if (!countryResult.rowCount || countryResult.rowCount < 1) {
        res.sendStatus(404);
        return;
      }

      const row = countryResult.rows[0];
      res.status(200).json({
        countryName: row.name as string,
        population: row.population as number,
        geography: row.geography as number,
        info: row.info as string,
        language: row.language as string,
        currency: row.currency as string,
        happinessRank: (row.happiness_rank as number) ?? null,
      });
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

router.patch(
  "/toggle-lock/:id",
  ensureLoggedIn,
  ensureOwnership,
  async (
    req: TypedRequest<{ tripId?: string }, unknown, IdParam>,
    res: TypedResponse<ScheduleResponse>,
    next: NextFunction,
  ) => {
    try {
      const result: QueryResult<Schedule> = await db.query(
        "UPDATE trip_schedule SET is_locked = NOT is_locked, last_modified=NOW() WHERE id=$1 RETURNING *",
        [req.params.id],
      );
      if (result.rowCount !== null && result.rowCount > 0) {
        snakeToCamel<Schedule>(result.rows);
        res.status(200).json({ updatedData: result.rows[0] });
        return;
      } else {
        res.sendStatus(404);
        return;
      }
    } catch (err) {
      next(err);
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
  ensureTripAccess,
  async (
    req: TypedRequest<unknown, unknown, TripIdParam>,
    res: TypedResponse<ListResponse>,
    next: NextFunction,
  ) => {
    try {
      const result: QueryResult<TripList> = await db.query(
        "SELECT id, value, from_google, details, item_added, last_modified FROM trip_list WHERE trip_id=$1 ORDER BY created_at ASC",
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
      let queryParams: Array<string | null>;
      const details = req.body.details ?? null;
      if (req.body.fromGoogle) {
        queryText =
          "INSERT INTO trip_list (trip_id, value, from_google, details) VALUES ($1, $2, $3, $4) RETURNING id, value, from_google, details, last_modified, item_added";
        queryParams = [req.params.tripId, req.body.value, req.body.fromGoogle, details];
      } else {
        queryText =
          "INSERT INTO trip_list (trip_id, value, details) VALUES ($1, $2, $3) RETURNING id, value, from_google, details, last_modified, item_added";
        queryParams = [req.params.tripId, req.body.value, details];
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
      const details = req.body.details !== undefined ? req.body.details : undefined;
      const result: QueryResult<TripList> = details !== undefined
        ? await db.query(
            "UPDATE trip_list SET value=$1, details=$2, last_modified=NOW() WHERE id=$3 RETURNING *",
            [req.body.value, details, req.params.id],
          )
        : await db.query(
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

router.get(
  "/questionnaire/:tripId",
  ensureLoggedIn,
  ensureTripAccess,
  async (
    req: TypedRequest<unknown, unknown, TripIdParam>,
    res: TypedResponse<QuestionnaireResponse>,
    next: NextFunction,
  ) => {
    try {
      const result: QueryResult<QuestionnaireRow> = await db.query(
        "SELECT * FROM trip_questionnaire WHERE trip_id = $1",
        [req.params.tripId],
      );
      if (result.rowCount === null || result.rowCount < 1) {
        res.status(200).json({ questionnaire: undefined });
        return;
      }
      snakeToCamel<QuestionnaireRow>(result.rows);
      res.status(200).json({ questionnaire: result.rows[0] });
      return;
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/questionnaire/:tripId",
  ensureLoggedIn,
  ensureOwnership,
  async (
    req: TypedRequest<QuestionnaireBody, unknown, TripIdParam>,
    res: TypedResponse<QuestionnaireResponse>,
    next: NextFunction,
  ) => {
    const {
      budget,
      interests,
      dietaryRestrictions,
      pace,
      travelingWithKidsOrElderly,
      accessibilityNeeds,
      tourPreference,
      accommodationType,
      mustSeeExperiences,
      startTimePreference,
      transportMode,
    } = req.body;

    try {
      const result: QueryResult<QuestionnaireRow> = await db.query(
        `INSERT INTO trip_questionnaire (
          trip_id, budget, interests, dietary_restrictions, pace,
          traveling_with_kids_or_elderly, accessibility_needs, tour_preference,
          accommodation_type, must_see_experiences, start_time_preference, transport_mode
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (trip_id) DO UPDATE SET
          budget = EXCLUDED.budget,
          interests = EXCLUDED.interests,
          dietary_restrictions = EXCLUDED.dietary_restrictions,
          pace = EXCLUDED.pace,
          traveling_with_kids_or_elderly = EXCLUDED.traveling_with_kids_or_elderly,
          accessibility_needs = EXCLUDED.accessibility_needs,
          tour_preference = EXCLUDED.tour_preference,
          accommodation_type = EXCLUDED.accommodation_type,
          must_see_experiences = EXCLUDED.must_see_experiences,
          start_time_preference = EXCLUDED.start_time_preference,
          transport_mode = EXCLUDED.transport_mode,
          last_modified = NOW()
        RETURNING *`,
        [
          req.params.tripId,
          budget ?? null,
          interests ?? null,
          dietaryRestrictions ?? null,
          pace ?? null,
          travelingWithKidsOrElderly ?? null,
          accessibilityNeeds ?? null,
          tourPreference ?? null,
          accommodationType ?? null,
          mustSeeExperiences ?? null,
          startTimePreference ?? null,
          transportMode ?? null,
        ],
      );
      snakeToCamel<QuestionnaireRow>(result.rows);
      res.status(200).json({ questionnaire: result.rows[0] });
      return;
    } catch (err) {
      next(err);
    }
  },
);

export default router;
