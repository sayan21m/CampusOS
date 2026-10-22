import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  createAssignment,
  downloadAllSubmissionFiles,
  downloadSubmissionFile,
  fetchAssignmentSubmissions,
  fetchFacultyAssignments,
  fetchSubjects,
  gradeSubmission,
  updateAssignment,
} from "../services/campus";

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
  padding: "18px 20px",
};

const inputStyle = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #c5d4ce",
  width: "100%",
  boxSizing: "border-box" as const,
};

function apiMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
  );
}

function defaultDeadline() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function toDatetimeLocal(value: string | Date | undefined) {
  if (!value) return defaultDeadline();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return defaultDeadline();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export default function FacultyAssignments() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [roster, setRoster] = useState<any>(null);
  const [grades, setGrades] = useState<Record<number, { marks: string; feedback: string }>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    subject_id: "",
    title: "",
    description: "",
    section: "ALL",
    deadline: defaultDeadline(),
    max_marks: "10",
    allow_late: false,
    attachment_url: "",
  });

  const selectedAssignment = useMemo(
    () => assignments.find((item) => item.assignment_id === selectedId) || null,
    [assignments, selectedId]
  );

  async function loadAssignments() {
    const [rows, subjectRows] = await Promise.all([
      fetchFacultyAssignments(),
      fetchSubjects().catch(() => []),
    ]);
    setAssignments(rows);
    setSubjects(subjectRows);
    if (!form.subject_id && subjectRows[0]) {
      setForm((prev) => ({ ...prev, subject_id: String(subjectRows[0].subject_id) }));
    }
  }

  async function loadRoster(assignmentId: number) {
    const data = await fetchAssignmentSubmissions(assignmentId);
    setRoster(data);
    const next: Record<number, { marks: string; feedback: string }> = {};
    (data.students || []).forEach((row: any) => {
      if (row.submission?.submission_id) {
        next[row.submission.submission_id] = {
          marks: row.submission.marks == null ? "" : String(row.submission.marks),
          feedback: row.submission.feedback || "",
        };
      }
    });
    setGrades(next);
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        await loadAssignments();
      } catch (err) {
        setAssignments([]);
        setError(apiMessage(err, "Unable to load assignments from the CampusOS API."));
      } finally {
        setLoading(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetAssignmentForm() {
    setEditingId(null);
    setForm((prev) => ({
      ...prev,
      title: "",
      description: "",
      attachment_url: "",
      deadline: defaultDeadline(),
      allow_late: false,
    }));
  }

  function startEdit(item: any) {
    setEditingId(item.assignment_id);
    setForm({
      subject_id: String(item.subject_id || item.subject?.subject_id || form.subject_id),
      title: item.title || "",
      description: item.description || "",
      section: item.section || "ALL",
      deadline: toDatetimeLocal(item.deadline),
      max_marks: String(item.max_marks || 10),
      allow_late: Boolean(item.allow_late),
      attachment_url: item.attachment_url || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    try {
      setCreating(true);
      setError("");
      setNotice("");
      if (editingId) {
        await updateAssignment(editingId, {
          title: form.title,
          description: form.description,
          deadline: new Date(form.deadline).toISOString(),
          max_marks: Number(form.max_marks),
          allow_late: Boolean(form.allow_late),
          ...(form.attachment_url.trim() ? { attachment_url: form.attachment_url.trim() } : {}),
        });
        setNotice("Assignment updated.");
      } else {
        await createAssignment({
          subject_id: Number(form.subject_id),
          title: form.title,
          description: form.description,
          section: form.section,
          deadline: new Date(form.deadline).toISOString(),
          max_marks: Number(form.max_marks),
          allow_late: Boolean(form.allow_late),
          ...(form.attachment_url.trim() ? { attachment_url: form.attachment_url.trim() } : {}),
        });
        setNotice("Assignment published.");
      }
      resetAssignmentForm();
      await loadAssignments();
    } catch (err) {
      setError(apiMessage(err, editingId ? "Could not update assignment." : "Could not create assignment."));
    } finally {
      setCreating(false);
    }
  }

  async function openSubmissions(assignmentId: number) {
    try {
      setError("");
      setSelectedId(assignmentId);
      await loadRoster(assignmentId);
    } catch (err) {
      setRoster(null);
      setError(apiMessage(err, "Unable to load submissions."));
    }
  }

  async function handleGrade(submissionId: number) {
    const entry = grades[submissionId];
    if (!entry || entry.marks === "") {
      setError("Enter marks before saving a grade.");
      return;
    }

    try {
      setSavingId(submissionId);
      setError("");
      setNotice("");
      await gradeSubmission(submissionId, {
        marks: Number(entry.marks),
        feedback: entry.feedback.trim(),
      });
      if (selectedId) {
        await loadRoster(selectedId);
      }
      await loadAssignments();
      setNotice("Submission graded.");
    } catch (err) {
      setError(apiMessage(err, "Could not save grade."));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div style={pageShell}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, color: "#12241f" }}>Assignments</h1>
            <p style={{ margin: "6px 0 0", color: "#4d625c" }}>
              Create or edit assignments, review submissions, and record marks.
            </p>
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
        {notice && (
          <div style={{ marginBottom: "16px", padding: "12px 16px", background: "#edf7ed", color: "#1f6b3a", borderRadius: "12px", fontWeight: 600 }}>
            {notice}
          </div>
        )}

        <form onSubmit={handleCreate} style={{ ...card, marginBottom: "16px", display: "grid", gap: "12px" }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem", color: "#12241f" }}>
            {editingId ? "Edit assignment" : "Create assignment"}
          </h2>
          <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Subject</span>
              <select
                required
                disabled={Boolean(editingId)}
                value={form.subject_id}
                onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                style={inputStyle}
              >
                <option value="" disabled>
                  Select subject
                </option>
                {subjects.map((subject) => (
                  <option key={subject.subject_id} value={subject.subject_id}>
                    {subject.subject_code} — {subject.subject_name}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Section</span>
              <input
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                placeholder="ALL or A"
                required
                disabled={Boolean(editingId)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Deadline</span>
              <input
                type="datetime-local"
                required
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                style={inputStyle}
              />
            </label>
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Max marks</span>
              <input
                type="number"
                min={1}
                required
                value={form.max_marks}
                onChange={(e) => setForm({ ...form, max_marks: e.target.value })}
                style={inputStyle}
              />
            </label>
          </div>
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Title</span>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Description</span>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Attachment URL (optional)</span>
            <input
              type="url"
              value={form.attachment_url}
              onChange={(e) => setForm({ ...form, attachment_url: e.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={{ display: "flex", gap: "8px", alignItems: "center", color: "#4d625c", fontWeight: 700 }}>
            <input
              type="checkbox"
              checked={form.allow_late}
              onChange={(e) => setForm({ ...form, allow_late: e.target.checked })}
            />
            Allow late submissions
          </label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={creating}
              style={{
                background: "#0f6b57",
                color: "#fff",
                border: 0,
                borderRadius: "10px",
                padding: "10px 16px",
                fontWeight: 700,
                cursor: creating ? "wait" : "pointer",
                width: "fit-content",
              }}
            >
              {creating ? "Saving..." : editingId ? "Save changes" : "Publish assignment"}
            </button>
            {editingId ? (
              <button type="button" onClick={resetAssignmentForm} style={btnGhost}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>

        {loading ? (
          <div style={card}>Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div style={card}>No assignments created yet.</div>
        ) : (
          <div style={{ display: "grid", gap: "12px", marginBottom: "16px" }}>
            {assignments.map((item) => (
              <article key={item.assignment_id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <h2 style={{ margin: "0 0 6px", fontSize: "1.05rem", color: "#12241f" }}>{item.title}</h2>
                    <p style={{ margin: 0, color: "#6a827b", fontSize: "0.88rem" }}>
                      {item.subject?.subject_code || "Subject"} · Section {item.section} · Due{" "}
                      {new Date(item.deadline).toLocaleString()} · {item.submission_count} submitted · {item.graded_count} graded
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button type="button" onClick={() => startEdit(item)} style={btnGhost}>
                      Edit
                    </button>
                    <button type="button" onClick={() => openSubmissions(item.assignment_id)} style={btnGhost}>
                      Review submissions
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadAllSubmissionFiles(item.assignment_id).catch((err) => setError(apiMessage(err, "Download failed.")))}
                      style={btnGhost}
                    >
                      Download all
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {selectedAssignment && roster && (
          <section style={card}>
            <h2 style={{ margin: "0 0 12px", fontSize: "1.05rem", color: "#12241f" }}>
              Submissions · {roster.assignment?.title || selectedAssignment.title}
            </h2>
            {(roster.students || []).length === 0 ? (
              <p style={{ margin: 0, color: "#6a827b" }}>No students found for this assignment target.</p>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {roster.students.map((row: any) => (
                  <div key={row.student_id} style={{ borderTop: "1px solid #e2ece8", paddingTop: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "8px" }}>
                      <div>
                        <strong style={{ color: "#12241f" }}>{row.full_name}</strong>
                        <div style={{ color: "#6a827b", fontSize: "0.82rem" }}>
                          {row.roll_number} · {row.status}
                          {row.submission?.is_late ? " · Late" : ""}
                        </div>
                      </div>
                      {row.submission?.submission_id ? (
                        <button
                          type="button"
                          onClick={() =>
                            downloadSubmissionFile(row.submission.submission_id).catch((err) =>
                              setError(apiMessage(err, "Download failed."))
                            )
                          }
                          style={btnGhost}
                        >
                          Download
                        </button>
                      ) : null}
                    </div>
                    {row.submission?.submission_id ? (
                      <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "120px 1fr auto" }}>
                        <input
                          type="number"
                          min={0}
                          max={roster.assignment?.max_marks || selectedAssignment.max_marks}
                          placeholder="Marks"
                          value={grades[row.submission.submission_id]?.marks || ""}
                          onChange={(e) =>
                            setGrades((current) => ({
                              ...current,
                              [row.submission.submission_id]: {
                                marks: e.target.value,
                                feedback: current[row.submission.submission_id]?.feedback || "",
                              },
                            }))
                          }
                          style={inputStyle}
                        />
                        <input
                          placeholder="Feedback (optional)"
                          value={grades[row.submission.submission_id]?.feedback || ""}
                          onChange={(e) =>
                            setGrades((current) => ({
                              ...current,
                              [row.submission.submission_id]: {
                                marks: current[row.submission.submission_id]?.marks || "",
                                feedback: e.target.value,
                              },
                            }))
                          }
                          style={inputStyle}
                        />
                        <button
                          type="button"
                          disabled={savingId === row.submission.submission_id}
                          onClick={() => handleGrade(row.submission.submission_id)}
                          style={{
                            background: "#0f6b57",
                            color: "#fff",
                            border: 0,
                            borderRadius: "10px",
                            padding: "8px 14px",
                            fontWeight: 700,
                            cursor: savingId === row.submission.submission_id ? "wait" : "pointer",
                          }}
                        >
                          {savingId === row.submission.submission_id ? "Saving..." : "Save grade"}
                        </button>
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: "#6a827b", fontSize: "0.85rem" }}>Not submitted.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

const btnGhost = {
  background: "#fff",
  border: "1px solid #c5d4ce",
  borderRadius: "10px",
  padding: "8px 14px",
  fontWeight: 700,
  color: "#0f6b57",
  cursor: "pointer",
};
