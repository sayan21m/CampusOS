import { listUsersQuerySchema } from "../validators/user.validator.js";
import {
  adminResetPassword,
  bulkCreateUsersFromCsv,
  createUserWithProfile,
  getUserById,
  listUsers,
  setUserActive,
  updateUser,
} from "../services/user.service.js";

export async function listUsersController(req, res) {
  try {
    const parsed = listUsersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path[0],
          message: issue.message,
        })),
      });
    }

    const users = await listUsers(parsed.data);
    return res.status(200).json({
      message: "Users retrieved successfully",
      count: users.length,
      users,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function getUserByIdController(req, res) {
  try {
    const user = await getUserById(req.params.id);
    return res.status(200).json({
      message: "User retrieved successfully",
      user,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function createUserController(req, res) {
  try {
    const user = await createUserWithProfile(req.body);
    return res.status(201).json({
      message: "User created successfully",
      user,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function updateUserController(req, res) {
  try {
    const user = await updateUser(req.params.id, req.body, {
      userId: req.user?.userId,
    });
    return res.status(200).json({
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function deactivateUserController(req, res) {
  try {
    const user = await setUserActive(req.params.id, false);
    return res.status(200).json({
      message: "User deactivated successfully",
      user,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function activateUserController(req, res) {
  try {
    const user = await setUserActive(req.params.id, true);
    return res.status(200).json({
      message: "User activated successfully",
      user,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function adminResetPasswordController(req, res) {
  try {
    const result = await adminResetPassword(req.params.id, req.body.newPassword);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function bulkCreateUsersController(req, res) {
  try {
    let csvText = req.body?.csv;

    if (req.file?.buffer) {
      csvText = req.file.buffer.toString("utf8");
    }

    const result = await bulkCreateUsersFromCsv(csvText);
    return res.status(result.failed_count > 0 && result.created_count === 0 ? 400 : 201).json({
      message: "CSV bulk user import completed",
      ...result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}
