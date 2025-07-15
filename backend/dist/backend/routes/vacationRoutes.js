import express from "express";
const router = express.Router();
import db from "../db/db.js";
import ensureLoggedIn from "../middleware/ensureLoggedIn.js";
router.get("/home", ensureLoggedIn, async (req, res, next) => {
    try {
        const results = await db.query("SELECT trip_id FROM user_trips WHERE user_id=$1", [req.user.id]);
        const ids = results.rows.map((row) => row.trip_id); // make an array of id's instead of an array of objects
        const results2 = await db.query("SELECT * FROM trips WHERE id = ANY($1::int[])", // query an array, matching if ANY id in the array matches
        [ids]);
        res.status(200).json(results2.rows);
        return;
    }
    catch (err) {
        next(err);
    }
});
router.post("/add-vacation", ensureLoggedIn, async (req, res, next) => {
    if (!req.body.tripname ||
        !req.body.location ||
        !req.body.startDate ||
        !req.body.endDate) {
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
        const results = await db.query("INSERT INTO trips (trip_name, location, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING id", [
            req.body.tripname,
            req.body.location,
            req.body.startDate,
            req.body.endDate,
        ]);
        await db.query("INSERT INTO user_trips (user_id, trip_id, role) VALUES ($1, $2, 'owner')", [req.user.id, results.rows[0].id]);
        res.status(200).json({ message: "success" });
        return;
    }
    catch (err) {
        next(err);
    }
});
router.get("/vacation:id", ensureLoggedIn, async (req, res, next) => {
    try {
        const result = await db.query("SELECT * FROM user_trips WHERE user_id=$1 AND trips_id=$2", [req.user.id, req.params.id]);
        if (result.rowCount < 1) {
            res.sendStatus(404);
            return;
        }
        const role = result.rows[0].role;
        const result2 = await db.query("SELECT * FROM trips WHERE id=$1", [
            req.params.id,
        ]);
        if (result2.rowCount < 1) {
            res.sendStatus(404);
            return;
        }
        const startDate = result2.rows[0].start_date;
        const endDate = result2.rows[0].end_date;
        const tripName = result2.rows[0].trip_name;
        const result3 = await db.query("SELECT * FROM trip_schedule WHERE trip_id=$1", [req.params.id]);
        res
            .status(200)
            .json({ role, tripName, startDate, endDate, schedule: result3.rows });
        return;
    }
    catch (err) {
        next(err);
    }
});
router.post("/schedule:id", ensureLoggedIn, async (req, res, next) => {
    try {
        const match = await db.query("SELECT * FROM user_trips WHERE user_id=$1 AND trips_id=$2 AND (role=$3 OR role=$4)", [req.user.id, req.params.id, "owner", "editor"]);
        if (match.rowCount < 1) {
            res.sendStatus(403);
            return;
        }
        const result = await db.query("INSERT INTO trip_schedule (start_time, end_time, location, cost, details, multi_day) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *", [
            req.body.start,
            req.body.end,
            req.body.location,
            req.body.cost,
            req.body.details,
            req.body.multiday,
        ]);
        res.status(200).json({ addedItem: result.rows[0] });
        return;
    }
    catch (err) {
        next(err);
    }
});
export default router;
