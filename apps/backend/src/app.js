import express from "express";
import "./config/db.js";
import authRoutes from "./routes/auth.routes.js"
import cors from "cors";

const app = express();

app.get("/", (req, res) => {
  res.send("CampusOS Backend Running 🚀");
});

app.use(cors());
app.use(express.json());
app.use("/api/v1/auth", authRoutes);

export default app;