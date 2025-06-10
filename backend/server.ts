import express from "express";
import { Request, Response } from "express";
const app = express();
import vacationRoutes from "./routes/vacationRoutes.js";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";

declare module "express" {
  interface Request {
    user?: { id: string; name: string }; // adjust to your user shape
  }
}

dotenv.config();
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("tiny"));

app.use("/", vacationRoutes);

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
    res: Response
  ) {
    res.status(err.status || 500).json({ message: err.message, error: err });
  });
}

app.listen(port, () => {
  console.log(`server listening on port: ${port}`);
});
