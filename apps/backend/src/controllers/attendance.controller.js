import {
  formatSubjectReportCsv,
  getClassRoster,
  getMyAttendance,
  getSubjectReport,
  markAttendance,
  updateAttendance,
} from "../services/attendance.service.js";

export async function getClassRosterController(req, res) {
  try {
    const roster = await getClassRoster(req.user.userId, req.validatedQuery || req.query);
    return res.status(200).json({
      message: "Class roster retrieved successfully",
      roster,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function markAttendanceController(req, res) {
  try {
    const attendance = await markAttendance(req.user.userId, req.body);
    return res.status(201).json({
      message: "Attendance marked successfully",
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function updateAttendanceController(req, res) {
  try {
    const record = await updateAttendance(req.user.userId, req.params.id, req.body);
    return res.status(200).json({
      message: "Attendance updated successfully",
      attendance: record,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function getMyAttendanceController(req, res) {
  try {
    const summary = await getMyAttendance(req.user.userId);
    return res.status(200).json({
      message: "Attendance summary retrieved successfully",
      summary,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function getSubjectReportController(req, res) {
  try {
    const report = await getSubjectReport(
      req.user.userId,
      req.params.subjectId,
      req.validatedQuery || req.query
    );
    return res.status(200).json({
      message: "Attendance report retrieved successfully",
      report,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function exportSubjectReportController(req, res) {
  try {
    const report = await getSubjectReport(
      req.user.userId,
      req.params.subjectId,
      req.validatedQuery || req.query
    );
    const csv = formatSubjectReportCsv(report);
    const filename = `${report.subject.subject_code || "subject"}-attendance.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
}
