import prisma from "../config/db.js";
import {
  createAssignment,
  getAssignmentById,
  updateAssignmentById,
  getMyAssignments,
} from "../services/assignment.service.js";

export async function createAssignmentController(req, res) {
  try {
    const user_id = req.user.userId;

    const faculty = await prisma.faculty.findUnique({
      where: {
        user_id,
      },
    });

    if (!faculty) {
      return res.status(404).json({
        message: "Faculty profile not found",
      });
    }

    const assignment = await createAssignment(req.body, faculty.faculty_id);

    return res.status(201).json({
      message: "Assignment created successfully",
      assignment,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function getAssignmentByIdController(req, res) {
  try {
    const assignment_id = Number(req.params.id);

    const assignment = await getAssignmentById(assignment_id);

    return res.status(200).json({
      message: "Assignment fetched successfully",
      assignment,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function updateAssignmentByIdController(req, res) {
  try {
    const user_id = req.user.userId;
    const faculty = await prisma.faculty.findUnique({
      where: {
        user_id,
      },
    });

    if (!faculty) {
      return res.status(404).json({
        message: "Faculty profile not found",
      });
    }

    const assignment_id = Number(req.params.id);

    const updatedAssignment = await updateAssignmentById(
      assignment_id,
      req.body,
      faculty.faculty_id
    );

    return res.status(200).json({
      message: "Assignment updated successfully",
      updatedAssignment,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function getMyAssignmentsController(req, res) {
  try {
    const user_id = req.user.userId;
    const faculty = await prisma.faculty.findUnique({
      where: {
        user_id,
      },
    });

    if (!faculty) {
      return res.status(404).json({
        message: "Faculty profile not found",
      });
    }

    const assignments = await getMyAssignments(faculty.faculty_id);

    return res.status(200).json({ assignments });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}
