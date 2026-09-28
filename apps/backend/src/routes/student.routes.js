import express from "express";
import { createStudentController } from "../controllers/student.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { createStudentSchema } from "../validators/student.validator.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("ADMINISTRATOR"),
  validate(createStudentSchema),
  createStudentController
);

export default router;
