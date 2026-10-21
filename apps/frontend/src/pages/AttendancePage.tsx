import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchMyAttendance } from "../services/campus";

export default function AttendancePage() {
  const { user } = useAuth() as { user: { role?: string } | null };
  const isStudent = user?.role === "STUDENT";

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(isStudent);
  const [error, setError] = useState("");
  const [openSubject, setOpenSubject] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      if (!isStudent) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        setSummary(await fetchMyAttendance());
      } catch {
        setSummary(null);
        setError("Unable to load subject-wise attendance from the CampusOS API.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isStudent]);

  const subjects = Array.isArray(summary?.subjects) ? summary.subjects : [];
  const overall = summary?.overall || {
    percentage: 0,
    present: 0,
    absent: 0,
    total: 0,
    below_threshold: false,
    classes_needed: 0,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7f6", padding: "40px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, color: "#12241f" }}>Attendance</h1>
            <p style={{ margin: "6px 0 0", color: "#4d625c" }}>
              Subject-wise percentages and class logs for your semester.
            </p>
          </div>
          <Link to="/dashboard" style={{ color: "#0f6b57", fontWeight: 700, textDecoration: "none", alignSelf: "center" }}>
            ← Back to Dashboard
          </Link>
        </div>

        {!isStudent ? (
          <div style={card}>
            <p style={{ margin: 0, color: "#4d625c", lineHeight: 1.5 }}>
              Subject-wise attendance is available on student accounts. Faculty can mark a class from the timetable once the class roster is loaded.
            </p>
          </div>
        ) : null}

        {error ? <p style={{ color: "#b42318" }}>{error}</p> : null}
        {loading ? <p style={{ color: "#4d625c" }}>Loading attendance…</p> : null}

        {isStudent && !loading ? (
          <>
            <section style={{ ...card, marginBottom: "16px" }}>
              <p style={{ margin: "0 0 6px", color: "#5f7469", fontSize: "12px", fontWeight: 700 }}>OVERALL</p>
              <strong style={{ fontSize: "32px", color: overall.below_threshold ? "#b42318" : "#0f6b57" }}>
                {overall.percentage}%
              </strong>
              <p style={{ margin: "8px 0 0", color: "#4d625c" }}>
                {overall.present} present · {overall.absent} absent · {overall.total} classes
                {overall.below_threshold
                  ? ` · below ${summary?.threshold_percent ?? 75}% — attend ${overall.classes_needed} more consecutive class(es)`
                  : ""}
              </p>
            </section>

            <section style={card}>
              <h2 style={{ margin: "0 0 14px", fontSize: "18px", color: "#12241f" }}>Subject-wise attendance</h2>
              {subjects.length === 0 ? (
                <p style={{ margin: 0, color: "#4d625c" }}>No subjects found for your semester yet.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                    <thead>
                      <tr>
                        {["Subject", "Present", "Absent", "Total", "Percentage", "Status"].map((label) => (
                          <th key={label} style={th}>
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((subject: any) => (
                        <Fragment key={subject.subject_id}>
                          <tr>
                            <td style={td}>
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenSubject((current) =>
                                    current === subject.subject_id ? null : subject.subject_id
                                  )
                                }
                                style={{
                                  border: 0,
                                  background: "transparent",
                                  color: "#0f6b57",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  padding: 0,
                                  textAlign: "left",
                                }}
                              >
                                {subject.subject_code} — {subject.subject_name}
                              </button>
                            </td>
                            <td style={td}>{subject.present}</td>
                            <td style={td}>{subject.absent}</td>
                            <td style={td}>{subject.total}</td>
                            <td style={td}>{subject.percentage}%</td>
                            <td style={td}>
                              <span style={{ color: subject.below_threshold ? "#b42318" : "#0f6b57", fontWeight: 700 }}>
                                {subject.below_threshold
                                  ? `Shortage · ${subject.classes_needed} class(es) needed`
                                  : "On track"}
                              </span>
                            </td>
                          </tr>
                          {openSubject === subject.subject_id ? (
                            <tr>
                              <td colSpan={6} style={{ ...td, background: "#f8fbf9" }}>
                                {(subject.records || []).length === 0 ? (
                                  <p style={{ margin: 0, color: "#4d625c" }}>No class records marked yet.</p>
                                ) : (
                                  <ul style={{ margin: 0, paddingLeft: "18px", color: "#4d625c" }}>
                                    {subject.records.map((record: any) => (
                                      <li key={record.attendance_id}>
                                        {record.class_date}: {record.status}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

const card = {
  background: "#fff",
  border: "1px solid #d7e0dc",
  borderRadius: "16px",
  padding: "20px",
};

const th = {
  textAlign: "left" as const,
  padding: "10px 8px",
  borderBottom: "1px solid #e2ece8",
  color: "#5f7469",
};

const td = {
  padding: "10px 8px",
  borderBottom: "1px solid #edf2ef",
  color: "#12241f",
  verticalAlign: "top" as const,
};
