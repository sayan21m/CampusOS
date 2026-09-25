import prisma from "../config/db.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { generateToken } from "../utils/jwt.js";
import crypto from "crypto";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const EXPIRE_DURATION_MS = 60 * 60 * 1000;

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

  const passwordValid = await verifyPassword(password, user.passwordHash);

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

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({
    where: {
      user_id: userId,
    },
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new Error("Account temporarily locked. Try again later.");
  }

  const passwordValid = await verifyPassword(currentPassword, user.passwordHash);

  if (!passwordValid) {
    throw new Error("Current password is incorrect");
  }

  const newPasswordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: {
      user_id: user.user_id,
    },
    data: {
      passwordHash: newPasswordHash,
    },
  });

  return {
    message: "Password changed successfully",
  };
}

export async function forgotPassword(email) {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new Error("Invalid email");
  }

  const existingToken = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.user_id,
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (existingToken) {
    throw new Error("A password reset token is already active");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  await prisma.passwordResetToken.create({
    data: {
      tokenHash: tokenHash,
      userId: user.user_id,
      expiresAt: new Date(Date.now() + EXPIRE_DURATION_MS),
    },
  });

  return {
    token: token,
  };
}

export async function resetPassword(token, newPassword) {
  const tokenHashCheck = crypto.createHash("sha256").update(token).digest("hex");

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: {
      tokenHash: tokenHashCheck,
    },
  });

  if (!resetToken) {
    throw new Error("Invalid reset token");
  }

  if (resetToken.usedAt) {
    throw new Error("Reset token has already been used");
  }

  if (resetToken.expiresAt < new Date()) {
    throw new Error("Reset token has expired");
  }

  const newPasswordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: {
      user_id: resetToken.userId,
    },
    data: {
      passwordHash: newPasswordHash,
    },
  });

  await prisma.passwordResetToken.update({
    where: {
      id: resetToken.id,
    },
    data: {
      usedAt: new Date(),
    },
  });

  return {
    message: "Password reset successfully",
  };
}
