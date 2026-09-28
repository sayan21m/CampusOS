import { createStudent } from "../services/student.service.js";

export async function createStudentController(req, res) {
  try {
    const student = await createStudent(req.body);

    return res.status(201).json({
      message: "Student created successfully",
      student,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}
