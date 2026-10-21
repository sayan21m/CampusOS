import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { getAdminOverviewController } from "../controllers/overview.controller.js";

const router = express.Router();

router.get(
  "/overview",
  authenticate,
  authorize("ADMIN"),
  getAdminOverviewController
);

export default router;
