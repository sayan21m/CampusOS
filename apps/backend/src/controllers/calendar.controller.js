import {
  createCalendarEntry,
  deleteCalendarEntry,
  getCalendarEntryById,
  listCalendarEntries,
  updateCalendarEntry,
} from "../services/calendar.service.js";

export async function listCalendarEntriesController(req, res) {
  try {
    const entries = await listCalendarEntries(req.user.userId, req.query);

    return res.status(200).json({
      message: "Calendar entries retrieved successfully",
      count: entries.length,
      entries,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function getCalendarEntryController(req, res) {
  try {
    const entry = await getCalendarEntryById(req.params.id);

    return res.status(200).json({
      message: "Calendar entry retrieved successfully",
      entry,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function createCalendarEntryController(req, res) {
  try {
    const entry = await createCalendarEntry(req.body, req.user.userId);

    return res.status(201).json({
      message: "Calendar entry created successfully",
      entry,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function updateCalendarEntryController(req, res) {
  try {
    const entry = await updateCalendarEntry(req.params.id, req.body);

    return res.status(200).json({
      message: "Calendar entry updated successfully",
      entry,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function deleteCalendarEntryController(req, res) {
  try {
    const result = await deleteCalendarEntry(req.params.id);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}
