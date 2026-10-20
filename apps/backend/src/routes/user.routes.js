import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { uploadCsvFile } from "../middleware/upload.middleware.js";
import {
  adminResetPasswordSchema,
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
} from "../validators/user.validator.js";
import {
  activateUserController,
  adminResetPasswordController,
  bulkCreateUsersController,
  createUserController,
  deactivateUserController,
  getUserByIdController,
  listUsersController,
  updateUserController,
} from "../controllers/user.controller.js";

const router = express.Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/", validate(listUsersQuerySchema, "query"), listUsersController);
router.post("/", validate(createUserSchema), createUserController);
router.post("/bulk-csv", uploadCsvFile, bulkCreateUsersController);
router.get("/:id", getUserByIdController);
router.patch("/:id", validate(updateUserSchema), updateUserController);
router.patch("/:id/deactivate", deactivateUserController);
router.patch("/:id/activate", activateUserController);
router.post(
  "/:id/reset-password",
  validate(adminResetPasswordSchema),
  adminResetPasswordController
);

export default router;
