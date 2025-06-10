import express from "express";
const router = express.Router();
import db from "../db/db.js";
import bcrypt from "bcrypt";
import { v4 as createUUID } from "uuid";

interface PgError extends Error {
  code?: string;
}

router.post("/signup", async (req, res, next) => {
  const hash: string = await bcrypt.hash(req.body.password, 12);
  const token: string = createUUID();
  try {
    //check for email uniqueness in both tables
    const existingUnverifiedEmail = await db.query(
      "SELECT * FROM unverified_users WHERE email=$1",
      [req.body.email]
    );
    const existingActiveEmail = await db.query(
      "SELECT * FROM users WHERE email=$1",
      [req.body.email]
    );

    if (existingUnverifiedEmail.rows.length > 0) {
      // let's use this to send an email again
      // if it isn't expired simply send a message to confirm email with an optional
      // link to re-send verification email. If expired, send verfication email link
    } else if (existingActiveEmail.rows.length > 0) {
      // active user message with hyperlink for forgot password
    } else {
      await db.query(
        "INSERT INTO unverified_users (email, password, first_name, last_name, uuid, expires_at) VALUES ($1, $2, $3, $4, $5, NOW()+ interval '1 hour')",
        [req.body.email, hash, req.body.firstName, req.body.lastName, token]
      );
      res.status(200).json({ message: "success" });
    }
  } catch (err) {
    const pgErr = err as PgError;
    if (pgErr.code === "23505") {
      console.log("email already exists");
    }
    next(err);
  }
});

router.get("/verify", async (req, res, next) => {
  const token = req.query.token;
  if (token) {
    try {
      const checkExpiration = await db.query(
        "SELECT * FROM unverified_users WHERE token=$1 AND expires_at > NOW()",
        [token]
      );
      if (checkExpiration.rows.length === 0) {
        res.status(400).json({ message: "token not found or expired token" });
        return;
      } else {
        //begin moving user from unverified db to users db
        const client = await db.connect();
        try {
          await client.query("BEGIN");
          await client.query(
            "INSERT INTO users (email, password, first_name, last_name) FROM unverified_users WHERE token=$1",
            [token]
          );
          await client.query("DELETE FROM unverified_users WHERE token=$1", [
            token,
          ]);
          await client.query("COMMIT");
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        } finally {
          client.release();
        }
        res.redirect(
          200,
          "http://localhost:5173/verify-email?verified=success"
        );
      }
    } catch (err) {
      next(err);
    }
  } else {
    res.status(401).json({
      message:
        "broken token, try clicking the link again or create new account",
    });
    return;
  }
});
