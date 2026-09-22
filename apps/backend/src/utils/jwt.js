import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET;

export function generateToken(user) {
    return jwt.sign(
        {
            userId: user.user_id,
            role: user.role
        }, JWT_SECRET,
        {expiresIn: "1h"},
    );
}

export function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}