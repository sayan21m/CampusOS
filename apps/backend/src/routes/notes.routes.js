import express from "express";
import { validate } from "../middleware/validate.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { uploadNotesFile } from "../middleware/upload.middleware.js";
import { notesMetadataSchema, replaceNotesSchema } from "../validators/notes.validator.js";
import { createNotesController, getNotesController, downloadNotesController, previewNotesController, replaceNotesController, deleteNotesController } from "../controllers/notes.controller.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("FACULTY"),
  uploadNotesFile,
  validate(notesMetadataSchema),
  createNotesController
);

router.get(
  "/subject/:subject_id/unit/:unit_number",
  authenticate,
  authorize("FACULTY", "STUDENT"),
  getNotesController
);

router.get(
  "/:notes_id/download",
  authenticate,
  authorize("FACULTY", "STUDENT"),
  downloadNotesController
);

router.get(
  "/:notes_id/preview",
  authenticate,
  authorize("FACULTY", "STUDENT"),
  previewNotesController
);

router.put(
    "/:notes_id",
    authenticate,
    authorize("FACULTY"),
    uploadNotesFile,
    validate(replaceNotesSchema),
    replaceNotesController
);

router.delete(
    "/:id",
    authenticate,
    authorize("FACULTY"),
    deleteNotesController
);

export default router;