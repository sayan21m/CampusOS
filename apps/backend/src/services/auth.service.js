import prisma from "../config/db.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { generateToken } from "../utils/jwt.js";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export async function registerUser({ name, email, password }) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw createError("User already exists", 409);
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "STUDENT",
    },
  });

  return {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw createError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw createError("Account is deactivated", 403);
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);

  if (!passwordValid) {
    throw createError("Invalid email or password", 401);
  }

  await prisma.user.update({
    where: {
      user_id: user.user_id,
    },
    data: {
      lastLogin: new Date(),
    },
  });

  const token = generateToken(user);

  return {
    token,
    user: {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}
