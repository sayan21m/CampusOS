import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  downloadAttendanceCsv,
  fetchAttendanceReport,
  fetchAttendanceRoster,
  fetchEffectiveTimetable,
  fetchMyAttendance,
  fetchSubjects,
  markClassAttendance,
  toDateKey,
} from "../services/campus";

function apiMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message || fallback;
}

export default function AttendancePage() {
  const { user } = useAuth() as { user: { role?: string } | null };
  const role = user?.role;
  const isStudent = role === "STUDENT";
  const isFaculty = role === "FACULTY";

  return (
    <div style={pageShell}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, color: "#12241f" }}>Attendance</h1>
            <p style={{ margin: "6px 0 0", color: "#4d625c" }}>
              {isFaculty
                ? "Mark a class from the roster, then review subject-wise percentages."
                : isStudent
                  ? "Subject-wise percentages and class logs for your semester."
                  : "Attendance marking and student summaries are available on faculty and student accounts."}
            </p>
          </div>
          <Link to="/dashboard" style={{ color: "#0f6b57", fontWeight: 700, textDecoration: "none", alignSelf: "center" }}>
            ← Back to Dashboard
          </Link>
        </div>

        {isStudent ? <StudentAttendance /> : null}
        {isFaculty ? <FacultyAttendance /> : null}
        {!isStudent && !isFaculty ? (
          <div style={card}>
            <p style={{ margin: 0, color: "#4d625c", lineHeight: 1.5 }}>
              Faculty mark class attendance here. Students see their own percentages and shortage warnings.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StudentAttendance() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openSubject, setOpenSubject] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        setSummary(await fetchMyAttendance());
      } catch (err) {
        setSummary(null);
        setError(apiMessage(err, "Unable to load subject-wise attendance from the CampusOS API."));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const subjects = Array.isArray(summary?.subjects) ? summary.subjects : [];
  const overall = summary?.overall || {
    percentage: 0,
    present: 0,
    absent: 0,
    total: 0,
    below_threshold: false,
    classes_needed: 0,
  };
  const threshold = summary?.threshold_percent ?? 75;
  const shortageSubjects = subjects.filter((subject: any) => subject.below_threshold);

  if (loading) {
    return <div style={{ ...card, color: "#6a827b" }}>Loading attendance…</div>;
  }

  return (
    <>
      {error ? (
        <div style={{ ...bannerError, marginBottom: "16px" }}>{error}</div>
      ) : null}

      {overall.below_threshold || shortageSubjects.length > 0 ? (
        <div style={{ ...bannerWarn, marginBottom: "16px" }}>
          Attendance is below {threshold}%
          {shortageSubjects.length > 0
            ? ` in ${shortageSubjects.map((subject: any) => subject.subject_code).join(", ")}`
            : ""}
          . Attend {overall.classes_needed || shortageSubjects[0]?.classes_needed || 0} more consecutive class(es) to get back on track.
        </div>
      ) : null}

      <section style={{ ...card, marginBottom: "16px" }}>
        <p style={{ margin: "0 0 6px", color: "#5f7469", fontSize: "12px", fontWeight: 700 }}>OVERALL</p>
        <strong style={{ fontSize: "32px", color: overall.below_threshold ? "#b42318" : "#0f6b57" }}>
          {overall.percentage}%
        </strong>
        <div style={meterTrack}>
          <div
            style={{
              ...meterFill,
              width: `${Math.min(100, Number(overall.percentage) || 0)}%`,
              background: overall.below_threshold ? "#b42318" : "#0f6b57",
            }}
          />
        </div>
        <p style={{ margin: "10px 0 0", color: "#4d625c" }}>
          {overall.present} present · {overall.absent} absent · {overall.total} classes
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
                          style={linkButton}
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
  );
}

function FacultyAttendance() {
  const [classDate, setClassDate] = useState(toDateKey());
  const [classes, setClasses] = useState<any[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [roster, setRoster] = useState<any>(null);
  const [marks, setMarks] = useState<Record<number, "PRESENT" | "ABSENT">>({});
  const [reportSubjectId, setReportSubjectId] = useState("");
  const [report, setReport] = useState<any>(null);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedClass = classes.find((item) => item.id === selectedId) || null;
  const subjects = useMemo(() => {
    const map = new Map<number, string>();
    subjectOptions.forEach((subject) => {
      map.set(subject.subject_id, `${subject.subject_code} — ${subject.subject_name}`);
    });
    classes.forEach((item) => {
      if (item.subject_id) {
        map.set(item.subject_id, `${item.code} — ${item.subject}`);
      }
    });
    if (roster?.subject?.subject_id) {
      map.set(
        roster.subject.subject_id,
        `${roster.subject.subject_code} — ${roster.subject.subject_name}`
      );
    }
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [classes, roster, subjectOptions]);

  useEffect(() => {
    fetchSubjects()
      .then(setSubjectOptions)
      .catch(() => setSubjectOptions([]));
  }, []);

  useEffect(() => {
    async function loadClasses() {
      try {
        setLoadingClasses(true);
        setError("");
        const rows = await fetchEffectiveTimetable(classDate);
        setClasses(rows);
        setSelectedId((current) => {
          if (current && rows.some((row: any) => row.id === current)) {
            return current;
          }
          const firstOpen = rows.find((row: any) => !row.cancelled);
          return firstOpen?.id ?? null;
        });
      } catch (err) {
        setClasses([]);
        setSelectedId(null);
        setError(apiMessage(err, "Unable to load classes for this date."));
      } finally {
        setLoadingClasses(false);
      }
    }

    loadClasses();
  }, [classDate]);

  useEffect(() => {
    async function loadRoster() {
      if (!selectedId) {
        setRoster(null);
        setMarks({});
        return;
      }

      try {
        setLoadingRoster(true);
        setError("");
        const next = await fetchAttendanceRoster({
          timetable_id: selectedId,
          class_date: classDate,
        });
        setRoster(next);
        const nextMarks: Record<number, "PRESENT" | "ABSENT"> = {};
        (next?.students || []).forEach((student: any) => {
          nextMarks[student.student_id] = student.status === "ABSENT" ? "ABSENT" : "PRESENT";
        });
        setMarks(nextMarks);
        if (next?.subject?.subject_id) {
          setReportSubjectId(String(next.subject.subject_id));
        }
      } catch (err) {
        setRoster(null);
        setMarks({});
        setError(apiMessage(err, "Unable to load the class roster."));
      } finally {
        setLoadingRoster(false);
      }
    }

    loadRoster();
  }, [selectedId, classDate]);

  useEffect(() => {
    async function loadReport() {
      if (!reportSubjectId) {
        setReport(null);
        return;
      }

      try {
        const next = await fetchAttendanceReport(Number(reportSubjectId), {
          section: roster?.section,
        });
        setReport(next);
      } catch {
        setReport(null);
      }
    }

    loadReport();
  }, [reportSubjectId, roster?.section, notice]);

  function setAllPresent() {
    const next: Record<number, "PRESENT" | "ABSENT"> = {};
    (roster?.students || []).forEach((student: any) => {
      next[student.student_id] = "PRESENT";
    });
    setMarks(next);
  }

  async function saveMarks() {
    if (!selectedId || !roster) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setNotice("");
      await markClassAttendance({
        timetable_id: selectedId,
        class_date: classDate,
        records: (roster.students || []).map((student: any) => ({
          student_id: student.student_id,
          status: marks[student.student_id] || "PRESENT",
        })),
      });
      const refreshed = await fetchAttendanceRoster({
        timetable_id: selectedId,
        class_date: classDate,
      });
      setRoster(refreshed);
      setNotice("Attendance saved.");
    } catch (err) {
      setError(apiMessage(err, "Unable to save attendance for this class."));
    } finally {
      setSaving(false);
    }
  }

  async function exportCsv() {
    if (!reportSubjectId) {
      return;
    }

    try {
      setExporting(true);
      setError("");
      await downloadAttendanceCsv(Number(reportSubjectId), {
        section: roster?.section,
      });
    } catch (err) {
      setError(apiMessage(err, "Unable to export the attendance CSV."));
    } finally {
      setExporting(false);
    }
  }

  const alreadyMarked = (roster?.students || []).some((student: any) => student.attendance_id);
  const absentCount = Object.values(marks).filter((status) => status === "ABSENT").length;

  return (
    <>
      {error ? <div style={{ ...bannerError, marginBottom: "16px" }}>{error}</div> : null}
      {notice ? <div style={{ ...bannerOk, marginBottom: "16px" }}>{notice}</div> : null}

      <section style={{ ...card, marginBottom: "16px" }}>
        <label style={{ display: "grid", gap: "6px", maxWidth: "220px" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Class date</span>
          <input
            type="date"
            value={classDate}
            onChange={(e) => {
              setNotice("");
              setClassDate(e.target.value);
            }}
            style={inputStyle}
          />
        </label>
        <p style={{ margin: "10px 0 0", color: "#6a827b", fontSize: "0.88rem" }}>
          Corrections are allowed for seven days after the class date. Start with everyone present, then mark absentees.
        </p>
      </section>

      <section style={{ ...card, marginBottom: "16px" }}>
        <h2 style={{ margin: "0 0 14px", fontSize: "18px", color: "#12241f" }}>Classes</h2>
        {loadingClasses ? (
          <p style={{ margin: 0, color: "#6a827b" }}>Loading classes…</p>
        ) : classes.length === 0 ? (
          <p style={{ margin: 0, color: "#4d625c" }}>No classes on this date.</p>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {classes.map((item) => {
              const active = selectedId === item.id;
              return (
                <button
                  key={`${item.id}-${item.time}`}
                  type="button"
                  disabled={item.cancelled}
                  onClick={() => {
                    setNotice("");
                    setSelectedId(item.id);
                  }}
                  style={{
                    ...card,
                    padding: "14px 16px",
                    textAlign: "left",
                    cursor: item.cancelled ? "not-allowed" : "pointer",
                    border: active ? "1px solid #0f6b57" : "1px solid #d7e0dc",
                    background: item.cancelled ? "#f8fbf9" : "#fff",
                    opacity: item.cancelled ? 0.7 : 1,
                  }}
                >
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                    <span style={chip}>Period {item.period ?? "—"}</span>
                    <span style={chipMuted}>{item.time}</span>
                    {item.section ? <span style={chipMuted}>Sec {item.section}</span> : null}
                    {item.cancelled ? <span style={chipWarn}>Cancelled</span> : null}
                  </div>
                  <strong style={{ color: "#12241f" }}>
                    {item.code} — {item.subject}
                  </strong>
                  <p style={{ margin: "4px 0 0", color: "#6a827b", fontSize: "0.88rem" }}>Room {item.room}</p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ ...card, marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", color: "#12241f" }}>Class roster</h2>
            <p style={{ margin: "6px 0 0", color: "#6a827b", fontSize: "0.88rem" }}>
              {selectedClass
                ? `${selectedClass.code} · ${selectedClass.time}${alreadyMarked ? " · already marked" : ""}`
                : "Select a class to load students."}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="button" onClick={setAllPresent} disabled={!roster || saving} style={secondaryButton}>
              Mark all present
            </button>
            <button type="button" onClick={saveMarks} disabled={!roster || saving} style={primaryButton}>
              {saving ? "Saving..." : "Save attendance"}
            </button>
          </div>
        </div>

        {loadingRoster ? (
          <p style={{ margin: 0, color: "#6a827b" }}>Loading roster…</p>
        ) : !roster ? (
          <p style={{ margin: 0, color: "#4d625c" }}>Choose a class above to mark present or absent.</p>
        ) : (roster.students || []).length === 0 ? (
          <p style={{ margin: 0, color: "#4d625c" }}>No students enrolled for this section.</p>
        ) : (
          <>
            <p style={{ margin: "0 0 12px", color: "#4d625c", fontSize: "0.88rem" }}>
              {roster.students.length} students · {absentCount} absent
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr>
                    {["Roll", "Name", "Attendance"].map((label) => (
                      <th key={label} style={th}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(roster.students || []).map((student: any) => {
                    const status = marks[student.student_id] || "PRESENT";
                    return (
                      <tr key={student.student_id}>
                        <td style={td}>{student.roll_number}</td>
                        <td style={td}>{student.full_name}</td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              type="button"
                              onClick={() =>
                                setMarks((current) => ({ ...current, [student.student_id]: "PRESENT" }))
                              }
                              style={status === "PRESENT" ? presentOn : toggleOff}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setMarks((current) => ({ ...current, [student.student_id]: "ABSENT" }))
                              }
                              style={status === "ABSENT" ? absentOn : toggleOff}
                            >
                              Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
          <h2 style={{ margin: 0, fontSize: "18px", color: "#12241f" }}>Subject report</h2>
          <button type="button" onClick={exportCsv} disabled={!reportSubjectId || exporting} style={secondaryButton}>
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
        <label style={{ display: "grid", gap: "6px", maxWidth: "320px", marginBottom: "14px" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Subject</span>
          <select
            value={reportSubjectId}
            onChange={(e) => setReportSubjectId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Select subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.label}
              </option>
            ))}
          </select>
        </label>
        {!report ? (
          <p style={{ margin: 0, color: "#4d625c" }}>Pick a subject to see percentages and shortage warnings.</p>
        ) : (report.students || []).length === 0 ? (
          <p style={{ margin: 0, color: "#4d625c" }}>No students found for this subject.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr>
                  {["Roll", "Name", "Section", "Present", "Absent", "Total", "Percentage", "Status"].map((label) => (
                    <th key={label} style={th}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.students.map((student: any) => (
                  <tr key={student.student_id}>
                    <td style={td}>{student.roll_number}</td>
                    <td style={td}>{student.full_name}</td>
                    <td style={td}>{student.section}</td>
                    <td style={td}>{student.present}</td>
                    <td style={td}>{student.absent}</td>
                    <td style={td}>{student.total}</td>
                    <td style={td}>{student.percentage}%</td>
                    <td style={td}>
                      <span style={{ color: student.below_threshold ? "#b42318" : "#0f6b57", fontWeight: 700 }}>
                        {student.below_threshold ? `Shortage · ${student.classes_needed}` : "On track"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

const pageShell = {
  minHeight: "100vh",
  background: "#f4f7f6",
  padding: "40px",
  boxSizing: "border-box" as const,
};

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

const inputStyle = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #c5d4ce",
  fontSize: "1rem",
};

const primaryButton = {
  background: "#0f6b57",
  color: "#fff",
  border: 0,
  borderRadius: "10px",
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButton = {
  background: "#fff",
  color: "#0f6b57",
  border: "1px solid #c5d4ce",
  borderRadius: "10px",
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const linkButton = {
  border: 0,
  background: "transparent",
  color: "#0f6b57",
  fontWeight: 700,
  cursor: "pointer",
  padding: 0,
  textAlign: "left" as const,
};

const chip = {
  fontSize: "0.72rem",
  fontWeight: 700,
  background: "#e8f3ef",
  color: "#0f6b57",
  padding: "2px 8px",
  borderRadius: "4px",
};

const chipMuted = {
  ...chip,
  background: "#f0f4f2",
  color: "#4d625c",
};

const chipWarn = {
  ...chip,
  background: "#fff1f0",
  color: "#9f2d22",
};

const bannerError = {
  padding: "12px 16px",
  background: "#fff1f0",
  color: "#9f2d22",
  borderRadius: "12px",
  fontWeight: 600,
};

const bannerWarn = {
  padding: "12px 16px",
  background: "#fff7e8",
  color: "#8a5a12",
  borderRadius: "12px",
  fontWeight: 600,
};

const bannerOk = {
  padding: "12px 16px",
  background: "#e8f3ef",
  color: "#0f6b57",
  borderRadius: "12px",
  fontWeight: 600,
};

const meterTrack = {
  marginTop: "12px",
  height: "8px",
  background: "#e8f3ef",
  borderRadius: "999px",
  overflow: "hidden" as const,
};

const meterFill = {
  height: "100%",
  borderRadius: "999px",
};

const presentOn = {
  background: "#0f6b57",
  color: "#fff",
  border: 0,
  borderRadius: "999px",
  padding: "6px 12px",
  fontWeight: 700,
  cursor: "pointer",
};

const absentOn = {
  background: "#b42318",
  color: "#fff",
  border: 0,
  borderRadius: "999px",
  padding: "6px 12px",
  fontWeight: 700,
  cursor: "pointer",
};

const toggleOff = {
  background: "#fff",
  color: "#4d625c",
  border: "1px solid #c5d4ce",
  borderRadius: "999px",
  padding: "6px 12px",
  fontWeight: 700,
  cursor: "pointer",
};
