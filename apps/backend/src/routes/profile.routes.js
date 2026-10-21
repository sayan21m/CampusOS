import express from "express";
import {
  getActivityLogController,
  getEmailPreferencesController,
  getMyProfileController,
  getProfilePhotoController,
  updateEmailPreferencesController,
  uploadProfilePhotoController,
} from "../controllers/profile.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { updatePreferencesSchema } from "../validators/profile.validator.js";
import { uploadProfilePhoto } from "../middleware/upload.middleware.js";

const router = express.Router();

router.get("/", authenticate, getMyProfileController);

router.post("/photo", authenticate, uploadProfilePhoto, uploadProfilePhotoController);
router.get("/photo", authenticate, getProfilePhotoController);

router.get("/preferences", authenticate, getEmailPreferencesController);
router.put(
  "/preferences",
  authenticate,
  validate(updatePreferencesSchema),
  updateEmailPreferencesController
);

router.get("/activity", authenticate, getActivityLogController);

export default router;
