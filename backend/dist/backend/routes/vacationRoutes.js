import express from "express";
const router = express.Router();
import db from "../db/db.js";
router.get("/home", async (req, res, next) => {
    try {
        const results = await db.query("SELECT * FROM trips");
        res.status(200).json(results.rows);
        return;
    }
    catch (err) {
        next(err);
    }
});
router.post("/add-vacation", async (req, res, next) => {
    try {
        await db.query("INSERT INTO trips (trip_name, location, start_date, end_date) VALUES ($1, $2, $3, $4)", [
            req.body.tripname,
            req.body.location,
            req.body.startDate,
            req.body.endDate,
        ]);
        res.status(200).json({ message: "success" });
        return;
    }
    catch (err) {
        next(err);
    }
});
export default router;
