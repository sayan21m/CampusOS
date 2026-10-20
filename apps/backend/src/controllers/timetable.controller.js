import { parseDateOnly } from "../validators/timetable.validator.js";
import {
  createTimetableSlot,
  updateTimetableSlot,
  deleteTimetableSlot,
  getTimetable,
  getTodayTimetable,
  getEffectiveTimetable,
  handleTimetableException,
  getTimetableExceptionById,
  listTimetableExceptions,
  deleteTimetableException,
} from "../services/timetable.service.js";

function parsePositiveIntParam(value, label) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    const error = new Error(`Invalid ${label}`);
    error.statusCode = 400;
    throw error;
  }

  return parsed;
}

export async function createTimetableSlotController(req, res) {
  try {
    const user_id = req.user.userId;
    const slot = await createTimetableSlot(req.body, user_id);

    return res.status(201).json({
      message: "Timetable slot created successfully",
      slot,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function updateTimetableSlotController(req, res) {
  try {
    const user_id = req.user.userId;
    const timetable_id = Number(req.params.timetable_id);

    if (!Number.isInteger(timetable_id) || timetable_id <= 0) {
      return res.status(400).json({
        message: "Invalid timetable ID",
      });
    }

    const slot = await updateTimetableSlot(timetable_id, req.body, user_id);

    return res.status(200).json({
      message: "Timetable slot updated successfully",
      slot,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function deletedSlotController(req, res) {
  try {
    const user_id = req.user.userId;
    const timetable_id = Number(req.params.timetable_id);

    if (!Number.isInteger(timetable_id) || timetable_id <= 0) {
      return res.status(400).json({
        message: "Invalid timetable ID",
      });
    }

    const deletedSlot = await deleteTimetableSlot(timetable_id, user_id);
    return res.status(200).json({
      message: "Timetable slot deleted successfully",
      deletedSlot,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function getTimetableController(req, res) {
  try {
    const user_id = req.user.userId;

    const dept_id = Number(req.query.dept_id);
    const semester = Number(req.query.semester);
    const section = req.query.section;

    if (
      !Number.isInteger(dept_id) ||
      !Number.isInteger(semester) ||
      typeof section !== "string" ||
      !section.trim()
    ) {
      return res.status(400).json({
        message: "Invalid timetable query parameters",
      });
    }

    const timetable = await getTimetable(dept_id, semester, section, user_id);

    return res.status(200).json({
      message: "Timetable fetched successfully",
      timetable,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function getTodayTimetableController(req, res) {
  try {
    const user_id = req.user.userId;
    const timetable = await getTodayTimetable(user_id);

    return res.status(200).json({
      message: "Today's timetable fetched successfully",
      timetable,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function getEffectiveTimetableController(req, res) {
  try {
    const user_id = req.user.userId;
    const date = parseDateOnly(req.query.date);

    if (!date) {
      return res.status(400).json({
        message: "Invalid timetable query parameters",
      });
    }

    const hasScope =
      req.query.dept_id !== undefined ||
      req.query.semester !== undefined ||
      req.query.section !== undefined;

    let dept_id;
    let semester;
    let section;

    if (hasScope) {
      dept_id = Number(req.query.dept_id);
      semester = Number(req.query.semester);
      section = req.query.section;

      if (
        !Number.isInteger(dept_id) ||
        !Number.isInteger(semester) ||
        typeof section !== "string" ||
        !section.trim()
      ) {
        return res.status(400).json({
          message: "Invalid timetable query parameters",
        });
      }
    }

    const timetable = await getEffectiveTimetable(user_id, {
      date,
      ...(hasScope ? { dept_id, semester, section } : {}),
    });

    return res.status(200).json({
      message: "Effective timetable fetched successfully",
      timetable,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function createTimetableExceptionController(req, res) {
  try {
    const user_id = req.user.userId;
    const timetable_id = parsePositiveIntParam(req.params.timetable_id, "timetable ID");
    const exception = await handleTimetableException(user_id, timetable_id, req.body);

    return res.status(201).json({
      message: "Timetable exception created successfully",
      exception,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function listTimetableExceptionsController(req, res) {
  try {
    const user_id = req.user.userId;
    const timetable_id = parsePositiveIntParam(req.params.timetable_id, "timetable ID");
    const exceptions = await listTimetableExceptions(timetable_id, user_id);

    return res.status(200).json({
      message: "Timetable exceptions fetched successfully",
      exceptions,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function getTimetableExceptionController(req, res) {
  try {
    const user_id = req.user.userId;
    const exception_id = parsePositiveIntParam(req.params.exception_id, "timetable exception ID");
    const exception = await getTimetableExceptionById(exception_id, user_id);

    return res.status(200).json({
      message: "Timetable exception fetched successfully",
      exception,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function deleteTimetableExceptionController(req, res) {
  try {
    const user_id = req.user.userId;
    const exception_id = parsePositiveIntParam(req.params.exception_id, "timetable exception ID");
    const deletedException = await deleteTimetableException(exception_id, user_id);

    return res.status(200).json({
      message: "Timetable exception deleted successfully",
      deletedException,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}
