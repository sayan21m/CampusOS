import { createNotice, getNotice } from "../services/notice.service.js";

export async function createNoticeController(req, res) {
  try {
    const user_id = req.user.userId;
    const notice = await createNotice(req.data, user_id);

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
