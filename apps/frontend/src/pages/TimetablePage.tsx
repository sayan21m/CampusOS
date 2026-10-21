import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTodayTimetable } from "../services/campus";

export default function TimetablePage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        setClasses(await fetchTodayTimetable());
      } catch {
        setError("Unable to load timetable from the CampusOS API.");
        setClasses([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7f6", padding: "40px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, color: "#12241f" }}>Today&apos;s Timetable</h1>
            <p style={{ margin: "6px 0 0", color: "#4d625c" }}>Effective schedule for today from the timetable API.</p>
          </div>
          <Link to="/dashboard" style={{ color: "#0f6b57", fontWeight: 700, textDecoration: "none", alignSelf: "center" }}>
            ← Back to Dashboard
          </Link>
        </div>

        {error && (
          <div style={{ marginBottom: "16px", padding: "12px 16px", background: "#fff1f0", color: "#9f2d22", borderRadius: "12px", fontWeight: 600 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: "24px", background: "#fff", borderRadius: "16px", border: "1px solid #d7e0dc", color: "#6a827b" }}>
            Loading timetable...
          </div>
        ) : classes.length === 0 ? (
          <div style={{ padding: "24px", background: "#fff", borderRadius: "16px", border: "1px solid #d7e0dc", color: "#6a827b" }}>
            No classes scheduled for today.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {classes.map((cls) => (
              <article
                key={`${cls.id}-${cls.time}`}
                style={{
                  background: "#fff",
                  border: "1px solid #d7e0dc",
                  borderRadius: "16px",
                  padding: "18px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "#0f6b57", marginBottom: "6px" }}>{cls.time}</div>
                  <h2 style={{ margin: "0 0 4px", fontSize: "1.05rem", color: "#12241f" }}>{cls.subject}</h2>
                  <p style={{ margin: 0, color: "#6a827b", fontSize: "0.88rem" }}>
                    Code: {cls.code} | Room: {cls.room}
                    {cls.faculty ? ` | ${cls.faculty}` : ""}
                  </p>
                </div>
                <span style={{ alignSelf: "center", fontWeight: 700, color: "#4d625c" }}>{cls.status}</span>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
