import express from "express";
const app = express();
import vacationRoutes from "./routes/vacationRoutes.js";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
dotenv.config();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("tiny"));
app.use("/", vacationRoutes);
const port = process.env.PORT;
app.use(function (req, res, next) {
    const err = new Error("Not Found");
    err.status = 404;
    next(err);
});
if (app.get("env") === "development") {
    app.use(function (err, req, res) {
        res.status(err.status || 500).json({ message: err.message, error: err });
    });
}
app.listen(port, () => {
    console.log(`server listening on port: ${port}`);
});
