import { verifyToken } from "../utils/jwt.js";

export function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        const [scheme, token] = authHeader.split(" ");

        if (scheme !== "Bearer" || !token) {
            return res.status(401).json({
                message: "Invalid authorization header",
            });
        }

        const payload = verifyToken(token);
        req.user = payload;
        next();
    } catch {
        return res.status(401).json({
            message: "Invalid or expired token",
        });
    }
}