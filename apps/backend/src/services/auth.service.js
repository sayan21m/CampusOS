import prisma from "../config/db.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { generateToken } from "../utils/jwt.js";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

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
      throw new Error("Invalid email or password");
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new Error("Account temporarily locked. Try again later.");
  }

  const passwordValid = await verifyPassword(
      password,
      user.passwordHash,
  );

  if (!passwordValid) {
      const failedAttempts = user.failedLoginAttempts + 1;

      if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
          await prisma.user.update({
              where: {
                  user_id: user.user_id,
              },
              data: {
                  failedLoginAttempts: failedAttempts,
                  lockedUntil: new Date(Date.now() + LOCK_DURATION_MS),
              },
          });

          throw new Error("Account temporarily locked. Try again later.");
      }

      await prisma.user.update({
          where: {
              user_id: user.user_id,
          },
          data: {
              failedLoginAttempts: failedAttempts,
          },
      });

      throw new Error("Invalid email or password");
  }

  await prisma.user.update({
      where: {
          user_id: user.user_id,
      },
      data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
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