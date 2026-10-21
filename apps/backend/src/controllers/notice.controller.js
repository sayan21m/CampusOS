import path from "node:path";
import {
  createNotice,
  getNotice,
  getNoticeAttachment,
  markNoticeRead,
} from "../services/notice.service.js";
import { validateNoticeAttachment } from "../validators/notice.validator.js";
import { safeDownloadName } from "../services/file-storage.service.js";

export async function createNoticeController(req, res) {
  try {
    const fileValidation = validateNoticeAttachment(req.file);
    if (!fileValidation.success) {
      return res.status(400).json({
        message: fileValidation.message,
      });
    }

    const user_id = req.user.userId;
    const notice = await createNotice(req.body, user_id, req.file);

    return res.status(201).json({
      message: "Notice created successfully",
      notice,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function getNoticeController(req, res) {
  try {
    const user_id = req.user.userId;
    const notice = await getNotice(user_id);

    return res.status(200).json({
      message: "Notice created successfully",
      notice,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function markNoticeReadController(req, res) {
  try {
    const result = await markNoticeRead(req.user.userId, req.params.id);

    return res.status(200).json({
      message: "Notice marked as read",
      ...result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function downloadNoticeAttachmentController(req, res) {
  try {
    const { notice, absolutePath } = await getNoticeAttachment(
      req.user.userId,
      req.params.id
    );
    const extension = path.extname(notice.attachment_url || "").toLowerCase();
    const filename = safeDownloadName(notice.title, extension);

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", "application/octet-stream");

    return res.download(absolutePath, filename, (error) => {
      if (error && !res.headersSent) {
        console.error("Notice attachment download failed:", error);
        res.status(500).json({
          message: "Unable to download attachment",
        });
      } else if (error) {
        console.error("Notice attachment stream failed:", error);
      }
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}
