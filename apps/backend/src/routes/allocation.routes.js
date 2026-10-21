import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createAllocationSchema,
  listAllocationsQuerySchema,
} from "../validators/allocation.validator.js";
import {
  createAllocationController,
  deleteAllocationController,
  listAllocationsController,
} from "../controllers/allocation.controller.js";

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "FACULTY"),
  validate(listAllocationsQuerySchema, "query"),
  listAllocationsController
);

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createAllocationSchema),
  createAllocationController
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  deleteAllocationController
);

export default router;
