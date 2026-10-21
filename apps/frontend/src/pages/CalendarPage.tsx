import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCalendarEntries, fetchMyAssignments, fetchWeekTimetable, toDateKey } from "../services/campus";

const TYPE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  HOLIDAY: { bg: "#e8f3ef", color: "#0f6b57", label: "Holiday" },
  EXAMINATION: { bg: "#fff1f0", color: "#9f2d22", label: "Exam" },
  ASSIGNMENT_DEADLINE: { bg: "#fff4e5", color: "#8a5300", label: "Deadline" },
  EVENT: { bg: "#e8f1fb", color: "#1d4e89", label: "Event" },
  LAST_WORKING_DAY: { bg: "#f1ecfb", color: "#5b4b8a", label: "Last working day" },
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function monthCells(anchor: Date) {
  const first = startOfMonth(anchor);
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

function entryOnDate(entry: any, dateKey: string) {
  const start = String(entry.start_date || "").slice(0, 10);
  const end = String(entry.end_date || entry.start_date || "").slice(0, 10);
  return start && dateKey >= start && dateKey <= end;
}

export default function CalendarPage() {
  const [view, setView] = useState<"month" | "week">("month");
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [entries, setEntries] = useState<any[]>([]);
  const [week, setWeek] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cells = useMemo(() => monthCells(monthAnchor), [monthAnchor]);
  const monthLabel = monthAnchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  useEffect(() => {
    async function loadMonth() {
      try {
        setLoading(true);
        setError("");
        const from = toDateKey(cells[0]);
        const to = toDateKey(cells[cells.length - 1]);
        const rows = await fetchCalendarEntries({ from, to, include_deadlines: true });
        setEntries(rows);
      } catch {
        setEntries([]);
        setError("Unable to load calendar data from the CampusOS API.");
      } finally {
        setLoading(false);
      }
    }

    if (view === "month") {
      loadMonth();
    }
  }, [view, cells]);

  useEffect(() => {
    async function loadWeek() {
      try {
        setLoading(true);
        setError("");
        const [days, assignments] = await Promise.all([
          fetchWeekTimetable(weekAnchor),
          fetchMyAssignments().catch(() => []),
        ]);
        setWeek(days);
        setDeadlines(
          assignments
            .filter((item: any) => item.dueDate)
            .map((item: any) => ({
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

    if (view === "week") {
      loadWeek();
    }
  }, [view, weekAnchor]);

  function shiftWeek(delta: number) {
    setWeekAnchor((prev) => {
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
              Month view with colour-coded academic events, plus the weekly timetable.
            </p>
          </div>
          <Link to="/dashboard" style={{ color: "#0f6b57", fontWeight: 700, textDecoration: "none", alignSelf: "center" }}>
            ← Back to Dashboard
          </Link>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
          <button type="button" onClick={() => setView("month")} style={view === "month" ? btnSolid : btnGhost}>
            Month
          </button>
          <button type="button" onClick={() => setView("week")} style={view === "week" ? btnSolid : btnGhost}>
            Week
          </button>
          {view === "month" ? (
            <>
              <button type="button" onClick={() => setMonthAnchor((prev) => addMonths(prev, -1))} style={btnGhost}>
                ← Previous month
              </button>
              <button type="button" onClick={() => setMonthAnchor(startOfMonth(new Date()))} style={btnGhost}>
                This month
              </button>
              <button type="button" onClick={() => setMonthAnchor((prev) => addMonths(prev, 1))} style={btnGhost}>
                Next month →
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => shiftWeek(-1)} style={btnGhost}>
                ← Previous week
              </button>
              <button type="button" onClick={() => setWeekAnchor(new Date())} style={btnGhost}>
                This week
              </button>
              <button type="button" onClick={() => shiftWeek(1)} style={btnGhost}>
                Next week →
              </button>
            </>
          )}
        </div>

        {error && (
          <div style={{ marginBottom: "16px", padding: "12px 16px", background: "#fff1f0", color: "#9f2d22", borderRadius: "12px", fontWeight: 600 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={card}>Loading calendar...</div>
        ) : view === "month" ? (
          <>
            <h2 style={{ margin: "0 0 12px", color: "#12241f", fontSize: "1.1rem" }}>{monthLabel}</h2>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
              {Object.entries(TYPE_COLORS).map(([type, meta]) => (
                <span key={type} style={{ background: meta.bg, color: meta.color, borderRadius: "999px", padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700 }}>
                  {meta.label}
                </span>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "8px", marginBottom: "8px" }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0f6b57", padding: "0 4px" }}>
                  {day}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "8px" }}>
              {cells.map((date) => {
                const key = toDateKey(date);
                const inMonth = date.getMonth() === monthAnchor.getMonth();
                const dayEntries = entries.filter((entry) => entryOnDate(entry, key)).slice(0, 3);
                return (
                  <section
                    key={key}
                    style={{
                      ...card,
                      minHeight: "110px",
                      padding: "10px",
                      opacity: inMonth ? 1 : 0.45,
                    }}
                  >
                    <div style={{ fontWeight: 800, color: "#12241f", marginBottom: "8px" }}>{date.getDate()}</div>
                    <div style={{ display: "grid", gap: "4px" }}>
                      {dayEntries.map((entry) => {
                        const tone = TYPE_COLORS[entry.entry_type] || TYPE_COLORS.EVENT;
                        return (
                          <div
                            key={`${entry.calendar_id}-${entry.entry_type}-${entry.title}`}
                            style={{
                              background: tone.bg,
                              color: tone.color,
                              borderRadius: "8px",
                              padding: "4px 6px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={entry.title}
                          >
                            {entry.title}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
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

const btnSolid = {
  ...btnGhost,
  background: "#0f6b57",
  color: "#fff",
  border: "1px solid #0f6b57",
};
