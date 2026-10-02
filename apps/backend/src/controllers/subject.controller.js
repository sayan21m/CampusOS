import { createSubject } from "../services/subject.service.js";

export async function createSubjectController(req, res) {
  try {
    const subject = await createSubject(req.body);

    return res.status(201).json({
      message: "Subject created successfully",
      subject,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}
