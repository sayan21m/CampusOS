import path from "node:path";
import { createNotes, getNotes, getAccessibleNote, replaceNotes, deleteNotes } from "../services/notes.service.js";
import { validateNotesFile } from "../validators/notes.validator.js";

export async function createNotesController(req, res) {
  try {
    const fileValidation = validateNotesFile(req.file);

    if (!fileValidation.success) {
      return res.status(400).json({
        message: fileValidation.message,
      });
    }

    const notes = await createNotes(
      req.user.userId,
      req.body,
      req.file
    );

    return res.status(201).json({
      message: "Notes created successfully",
      notes,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error("Create notes failed:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function getNotesController(req, res) {
    try {
      const { subject_id, unit_number } = req.params;
  
      const notes = await getNotes(
        req.user.userId,
        subject_id,
        unit_number
      );
  
      return res.status(200).json({
        message: "Materials retrieved successfully",
        count: notes.length,
        notes,
      });
    } catch (error) {
      console.error("Get notes failed:", error);
  
      return res.status(error.statusCode || 500).json({
        message: error.statusCode
          ? error.message
          : "Internal server error",
      });
    }
}

function safeDownloadName(title, extension) {
    const safeTitle = title
      .replace(/[\\/:*?"<>|\r\n]/g, "_")
      .trim()
      .slice(0, 150) || "material";
  
    return `${safeTitle}${extension}`;
}
  
export async function downloadNotesController(req, res) {
    try {
      const { note, absolutePath } = await getAccessibleNote(
        req.user.userId,
        req.params.notes_id
      );
  
      const extension = path.extname(note.storage_key).toLowerCase();
      const filename = safeDownloadName(note.title, extension);
  
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Type", "application/octet-stream");
  
      return res.download(absolutePath, filename, (error) => {
        if (error && !res.headersSent) {
          console.error("Notes download failed:", error);
          res.status(500).json({
            message: "Unable to download material",
          });
        } else if (error) {
          console.error("Notes download stream failed:", error);
        }
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          message: error.message,
        });
      }
  
      console.error("Download notes failed:", error);
  
      return res.status(500).json({
        message: "Internal server error",
      });
    }
}
  
export async function previewNotesController(req, res) {
    try {
      const { note, absolutePath } = await getAccessibleNote(
        req.user.userId,
        req.params.notes_id
      );
  
      const extension = path.extname(note.storage_key).toLowerCase();
  
      if (extension !== ".pdf") {
        return res.status(415).json({
          message: "Preview is available for PDF files only",
        });
      }
  
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${safeDownloadName(note.title, ".pdf")}"`
      );
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "private, no-store");
  
      return res.sendFile(absolutePath, (error) => {
        if (error && !res.headersSent) {
          console.error("PDF preview failed:", error);
          res.status(500).json({
            message: "Unable to preview material",
          });
        } else if (error) {
          console.error("PDF preview stream failed:", error);
        }
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          message: error.message,
        });
      }
  
      console.error("Preview notes failed:", error);
  
      return res.status(500).json({
        message: "Internal server error",
      });
    }
}

export async function replaceNotesController(req, res) {
    try {
      const notes = await replaceNotes(
        req.user.userId,
        req.params.notes_id,
        req.body,
        req.file
      );
  
      return res.status(200).json({
        message: "Material replaced successfully",
        notes,
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          message: error.message,
        });
      }
  
      console.error("Replace notes failed:", error);
  
      return res.status(500).json({
        message: "Internal server error",
      });
    }
}

export async function deleteNotesController(req, res) {
    try {
        const notes_id = req.params.id;
        const user_id = req.user.userId;

        const notes = await deleteNotes(user_id, notes_id);
        
        return res.status(200).json({
            message: "Deleted successfully",
            notes,
        });
    } catch (error) {
        if (error.statusCode) {
          return res.status(error.statusCode).json({
            message: error.message,
          });
        }

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}