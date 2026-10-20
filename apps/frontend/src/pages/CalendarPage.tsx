import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMyAssignments, fetchWeekTimetable } from "../services/campus";

export default function CalendarPage() {
  const [week, setWeek] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [anchor, setAnchor] = useState(() => new Date());

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const [days, assignments] = await Promise.all([
          fetchWeekTimetable(anchor),
          fetchMyAssignments().catch(() => []),
        ]);
        setWeek(days);
        setDeadlines(
          assignments
            .filter((item) => item.dueDate)
            .map((item) => ({
              id: item.id,
              title: item.title,
              subject: item.subject,
              dueDate: item.dueDate,
              status: item.status,
            }))
        );
      } catch {
        setWeek([]);
        setDeadlines([]);
        setError("Unable to load calendar data from the CampusOS API.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [anchor]);

  function shiftWeek(delta: number) {
    setAnchor((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + delta * 7);
      return next;
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7f6", padding: "40px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, color: "#12241f" }}>Calendar</h1>
            <p style={{ margin: "6px 0 0", color: "#4d625c" }}>
              Weekly effective timetable plus assignment deadlines from live APIs.
            </p>
          </div>
          <Link to="/dashboard" style={{ color: "#0f6b57", fontWeight: 700, textDecoration: "none", alignSelf: "center" }}>
            ← Back to Dashboard
          </Link>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
          <button type="button" onClick={() => shiftWeek(-1)} style={btnGhost}>
            ← Previous week
          </button>
          <button type="button" onClick={() => setAnchor(new Date())} style={btnGhost}>
            This week
          </button>
          <button type="button" onClick={() => shiftWeek(1)} style={btnGhost}>
            Next week →
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: "16px", padding: "12px 16px", background: "#fff1f0", color: "#9f2d22", borderRadius: "12px", fontWeight: 600 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={card}>Loading calendar...</div>
        ) : (
          <>
            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: "24px" }}>
              {week.map((day) => (
                <section key={day.date} style={card}>
                  <h2 style={{ margin: "0 0 10px", fontSize: "0.95rem", color: "#0f6b57" }}>{day.label}</h2>
                  {day.classes.length === 0 ? (
                    <p style={{ margin: 0, color: "#6a827b", fontSize: "0.88rem" }}>No classes</p>
                  ) : (
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "8px" }}>
                      {day.classes.map((cls: any) => (
                        <li key={`${day.date}-${cls.id}-${cls.time}`} style={{ borderTop: "1px solid #e2ece8", paddingTop: "8px" }}>
                          <div style={{ fontWeight: 700, color: "#12241f", fontSize: "0.9rem" }}>{cls.subject}</div>
                          <div style={{ color: "#6a827b", fontSize: "0.8rem" }}>
                            {cls.time} · {cls.room}
                          </div>
                          <div style={{ color: "#4d625c", fontSize: "0.78rem" }}>{cls.status}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>

            <section style={card}>
              <h2 style={{ margin: "0 0 12px", fontSize: "1.05rem", color: "#12241f" }}>Assignment deadlines</h2>
              {deadlines.length === 0 ? (
                <p style={{ margin: 0, color: "#6a827b" }}>No assignment deadlines available for your account.</p>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {deadlines.map((item) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", borderTop: "1px solid #e2ece8", paddingTop: "10px" }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "#12241f" }}>{item.title}</div>
                        <div style={{ color: "#6a827b", fontSize: "0.85rem" }}>{item.subject}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, color: "#0f6b57" }}>
                          {new Date(item.dueDate).toLocaleString()}
                        </div>
                        <div style={{ color: "#4d625c", fontSize: "0.8rem" }}>{item.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

const card = {
  background: "#fff",
  border: "1px solid #d7e0dc",
  borderRadius: "16px",
  padding: "16px 18px",
  color: "#6a827b",
};

const btnGhost = {
  background: "#fff",
  border: "1px solid #c5d4ce",
  borderRadius: "10px",
  padding: "8px 14px",
  fontWeight: 700,
  color: "#0f6b57",
  cursor: "pointer",
};
