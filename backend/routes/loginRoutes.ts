import express from "express";
const router = express.Router();
import db from "../db/db.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { isValidPassword } from "../../shared/passwordUtils.js";
import { isValidEmail } from "../../shared/emailUtils.js";
import { emailSender } from "../helpers/emailSender.js";
dotenv.config();

interface PgError extends Error {
  code?: string;
}

const BASE_URL: string =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_URL!
    : process.env.DEV_URL!;

const appName = process.env.APP_NAME;

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL!;

if (process.env.SIGNATURE === undefined) {
  throw new Error("SIGNATURE is undefined");
}
const SECRET: string = process.env.SIGNATURE;

const registerSubj = `${appName}: Verify Your Email Address`;
const sendRegistrationEmail = (userEmail: string, passToken: string) =>
  emailSender(
    userEmail,
    registerSubj,
    "Verification Link",
    BACKEND_BASE_URL,
    "verify",
    passToken
  );

router.post("/signup", async (req, res, next) => {
  if (req.body.password) {
    //insert password criteria verfication (can't be null, etc) --- DONE
    if (!isValidPassword(req.body.password) || req.body.password === null) {
      res.status(400).json({ message: "invalid password criteria" });
      return;
    }
  }
  if (req.body.email) {
    if (!isValidEmail(req.body.email) || req.body.email === null) {
      res.status(400).json({ message: "invalid email input" });
      return;
    }
  }
  const pass: string = req.body.password.trim().normalize("NFC");
  const hash: string = await bcrypt.hash(pass, 12);
  let token: string = crypto.randomBytes(32).toString("hex");

  try {
    //check for email uniqueness in both tables and non-expired emails  --- DONE
    const existingUnverifiedEmail = await db.query(
      "SELECT * FROM unverified_users WHERE email=$1 AND expires_at > NOW()",
      [req.body.email]
    );
    const existingActiveEmail = await db.query(
      "SELECT * FROM users WHERE email=$1",
      [req.body.email]
    );

    if (existingUnverifiedEmail.rows.length > 0) {
      // let's change the token to the existing db token and send an email again  --- DONE

      token = existingUnverifiedEmail.rows[0].token;
      const now = new Date();
      const lastSent = existingUnverifiedEmail.rows[0].last_email_sent_at;
      if (now.getTime() - lastSent.getTime() >= 5 * 1000) {
        // ~~~~~~~~ add * 60 to change back to 5 min ~~~~~~~ TODO
        await sendRegistrationEmail(req.body.email, token); // sendEmail must be awaited since emailSender is async --- DONE
      }
      res
        .status(302)
        .json({ message: "already signed up, needs verification" });
      return;
      // we might want to add a timer for the next email to be sent, maybe add it to the verify page --- DONE
    } else if (existingActiveEmail.rows.length > 0) {
      res.status(409).json({
        message:
          "An account with this email already exist. Please log in or reset your password",
      });
      return;
      // active user message with hyperlink for forgot password -- we can prob just produce an error message/ alert and suggest to login or reset password
    } else {
      await db.query(
        "INSERT INTO unverified_users (email, password, first_name, last_name, token, expires_at, last_email_sent_at) VALUES ($1, $2, $3, $4, $5, NOW()+ interval '1 hour', NOW())",
        [req.body.email, hash, req.body.firstName, req.body.lastName, token]
      );
      await sendRegistrationEmail(req.body.email, token);
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
            "INSERT INTO users (email, password, first_name, last_name) SELECT email, password, first_name, last_name FROM unverified_users WHERE token=$1",
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
        res.redirect(302, `${BASE_URL}/verify-email?verified=success`);
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

router.post("/login", async (req, res, next) => {
  const email = req.body.email;
  try {
    const foundUser = await db.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);

    if (foundUser.rows.length === 0) {
      res.sendStatus(401);
      return;
    } else {
      const storedHash = foundUser.rows[0].password;
      const userInput: string = req.body.password.trim().normalize("NFC");
      const isMatch = await bcrypt.compare(userInput, storedHash);
      if (!isMatch) {
        res.status(401).json({ message: "wrong login" });
        return;
      } else {
        const token = jwt.sign(
          {
            id: String(foundUser.rows[0].id),
            //name: foundUser.rows[0].first_name,    Prob don't need this either
            //email: foundUser.rows[0].email,      NOT SURE IF I SHOULD OR NEED TO SEND
          },
          SECRET,
          { expiresIn: "1h" }
        );
        res.status(200).json({ message: "Success!", token });
        return;
      }
    }
  } catch (err) {
    next(err);
  }
});

router.post("/resend-verification", async (req, res, next) => {
  try {
    const existingUnverifiedUser = await db.query(
      "SELECT * FROM unverified_users WHERE email=$1 AND expires_at > NOW()",
      [req.body.email]
    );
    if (existingUnverifiedUser.rows.length > 0) {
      const now = new Date();
      const lastSent = existingUnverifiedUser.rows[0].last_email_sent_at;
      if (now.getTime() - lastSent.getTime() >= 5 * 1000) {
        // change this back in production to 5 minutes!! (just add * 60)
        await sendRegistrationEmail(
          req.body.email,
          existingUnverifiedUser.rows[0].token
        );
        res.redirect(200, `${BASE_URL}/verify-email`);
        return;
      } else {
        res.status(429).json({ message: "Please wait before resending" });
        return;
      }
    } else {
      res.status(400).json({
        message:
          "User does not exist / is expired / already verified - try signing up again to confirm",
      });
      return;
    }
  } catch (err) {
    next(err);
  }
});

router.post("/send-password-reset-link", async (req, res, next) => {
  try {
    const email = req.body.email;
    const result = await db.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);

    if (result.rows.length < 1) {
      res.sendStatus(400);
      return;
    }
    const token: string = crypto.randomBytes(32).toString("hex");

    await db.query("INSERT INTO password_reset (token, email) VALUES ($1,$2)", [
      token,
      email,
    ]);

    await emailSender(
      email,
      `${appName}: Reset Password`,
      "Password reset link",
      BACKEND_BASE_URL,
      "reset-password",
      token
    );
    res.sendStatus(200);
    return;
  } catch (err) {
    next(err);
  }
  //does email exists in users db queries -- DONE
  // create new crypto token -- DONE
  // add to reset password db and a 15 min expiration -- DONE
  // send email with a link to the front end reset-password page url should have the token as a query! -- DONE
});

router.get("/reset-password", async (req, res, next) => {
  try {
    const token = req.query.token as string; // this is type assertion "trust me it's a string"
    const foundUser = await db.query(
      "SELECT * FROM password_reset WHERE token=$1",
      [token]
    );
    const checkExpired = await db.query(
      "SELECT * FROM password_reset WHERE token=$1 AND expires_at > NOW()",
      [token]
    );

    if (foundUser.rows.length < 1) {
      res.redirect(
        302,
        `${BASE_URL}/send-reset-link-to-email?err=failed-verification`
      );
    } else {
      if (checkExpired.rows.length < 1) {
        const email = foundUser.rows[0].email;
        res.redirect(
          302,
          `${BASE_URL}/send-reset-link-to-email?err=failed-verification&email=${email}`
        );
      } else {
        res.redirect(302, `${BASE_URL}/reset-password?token=${token}`);
      }
    }
  } catch (err) {
    next(err);
  }
});

router.post("/reset-password", async (req, res, next) => {
  const { password, token } = req.body;
  try {
    const existingReset = await db.query(
      "SELECT * FROM password_reset WHERE token=$1 AND expires_at > NOW()",
      [token]
    );
    if (existingReset.rows.length < 1) {
      const expiredEmail = await db.query(
        "SELECT * FROM password_reset WHERE token=$1",
        [token]
      );
      const sendExpEmail = expiredEmail?.rows[0]?.email || "";
      res.status(401).json({ email: sendExpEmail });
      return;
    }

    const pass: string = password.trim().normalize("NFC");

    if (!isValidPassword(pass)) {
      res.sendStatus(400);
      return;
    }

    const email = existingReset.rows[0].email;
    const currentUser = await db.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);
    const currentHash = currentUser.rows[0].password;

    const samePassword = await bcrypt.compare(pass, currentHash);

    if (samePassword) {
      res.status(422).json({ message: "Cannot resuse old password" });
      return;
    }

    console.log(pass);
    const hash = await bcrypt.hash(pass, 12);
    console.log(hash);

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE users SET password=$1 WHERE email=$2", [
        hash,
        email,
      ]);
      await client.query("DELETE FROM password_reset WHERE token=$1", [token]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    res.sendStatus(200);
    return;
  } catch (err) {
    next(err);
  }
});

//router.post("/refresh"); // to - do for refreshing exp auth tokens using refresh token in http cookies.

export default router;
