import {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
} from "../services/department.service.js";

export async function createDepartmentController(req, res) {
  try {
    const { dept_name, dept_code } = req.body;
    const department = await createDepartment(dept_name, dept_code);

    return res.status(201).json({
      message: "Department created successfully",
      department,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function getDepartmentsController(req, res) {
  try {
    const departments = await getDepartments();

    return res.status(200).json({
      departments,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function getDepartmentByIdController(req, res) {
  try {
    const dept_id = Number(req.params.id);
    const department = await getDepartmentById(dept_id);

    return res.status(200).json({
      department,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function updateDepartmentController(req, res) {
  try {
    const dept_id = Number(req.params.id);
    const data = req.body;
    const update = await updateDepartment(dept_id, data);

    return res.status(200).json({
      message: "Department updated successfully",
      department: {
        dept_id: update.dept_id,
        dept_name: update.dept_name,
        dept_code: update.dept_code,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}
