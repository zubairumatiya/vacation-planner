"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var router = express_1.default.Router();
var db_js_1 = require("../db/db.js");
var bcrypt_1 = require("bcrypt");
//import { v4 as createUUID } from "uuid";
var crypto_1 = require("crypto");
var dotenv_1 = require("dotenv");
var jsonwebtoken_1 = require("jsonwebtoken");
var passwordUtils_js_1 = require("../../shared/passwordUtils.js");
var emailUtils_js_1 = require("../../shared/emailUtils.js");
var emailSender_js_1 = require("../helpers/emailSender.js");
dotenv_1.default.config();
var BASE_URL = process.env.NODE_ENV === "production"
    ? process.env.PROD_URL
    : process.env.DEV_URL;
var appName = process.env.APP_NAME;
var BACKEND_BASE_URL = process.env.BACKEND_BASE_URL;
if (process.env.SIGNATURE === undefined) {
    throw new Error("SIGNATURE is undefined");
}
var SECRET = process.env.SIGNATURE;
var registerSubj = "".concat(appName, ": Verify Your Email Address");
var sendRegistrationEmail = function (userEmail, passToken) {
    return (0, emailSender_js_1.emailSender)(userEmail, registerSubj, "Verification Link:", BACKEND_BASE_URL, "verify", passToken);
};
router.post("/signup", function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var pass, hash, token, existingUnverifiedEmail, existingActiveEmail, now, lastSent, err_1, pgErr;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (req.body.password) {
                    //insert password criteria verfication (can't be null, etc) --- DONE
                    if (!(0, passwordUtils_js_1.isValidPassword)(req.body.password) || req.body.password === null) {
                        res.status(400).json({ message: "invalid password criteria" });
                        return [2 /*return*/];
                    }
                }
                if (req.body.email) {
                    if (!(0, emailUtils_js_1.isValidEmail)(req.body.email) || req.body.email === null) {
                        res.status(400).json({ message: "invalid email input" });
                        return [2 /*return*/];
                    }
                }
                pass = req.body.password.trim().normalize("NFC");
                return [4 /*yield*/, bcrypt_1.default.hash(pass, 12)];
            case 1:
                hash = _a.sent();
                token = crypto_1.default.randomBytes(32).toString("hex");
                _a.label = 2;
            case 2:
                _a.trys.push([2, 12, , 13]);
                return [4 /*yield*/, db_js_1.default.query("SELECT * FROM unverified_users WHERE email=$1 AND expires_at > NOW()", [req.body.email])];
            case 3:
                existingUnverifiedEmail = _a.sent();
                return [4 /*yield*/, db_js_1.default.query("SELECT * FROM users WHERE email=$1", [req.body.email])];
            case 4:
                existingActiveEmail = _a.sent();
                if (!(existingUnverifiedEmail.rows.length > 0)) return [3 /*break*/, 7];
                // let's change the token to the existing db token and send an email again  --- DONE
                token = existingUnverifiedEmail.rows[0].token;
                now = new Date();
                lastSent = existingUnverifiedEmail.rows[0].last_email_sent_at;
                if (!(now.getTime() - lastSent.getTime() >= 5 * 60 * 1000)) return [3 /*break*/, 6];
                return [4 /*yield*/, sendRegistrationEmail(req.body.email, token)];
            case 5:
                _a.sent(); // sendEmail must be awaited since emailSender is async --- DONE
                _a.label = 6;
            case 6: return [3 /*break*/, 11];
            case 7:
                if (!(existingActiveEmail.rows.length > 0)) return [3 /*break*/, 8];
                res.status(409).json({
                    message: "An account with this email already exist. Please log in or reset your password",
                });
                return [3 /*break*/, 11];
            case 8: return [4 /*yield*/, db_js_1.default.query("INSERT INTO unverified_users (email, password, first_name, last_name, uuid, expires_at) VALUES ($1, $2, $3, $4, $5, NOW()+ interval '1 hour')", [req.body.email, hash, req.body.firstName, req.body.lastName, token])];
            case 9:
                _a.sent();
                return [4 /*yield*/, sendRegistrationEmail(req.body.email, token)];
            case 10:
                _a.sent();
                res.status(200).json({ message: "success" });
                _a.label = 11;
            case 11: return [3 /*break*/, 13];
            case 12:
                err_1 = _a.sent();
                pgErr = err_1;
                if (pgErr.code === "23505") {
                    console.log("email already exists");
                }
                next(err_1);
                return [3 /*break*/, 13];
            case 13: return [2 /*return*/];
        }
    });
}); });
router.get("/verify", function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var token, checkExpiration, client, err_2, err_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                token = req.query.token;
                if (!token) return [3 /*break*/, 17];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 15, , 16]);
                return [4 /*yield*/, db_js_1.default.query("SELECT * FROM unverified_users WHERE token=$1 AND expires_at > NOW()", [token])];
            case 2:
                checkExpiration = _a.sent();
                if (!(checkExpiration.rows.length === 0)) return [3 /*break*/, 3];
                res.status(400).json({ message: "token not found or expired token" });
                return [2 /*return*/];
            case 3: return [4 /*yield*/, db_js_1.default.connect()];
            case 4:
                client = _a.sent();
                _a.label = 5;
            case 5:
                _a.trys.push([5, 10, 12, 13]);
                return [4 /*yield*/, client.query("BEGIN")];
            case 6:
                _a.sent();
                return [4 /*yield*/, client.query("INSERT INTO users (email, password, first_name, last_name) FROM unverified_users WHERE token=$1", [token])];
            case 7:
                _a.sent();
                return [4 /*yield*/, client.query("DELETE FROM unverified_users WHERE token=$1", [
                        token,
                    ])];
            case 8:
                _a.sent();
                return [4 /*yield*/, client.query("COMMIT")];
            case 9:
                _a.sent();
                return [3 /*break*/, 13];
            case 10:
                err_2 = _a.sent();
                return [4 /*yield*/, client.query("ROLLBACK")];
            case 11:
                _a.sent();
                throw err_2;
            case 12:
                client.release();
                return [7 /*endfinally*/];
            case 13:
                res.redirect(200, "".concat(BASE_URL, "/verify-email?verified=success"));
                _a.label = 14;
            case 14: return [3 /*break*/, 16];
            case 15:
                err_3 = _a.sent();
                next(err_3);
                return [3 /*break*/, 16];
            case 16: return [3 /*break*/, 18];
            case 17:
                res.status(401).json({
                    message: "broken token, try clicking the link again or create new account",
                });
                return [2 /*return*/];
            case 18: return [2 /*return*/];
        }
    });
}); });
router.post("/login", function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var email, foundUser, storedHash, userInput, isMatch, token, err_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                email = req.body.email;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 6, , 7]);
                return [4 /*yield*/, db_js_1.default.query("SELECT * FROM users WHERE email=$1", [
                        email,
                    ])];
            case 2:
                foundUser = _a.sent();
                if (!(foundUser.rows.length === 0)) return [3 /*break*/, 3];
                res.sendStatus(401);
                return [2 /*return*/];
            case 3:
                storedHash = foundUser.rows[0].password;
                userInput = req.body.password;
                return [4 /*yield*/, bcrypt_1.default.compare(userInput, storedHash)];
            case 4:
                isMatch = _a.sent();
                if (!isMatch) {
                    res.status(401).json({ message: "wrong login" });
                    return [2 /*return*/];
                }
                else {
                    token = jsonwebtoken_1.default.sign({
                        id: foundUser.rows[0].id,
                        email: foundUser.rows[0].email,
                    }, SECRET, { expiresIn: "1h" });
                    res.status(200).json({ message: "Success!", token: token });
                    return [2 /*return*/];
                }
                _a.label = 5;
            case 5: return [3 /*break*/, 7];
            case 6:
                err_4 = _a.sent();
                next(err_4);
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
router.post("/resend-verification", function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var existingUnverifiedUser, now, lastSent, err_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 7, , 8]);
                return [4 /*yield*/, db_js_1.default.query("SELECT * FROM unverified_users WHERE email=$1 AND expires_at > NOW()", [req.body.email])];
            case 1:
                existingUnverifiedUser = _a.sent();
                if (!(existingUnverifiedUser.rows.length > 0)) return [3 /*break*/, 5];
                now = new Date();
                lastSent = existingUnverifiedUser.rows[0].last_email_sent_at;
                if (!(now.getTime() - lastSent.getTime() >= 5 * 60 * 1000)) return [3 /*break*/, 3];
                return [4 /*yield*/, sendRegistrationEmail(req.body.email, existingUnverifiedUser.rows[0].token)];
            case 2:
                _a.sent();
                res.redirect(200, "".concat(BASE_URL, "/verify-email"));
                return [2 /*return*/];
            case 3:
                res.status(429).json({ message: "Please wait before resending" });
                return [2 /*return*/];
            case 4: return [3 /*break*/, 6];
            case 5:
                res.status(400).json({
                    message: "User does not exist / is expired / already verified - try signing up again to confirm",
                });
                return [2 /*return*/];
            case 6: return [3 /*break*/, 8];
            case 7:
                err_5 = _a.sent();
                next(err_5);
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
router.post("send-password-reset-link", function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var email, result, token, err_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                email = req.body.email;
                return [4 /*yield*/, db_js_1.default.query("SELECT * FROM users WHERE email=$1", [
                        email,
                    ])];
            case 1:
                result = _a.sent();
                if (result.rows[0].length < 1) {
                    res.sendStatus(400);
                    return [2 /*return*/];
                }
                token = crypto_1.default.randomBytes(32).toString("hex");
                return [4 /*yield*/, db_js_1.default.query("INSERT INTO password_reset (token, email) VALUES ($1,$2)", [
                        token,
                        email,
                    ])];
            case 2:
                _a.sent();
                return [4 /*yield*/, (0, emailSender_js_1.emailSender)(email, "".concat(appName, ": Reset Password"), "Password reset link", BASE_URL, "reset-password", token)];
            case 3:
                _a.sent();
                res.sendStatus(200);
                return [2 /*return*/];
            case 4:
                err_6 = _a.sent();
                next(err_6);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.post("/reset-passsword", function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, password, token, existingReset, email, hash, err_7;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, password = _a.password, token = _a.token;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, db_js_1.default.query("SELECT * FROM password_reset WHERE token=$1 AND expires_at > NOW()", [token])];
            case 2:
                existingReset = _b.sent();
                if (existingReset.rows[0].length < 1) {
                    res.sendStatus(400);
                    return [2 /*return*/];
                }
                if (!(0, passwordUtils_js_1.isValidPassword)(password)) {
                    res.sendStatus(400);
                    return [2 /*return*/];
                }
                email = existingReset.rows[0].email;
                hash = bcrypt_1.default.hash(password, 12);
                return [4 /*yield*/, db_js_1.default.query("UPDATE users SET password=$1 WHERE email=$2", [
                        hash,
                        email,
                    ])];
            case 3:
                _b.sent();
                res.sendStatus(200);
                return [2 /*return*/];
            case 4:
                err_7 = _b.sent();
                next(err_7);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
