import express, { NextFunction } from "express";
const router = express.Router();
import db from "../db/db.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { isValidPassword } from "../../shared/passwordUtils.js";
import { isValidEmail } from "../../shared/emailUtils.js";
import { emailSender } from "../helpers/emailSender.js";
import createNewRefreshToken from "../helpers/createNewRefreshToken.js";
import * as cookie from "cookie";
import { QueryResult } from "pg";
import {
  SignUpBody,
  LoginBody,
  AuthResponse,
  User,
  UnverifiedUser,
  RefreshTokenRow,
  TypedRequest,
  TypedResponse,
  ResendVerificationBody,
  ResetPasswordLinkBody,
  ResetPasswordBody,
  PasswordResetRow,
  PgError,
  CustomJwtPayload,
  VerifyQuery,
  ResetPasswordQuery,
} from "../types/express.js";

dotenv.config();

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
const SECRET2 = process.env.SIGNATURE2!;

const registerSubj = `${appName}: Verify Your Email Address`;
const sendRegistrationEmail = (
  userEmail: string,
  passToken: string,
): Promise<void> =>
  emailSender(
    userEmail,
    registerSubj,
    "Verification Link",
    BACKEND_BASE_URL,
    "verify",
    passToken,
  );

router.post(
  "/signup",
  async (
    req: TypedRequest<SignUpBody>,
    res: TypedResponse<AuthResponse>,
    next: NextFunction,
  ) => {
    const { email, password, firstName, lastName } = req.body;

    if (!password || !isValidPassword(password)) {
      res.status(400).json({ message: "invalid password criteria" });
      return;
    }

    if (!email || !isValidEmail(email)) {
      res.status(400).json({ message: "invalid email input" });
      return;
    }

    const pass: string = password.trim().normalize("NFC");
    const hash: string = await bcrypt.hash(pass, 12);
    let token: string = crypto.randomBytes(32).toString("hex");

    try {
      const existingUnverifiedEmail: QueryResult<UnverifiedUser> =
        await db.query(
          "SELECT * FROM unverified_users WHERE email=$1 AND expires_at > NOW()",
          [email],
        );
      const existingActiveEmail: QueryResult<User> = await db.query(
        "SELECT * FROM users WHERE email=$1",
        [email],
      );

      if (existingUnverifiedEmail.rows.length > 0) {
        token = existingUnverifiedEmail.rows[0].token;
        const now = new Date();
        const lastSent = existingUnverifiedEmail.rows[0].last_email_sent_at;
        if (now.getTime() - lastSent.getTime() >= 10 * 60 * 1000) {
          await sendRegistrationEmail(email, token);
        }
        res
          .status(302)
          .json({ message: "already signed up, needs verification" });
        return;
      } else if (existingActiveEmail.rows.length > 0) {
        res.status(409).json({
          message:
            "An account with this email already exist. Please log in or reset your password",
        });
        return;
      } else {
        await db.query(
          "INSERT INTO unverified_users (email, password, first_name, last_name, token, expires_at, last_email_sent_at) VALUES ($1, $2, $3, $4, $5, NOW()+ interval '1 hour', NOW())",
          [email, hash, firstName, lastName, token],
        );
        await sendRegistrationEmail(email, token);
        res.status(200).json({ message: "success" });
      }
    } catch (err) {
      const pgErr = err as PgError;
      if (pgErr.code === "23505") {
        console.log("email already exists");
      }
      next(err);
    }
  },
);

router.get(
  "/verify",
  async (
    req: TypedRequest<unknown, VerifyQuery>,
    res: TypedResponse<AuthResponse>,
    next: NextFunction,
  ) => {
    const token = req.query.token;
    if (token) {
      try {
        const checkExpiration: QueryResult<UnverifiedUser> = await db.query(
          "SELECT * FROM unverified_users WHERE token=$1 AND expires_at > NOW()",
          [token],
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
              [token],
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
  },
);

router.post(
  "/auth/login",
  async (
    req: TypedRequest<LoginBody>,
    res: TypedResponse<AuthResponse>,
    next: NextFunction,
  ) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "email and password are required" });
      return;
    }

    try {
      const foundUser: QueryResult<User> = await db.query(
        "SELECT * FROM users WHERE email=$1",
        [email],
      );

      if (foundUser.rows.length === 0) {
        res.sendStatus(401);
        return;
      } else {
        const storedHash = foundUser.rows[0].password!;
        const userInput: string = password.trim().normalize("NFC");
        const isMatch = await bcrypt.compare(userInput, storedHash);
        if (!isMatch) {
          res.status(401).json({ message: "wrong login" });
          return;
        } else {
          const token = jwt.sign(
            {
              id: String(foundUser.rows[0].id),
            },
            SECRET,
            { expiresIn: "1h" },
          );
          const refToken = await createNewRefreshToken(
            String(foundUser.rows[0].id),
          );
          res
            .cookie("refreshToken", refToken, {
              httpOnly: true,
              secure: true, //process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/auth",
              maxAge: 7 * 24 * 60 * 60 * 1000,
            })
            .status(200)
            .json({ message: "Success!", token });
          return;
        }
      }
    } catch (err) {
      console.log(err);
      next(err);
    }
  },
);

router.post(
  "/auth/logout",
  async (
    req: TypedRequest,
    res: TypedResponse<AuthResponse>,
    next: NextFunction,
  ) => {
    try {
      const cookieHeader = req.headers.cookie;
      if (!cookieHeader) {
        res.sendStatus(401);
        return;
      }
      const cookies = cookie.parse(cookieHeader);
      const refToken = cookies.refreshToken;
      const decodedRefToken = jwt.decode(refToken) as CustomJwtPayload | null;
      if (decodedRefToken && decodedRefToken.jti) {
        await db.query(
          "UPDATE refresh_tokens SET revoked=$1 WHERE jti=$2 RETURNING *",
          [true, decodedRefToken.jti],
        );
        res
          .clearCookie("refreshToken", {
            httpOnly: true,
            secure: true, //process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/auth",
            maxAge: 7 * 24 * 60 * 60 * 1000,
          })
          .sendStatus(200);

        return;
      } else {
        res
          .clearCookie("refreshToken", {
            httpOnly: true,
            secure: true, //process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/auth",
            maxAge: 7 * 24 * 60 * 60 * 1000,
          })
          .sendStatus(200);
        return;
      }
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/auth/refresh",
  async (
    req: TypedRequest,
    res: TypedResponse<AuthResponse>,
    next: NextFunction,
  ) => {
    try {
      const cookieHeader = req.headers.cookie;
      if (!cookieHeader) {
        res.sendStatus(401);
        return;
      }
      const cookies = cookie.parse(cookieHeader);
      const refToken = cookies.refreshToken;
      if (!refToken) {
        res.sendStatus(401);
        return;
      }
      const decodedRefToken = jwt.verify(refToken, SECRET2) as CustomJwtPayload;
      if (decodedRefToken && decodedRefToken.jti) {
        const result: QueryResult<RefreshTokenRow> = await db.query(
          "UPDATE refresh_tokens SET revoked=$1 WHERE jti=$2 AND revoked=FALSE RETURNING *",
          [true, decodedRefToken.jti],
        );
        if (result.rowCount !== null && result.rowCount < 1) {
          res.status(401).json({ error: "Could not find" }); // frontend receieves this in 401 request and will log user out
          return;
        }
        const exp = decodedRefToken.exp;
        const newRefToken = await createNewRefreshToken(
          String(decodedRefToken.sub),
          exp,
        );
        if (newRefToken == null) {
          res.sendStatus(500);
          return;
        }
        const token = jwt.sign(
          {
            id: String(decodedRefToken.sub),
          },
          SECRET,
          { expiresIn: "1h" },
        );
        res
          .status(200)
          .cookie("refreshToken", newRefToken, {
            httpOnly: true,
            secure: true, //process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/auth",
            maxAge: 7 * 24 * 60 * 60 * 1000,
          })
          .json({ token });
        return;
      } else {
        res.sendStatus(500);
        return;
      }
    } catch (err) {
      if (err instanceof Error && err.name === "TokenExpiredError") {
        console.log("token expired --- logging");
        res.status(401).json({ error: "TokenExpired" });
        return;
      }
      console.log(err);
      next(err);
    }
  },
);

router.post(
  "/resend-verification",
  async (
    req: TypedRequest<ResendVerificationBody>,
    res: TypedResponse<AuthResponse>,
    next: NextFunction,
  ) => {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: "email is required" });
      return;
    }
    try {
      const existingUnverifiedUser: QueryResult<UnverifiedUser> =
        await db.query(
          "SELECT * FROM unverified_users WHERE email=$1 AND expires_at > NOW()",
          [email],
        );
      if (existingUnverifiedUser.rows.length > 0) {
        const now = new Date();
        const lastSent = existingUnverifiedUser.rows[0].last_email_sent_at;
        if (now.getTime() - lastSent.getTime() >= 5 * 1000) {
          // change this back in production to 5 minutes!! (just add * 60)
          await sendRegistrationEmail(
            email,
            existingUnverifiedUser.rows[0].token,
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
  },
);

router.post(
  "/send-password-reset-link",
  async (
    req: TypedRequest<ResetPasswordLinkBody>,
    res: TypedResponse<AuthResponse>,
    next: NextFunction,
  ) => {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: "email is required" });
      return;
    }
    try {
      const result: QueryResult<User> = await db.query(
        "SELECT * FROM users WHERE email=$1",
        [email],
      );

      if (result.rows.length < 1) {
        res.sendStatus(400);
        return;
      }
      const token: string = crypto.randomBytes(32).toString("hex");

      await db.query(
        "INSERT INTO password_reset (token, email) VALUES ($1,$2)",
        [token, email],
      );

      await emailSender(
        email,
        `${appName}: Reset Password`,
        "Password reset link",
        BACKEND_BASE_URL,
        "reset-password",
        token,
      );
      res.sendStatus(200);
      return;
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/reset-password",
  async (
    req: TypedRequest<unknown, ResetPasswordQuery>,
    res: TypedResponse<AuthResponse>,
    next: NextFunction,
  ) => {
    const token = req.query.token;
    if (!token) {
      res.redirect(
        302,
        `${BASE_URL}/send-reset-link-to-email?err=failed-verification`,
      );
      return;
    }
    try {
      const foundUser: QueryResult<PasswordResetRow> = await db.query(
        "SELECT * FROM password_reset WHERE token=$1",
        [token],
      );
      const checkExpired: QueryResult<PasswordResetRow> = await db.query(
        "SELECT * FROM password_reset WHERE token=$1 AND expires_at > NOW()",
        [token],
      );

      if (foundUser.rows.length < 1) {
        res.redirect(
          302,
          `${BASE_URL}/send-reset-link-to-email?err=failed-verification`,
        );
      } else {
        if (checkExpired.rows.length < 1) {
          const email = foundUser.rows[0].email;
          res.redirect(
            302,
            `${BASE_URL}/send-reset-link-to-email?err=failed-verification&email=${email}`,
          );
        } else {
          res.redirect(302, `${BASE_URL}/reset-password?token=${token}`);
        }
      }
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/reset-password",
  async (
    req: TypedRequest<ResetPasswordBody>,
    res: TypedResponse<AuthResponse>,
    next: NextFunction,
  ) => {
    const { password, token } = req.body;
    if (!password || !token) {
      res.status(400).json({ message: "password and token are required" });
      return;
    }
    try {
      const existingReset: QueryResult<PasswordResetRow> = await db.query(
        "SELECT * FROM password_reset WHERE token=$1 AND expires_at > NOW()",
        [token],
      );
      if (existingReset.rows.length < 1) {
        const expiredEmail: QueryResult<PasswordResetRow> = await db.query(
          "SELECT * FROM password_reset WHERE token=$1",
          [token],
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
      const currentUser: QueryResult<User> = await db.query(
        "SELECT * FROM users WHERE email=$1",
        [email],
      );
      const currentHash = currentUser.rows[0].password!;

      const samePassword = await bcrypt.compare(pass, currentHash);

      if (samePassword) {
        res.status(422).json({ message: "Cannot resuse old password" });
        return;
      }

      const hash = await bcrypt.hash(pass, 12);

      const client = await db.connect();
      try {
        await client.query("BEGIN");
        await client.query("UPDATE users SET password=$1 WHERE email=$2", [
          hash,
          email,
        ]);
        await client.query("DELETE FROM password_reset WHERE token=$1", [
          token,
        ]);
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
  },
);

export default router;
