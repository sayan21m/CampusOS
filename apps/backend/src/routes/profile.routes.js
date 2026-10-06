import express from "express";
import { getMyProfileController } from "../controllers/profile.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", authenticate, getMyProfileController);

export default router;
