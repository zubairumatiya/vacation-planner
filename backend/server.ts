import express, { NextFunction } from "express";
import { Request, Response } from "express";
const app = express();
import vacationRoutes from "./routes/vacationRoutes.js";
import loginRoutes from "./routes/loginRoutes.js";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const FRONTEND_URL = process.env.FRONTEND_URL;
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("tiny"));

app.use("/", vacationRoutes);
app.use("/", loginRoutes);

const port = process.env.PORT;

app.use(function (req, res, next) {
  const err = new Error("Not Found") as Error & { status?: number };
  err.status = 404;
  next(err);
});

if (app.get("env") === "development") {
  app.use(function (
    err: Error & { status?: number },
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction,
  ) {
    res.status(err.status || 500).json({ message: err.message, error: err });
    return;
  });
}
console.log("FRONTEND_URL:", process.env.FRONTEND_URL);

const options = {
  key: fs.readFileSync(
    path.resolve(__dirname, "../../certs/localhost-key.pem"),
  ),
  cert: fs.readFileSync(path.resolve(__dirname, "../../certs/localhost.pem")),
};

https.createServer(options, app).listen(port, () => {
  console.log(`HTTPS backend running on port: ${port}`);
});
