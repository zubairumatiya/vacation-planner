import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();
const SECRET = process.env.SIGNATURE;
export default function ensureLoggedIn(req, res, next) {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Token not found" });
        }
        if (!SECRET) {
            return res
                .status(501)
                .json({ message: "Unable to Authenticate Token, check secret" });
        }
        const decodedToken = jwt.verify(token, SECRET);
        const user = decodedToken;
        req.user = user;
    }
    catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ error: "TokenExpired " });
        }
        next(err);
    }
}
