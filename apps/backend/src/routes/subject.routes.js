import express from "express";
import { createSubjectController } from "../controllers/subject.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { createSubjectSchema } from "../validators/subject.validator.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createSubjectSchema),
  createSubjectController
);

export default router;
