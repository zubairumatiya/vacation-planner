import express, { NextFunction } from "express";
import { Request, Response } from "express";
const app = express();
import vacationRoutes from "./routes/vacationRoutes.js";
import loginRoutes from "./routes/loginRoutes.js";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";

dotenv.config();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
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
    next: NextFunction
  ) {
    res.status(err.status || 500).json({ message: err.message, error: err });
    return;
  });
}

app.listen(port, () => {
  console.log(`server listening on port: ${port}`);
});
