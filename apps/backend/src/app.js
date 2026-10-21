import express from "express";
import helmet from "helmet";
import cors from "cors";
import "./config/db.js";

import { handleUploadError } from "./middleware/upload-error.middleware.js";
import { authRateLimiter } from "./middleware/rate-limit.middleware.js";
import { allowedFrontendOrigins, corsOriginDelegate } from "./config/cors.js";

import authRoutes from "./routes/auth.routes.js";
import deptRoutes from "./routes/department.routes.js";
import studentRoutes from "./routes/student.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import facultyRoutes from "./routes/faculty.routes.js";
import subjectRoutes from "./routes/subject.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import submissionRoutes from "./routes/submission.routes.js";
import noticeRoutes from "./routes/notice.routes.js";
import timetableRoutes from "./routes/timetable.routes.js";
import notesRoutes from "./routes/notes.routes.js";
import calendarRoutes from "./routes/calendar.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import userRoutes from "./routes/user.routes.js";
import overviewRoutes from "./routes/overview.routes.js";
import allocationRoutes from "./routes/allocation.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import searchRoutes from "./routes/search.routes.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: corsOriginDelegate(allowedFrontendOrigins()),
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("CampusOS Backend Running 🚀");
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/v1/auth", authRateLimiter, authRoutes);
app.use("/api/v1/departments", deptRoutes);
app.use("/api/v1/students", studentRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/faculty", facultyRoutes);
app.use("/api/v1/subjects", subjectRoutes);
app.use("/api/v1/assignments", assignmentRoutes);
app.use("/api/v1/submissions", submissionRoutes);
app.use("/api/v1/notices", noticeRoutes);
app.use("/api/v1/timetable", timetableRoutes);
app.use("/api/v1/notes", notesRoutes);
app.use("/api/v1/calendar", calendarRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/admin", overviewRoutes);
app.use("/api/v1/allocations", allocationRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/search", searchRoutes);

app.use(handleUploadError);

app.use((error, _req, res, _next) => {
  if (res.headersSent) {
    return;
  }

  const status = Number(error.statusCode || error.status || 500);

  res.status(status).json({
    message: status >= 500 ? "Internal server error" : error.message,
  });
});

export default app;
