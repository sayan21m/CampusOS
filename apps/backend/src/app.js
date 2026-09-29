import express from "express";
import "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import deptRoutes from "./routes/department.routes.js";
import studentRoutes from "./routes/student.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import cors from "cors";

const app = express();

app.get("/", (req, res) => {
  res.send("CampusOS Backend Running 🚀");
});

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
  })
);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/departments", deptRoutes);
app.use("/api/v1/students", studentRoutes);
app.use("/api/v1/profile", profileRoutes);

export default app;
