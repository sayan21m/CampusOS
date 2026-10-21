import { createFaculty } from "../services/faculty.service.js";

export async function createFacultyController(req, res) {
  try {
    const faculty = await createFaculty(req.body);

    return res.status(201).json({
      message: "Faculty created successfully",
      faculty,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}
