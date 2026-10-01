import express from "express";
import { createFacultyController } from "../controllers/faculty.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { createFacultySchema } from "../validators/faculty.validator.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("ADMINISTRATOR"),
  validate(createFacultySchema),
  createFacultyController
);

export default router;
