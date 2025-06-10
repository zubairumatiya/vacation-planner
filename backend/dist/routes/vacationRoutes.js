import express from "express";
const router = express.Router();
import db from "../db/db.js";
router.get("/home", async (req, res, next) => {
    try {
        const results = await db.query("SELECT * FROM trips");
        res.status(200).json(results.rows);
    }
    catch (err) {
        next(err);
    }
});
export default router;
