import bcrypt from "bcrypt"

const SALT_ROUNDS = 12;

export async function hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password, passwordHash) {
    return await bcrypt.compare(password, passwordHash);
}