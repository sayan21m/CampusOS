import express from "express";
import {
  createDepartmentController,
  getDepartmentsController,
  getDepartmentByIdController,
  updateDepartmentController,
} from "../controllers/department.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
} from "../validators/department.validator.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("ADMINISTRATOR"),
  validate(createDepartmentSchema),
  createDepartmentController
);
router.get("/", authenticate, getDepartmentsController);
router.get("/:id", authenticate, getDepartmentByIdController);
router.patch(
  "/:id",
  authenticate,
  authorize("ADMINISTRATOR"),
  validate(updateDepartmentSchema),
  updateDepartmentController
);

export default router;
