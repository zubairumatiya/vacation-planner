import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();
const SECRET = process.env.SIGNATURE;
export default function ensureLoggedIn(req, res, next) {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            console.log("no token!! ~~~~~ console logging");
            res.status(401).json({ message: "Token not found" });
            return;
        }
        if (!SECRET) {
            res
                .status(501)
                .json({ message: "Unable to Authenticate Token, check secret" });
            return;
        }
        const decodedToken = jwt.verify(token, SECRET);
        req.user = decodedToken;
        next();
    }
    catch (err) {
        if (err.name === "TokenExpiredError") {
            console.log("token expired --- console logging");
            res.status(401).json({ error: "TokenExpired" });
            return;
        }
        next(err);
    }
}
