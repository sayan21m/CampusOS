import express from "express";
import { register, login, changePasswordController } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import {
    registerSchema,
    loginSchema,
    changePasswordSchema,
} from "../validators/auth.validator.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.patch("/password", authenticate, validate(changePasswordSchema), changePasswordController)

export default router;