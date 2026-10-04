import prisma from "../config/db.js";
import {
  createSubmission,
  getAssignmentSubmissions,
  gradeSubmission,
} from "../services/submission.service.js";

export async function createSubmissionController(req, res) {
  try {
    const assignment_id = Number(req.params.id);

    if (!Number.isInteger(assignment_id) || assignment_id <= 0) {
      return res.status(400).json({
        message: "Invalid assignment ID",
      });
    }

    const user_id = req.user.userId;
    const student = await prisma.student.findUnique({
      where: {
        user_id: user_id,
      },
    });

    if (!student) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    const submission = await createSubmission(assignment_id, student.student_id, req.file);

    return res.status(201).json({
      message: "Assignment submitted successfully",
      submission,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function getAssignmentSubmissionsController(req, res) {
  try {
    const assignment_id = Number(req.params.id);

    if (!Number.isInteger(assignment_id) || assignment_id <= 0) {
      return res.status(400).json({
        message: "Invalid assignment ID",
      });
    }

    const user_id = req.user.userId;
    const faculty = await prisma.faculty.findUnique({
      where: {
        user_id: user_id,
      },
    });

    if (!faculty) {
      return res.status(404).json({
        message: "Faculty profile not found",
      });
    }

    const result = await getAssignmentSubmissions(assignment_id, faculty.faculty_id);

    return res.status(200).json({
      result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function gradeSubmissionController(req, res) {
  try {
    const submission_id = Number(req.params.id);

    if (!Number.isInteger(submission_id) || submission_id <= 0) {
      return res.status(400).json({
        message: "Invalid submission ID",
      });
    }

    const user_id = req.user.userId;
    const faculty = await prisma.faculty.findUnique({
      where: {
        user_id: user_id,
      },
    });

    if (!faculty) {
      return res.status(404).json({
        message: "Faculty profile not found",
      });
    }

    const { marks, feedback } = req.body;

    const submission = await gradeSubmission(submission_id, faculty.faculty_id, marks, feedback);

    return res.status(200).json({
      message: "Submission graded successfully",
      submission,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}
