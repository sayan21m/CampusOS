import path from "node:path";
import {
  getMyProfile,
  getProfilePhoto,
  listEmailPreferences,
  listMyActivity,
  saveProfilePhoto,
  updateEmailPreferences,
} from "../services/profile.service.js";
import { validateProfilePhoto } from "../validators/profile.validator.js";
import { safeDownloadName } from "../services/file-storage.service.js";

export async function getMyProfileController(req, res) {
  try {
    const profile = await getMyProfile(req.user.userId);

    return res.status(200).json({
      profile,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function uploadProfilePhotoController(req, res) {
  try {
    const fileValidation = validateProfilePhoto(req.file);
    if (!fileValidation.success) {
      return res.status(400).json({
        message: fileValidation.message,
      });
    }

    const result = await saveProfilePhoto(req.user.userId, req.file);

    return res.status(200).json({
      message: "Profile photo updated",
      ...result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function getProfilePhotoController(req, res) {
  try {
    const { absolutePath, storageKey } = await getProfilePhoto(req.user.userId);
    const extension = path.extname(storageKey || "").toLowerCase();
    const filename = safeDownloadName("profile-photo", extension);

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");

    return res.sendFile(absolutePath, { headers: { "Content-Disposition": `inline; filename="${filename}"` } }, (error) => {
      if (error && !res.headersSent) {
        console.error("Profile photo send failed:", error);
        res.status(500).json({
          message: "Unable to load profile photo",
        });
      } else if (error) {
        console.error("Profile photo stream failed:", error);
      }
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function getEmailPreferencesController(req, res) {
  try {
    const preferences = await listEmailPreferences(req.user.userId);

    return res.status(200).json({
      preferences,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function updateEmailPreferencesController(req, res) {
  try {
    const preferences = await updateEmailPreferences(
      req.user.userId,
      req.body.preferences
    );

    return res.status(200).json({
      message: "Email preferences updated",
      preferences,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function getActivityLogController(req, res) {
  try {
    const activity = await listMyActivity(req.user.userId, req.query);

    return res.status(200).json({
      activity,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}
