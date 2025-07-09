import express from "express";
const router = express.Router();
import db from "../db/db.js";
import ensureLoggedIn from "../middleware/ensureLoggedIn.js";
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
router.post("/add-vacation", ensureLoggedIn, async (req, res, next) => {
    if (req.body.tripname ||
        req.body.location ||
        req.body.startDate ||
        req.body.endDate) {
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
        const response = await db.query("INSERT INTO trips (trip_name, location, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING *", [
            req.body.tripname,
            req.body.location,
            req.body.startDate,
            req.body.endDate,
        ]);
        await db.query("INSERT INTO user_trips (user_id, trip_id, owner) VALUES ($1, $2, TRUE)", [req.user.id, response.rows[0].id]);
        // ADD AN ENTRY TO user_trips TOO! Mark the owner field as true -- TODO
        res.status(200).json({ message: "success" });
        return;
    }
    catch (err) {
        next(err);
    }
});
export default router;
