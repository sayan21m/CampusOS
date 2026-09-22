import express from "express";
import "./config/db.js";

const app = express();

app.get("/", (req, res) => {
  res.send("CampusOS Backend Running 🚀");
});

export default app;