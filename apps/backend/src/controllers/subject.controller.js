import { createSubject, getMySubjects, updateSubject } from "../services/subject.service.js";

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

export async function getMySubjectsController(req, res) {
  try {
    const subjects = await getMySubjects(req.user.userId);

    return res.status(200).json({
      message: "Subjects retrieved successfully",
      count: subjects.length,
      subjects,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function updateSubjectController(req, res) {
  try {
    const subject = await updateSubject(req.params.id, req.body);

    return res.status(200).json({
      message: "Subject updated successfully",
      subject,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}
