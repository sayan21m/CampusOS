import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  deleteNote,
  downloadNoteFile,
  fetchNotes,
  fetchSubjects,
  previewNoteFile,
  uploadNote,
} from "../services/campus";

const MATERIAL_TYPES = [
  "LECTURE_NOTES",
  "PRESENTATIONS",
  "LAB_MANUALS",
  "REFERENCE_MATERIAL",
  "PREVIOUS_YEAR_PAPERS",
] as const;

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

export default function NotesPage() {
  const { user } = useAuth() as { user: { role?: string } | null };
  const isFaculty = user?.role === "FACULTY";

  const [notes, setNotes] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [uploadForm, setUploadForm] = useState({
    subjectId: "",
    title: "",
    description: "",
    unitNumber: "1",
    materialType: "LECTURE_NOTES",
    academicYear: String(new Date().getFullYear()),
    file: null as File | null,
  });

  const subjectMap = useMemo(() => {
    const map = new Map<number, string>();
    subjects.forEach((subject) => {
      map.set(subject.subject_id, `${subject.subject_code} — ${subject.subject_name}`);
    });
    return map;
  }, [subjects]);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const params: Record<string, string | number> = {};
      if (filterSubject) params.subject_id = Number(filterSubject);
      if (filterUnit) params.unit_number = Number(filterUnit);

      const [noteRows, subjectRows] = await Promise.all([
        fetchNotes(params),
        fetchSubjects().catch(() => []),
      ]);
      setNotes(noteRows);
      setSubjects(subjectRows);
      if (!uploadForm.subjectId && subjectRows[0]) {
        setUploadForm((prev) => ({ ...prev, subjectId: String(subjectRows[0].subject_id) }));
      }
    } catch {
      setNotes([]);
      setError("Unable to load study materials from the CampusOS API.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSubject, filterUnit]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function handleDownload(note: any) {
    try {
      setBusyId(note.id);
      setError("");
      await downloadNoteFile(note.id, note.title);
    } catch {
      setError("Download failed. You may not have access to this file.");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePreview(note: any) {
    try {
      setBusyId(note.id);
      setError("");
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
      const url = await previewNoteFile(note.id);
      setPreviewUrl(url);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Preview is only available for PDF materials you can access.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(note: any) {
    if (!window.confirm(`Delete "${note.title}"?`)) {
      return;
    }

    try {
      setBusyId(note.id);
      setError("");
      await deleteNote(note.id);
      await load();
    } catch {
      setError("Unable to delete this material.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    if (!uploadForm.file || !uploadForm.subjectId || !uploadForm.title.trim()) {
      setError("Subject, title, and file are required to upload.");
      return;
    }

    try {
      setBusyId(-1);
      setError("");
      await uploadNote({
        file: uploadForm.file,
        subjectId: Number(uploadForm.subjectId),
        title: uploadForm.title.trim(),
        description: uploadForm.description.trim(),
        unitNumber: Number(uploadForm.unitNumber),
        materialType: uploadForm.materialType,
        academicYear: Number(uploadForm.academicYear),
      });
      setUploadForm((prev) => ({
        ...prev,
        title: "",
        description: "",
        file: null,
      }));
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Upload failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={pageShell}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, color: "#12241f" }}>Notes & LMS</h1>
            <p style={{ margin: "6px 0 0", color: "#4d625c" }}>
              Study materials from the notes API — browse, preview PDFs, and download files.
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

        <div style={{ ...card, marginBottom: "16px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", gap: "6px", minWidth: "220px", flex: 1 }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Subject</span>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #c5d4ce" }}
            >
              <option value="">All subjects</option>
              {subjects.map((subject) => (
                <option key={subject.subject_id} value={subject.subject_id}>
                  {subject.subject_code} — {subject.subject_name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: "6px", width: "120px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Unit</span>
            <input
              type="number"
              min={1}
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              placeholder="Any"
              style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #c5d4ce" }}
            />
          </label>
        </div>

        {isFaculty && (
          <form onSubmit={handleUpload} style={{ ...card, marginBottom: "16px", display: "grid", gap: "12px" }}>
            <h2 style={{ margin: 0, fontSize: "1.05rem", color: "#12241f" }}>Upload material</h2>
            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Subject</span>
                <select
                  value={uploadForm.subjectId}
                  onChange={(e) => setUploadForm({ ...uploadForm, subjectId: e.target.value })}
                  required
                  style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #c5d4ce" }}
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
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Unit</span>
                <input
                  type="number"
                  min={1}
                  value={uploadForm.unitNumber}
                  onChange={(e) => setUploadForm({ ...uploadForm, unitNumber: e.target.value })}
                  required
                  style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #c5d4ce" }}
                />
              </label>
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Type</span>
                <select
                  value={uploadForm.materialType}
                  onChange={(e) => setUploadForm({ ...uploadForm, materialType: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #c5d4ce" }}
                >
                  {MATERIAL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Academic year</span>
                <input
                  type="number"
                  value={uploadForm.academicYear}
                  onChange={(e) => setUploadForm({ ...uploadForm, academicYear: e.target.value })}
                  required
                  style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #c5d4ce" }}
                />
              </label>
            </div>
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Title</span>
              <input
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                required
                style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #c5d4ce" }}
              />
            </label>
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Description</span>
              <textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                rows={2}
                style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #c5d4ce", resize: "vertical" }}
              />
            </label>
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>File (PDF, DOCX, PPTX, PNG, JPG, ZIP)</span>
              <input
                type="file"
                onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                required
              />
            </label>
            <button
              type="submit"
              disabled={busyId === -1}
              style={{
                justifySelf: "start",
                background: "#0f6b57",
                color: "#fff",
                border: 0,
                borderRadius: "10px",
                padding: "10px 18px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {busyId === -1 ? "Uploading..." : "Upload material"}
            </button>
          </form>
        )}

        {loading ? (
          <div style={{ ...card, color: "#6a827b" }}>Loading study materials...</div>
        ) : notes.length === 0 ? (
          <div style={{ ...card, color: "#6a827b" }}>No materials found for the selected filters.</div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {notes.map((note) => (
              <article key={note.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "#e8f3ef", color: "#0f6b57", padding: "2px 8px", borderRadius: "4px" }}>
                        Unit {note.unitNumber}
                      </span>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "#f0f4f2", color: "#4d625c", padding: "2px 8px", borderRadius: "4px" }}>
                        {String(note.materialType || "").replaceAll("_", " ")}
                      </span>
                    </div>
                    <h2 style={{ margin: "0 0 6px", fontSize: "1.05rem", color: "#12241f" }}>{note.title}</h2>
                    <p style={{ margin: "0 0 6px", color: "#6a827b", fontSize: "0.88rem" }}>
                      {subjectMap.get(note.subjectId) || `${note.subjectCode} — ${note.subjectName}`}
                    </p>
                    {note.description && (
                      <p style={{ margin: 0, color: "#4d625c", whiteSpace: "pre-wrap" }}>{note.description}</p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => handlePreview(note)}
                      disabled={busyId === note.id}
                      style={{ background: "#e8f3ef", color: "#0f6b57", border: 0, borderRadius: "10px", padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(note)}
                      disabled={busyId === note.id}
                      style={{ background: "#0f6b57", color: "#fff", border: 0, borderRadius: "10px", padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}
                    >
                      Download
                    </button>
                    {isFaculty && (
                      <button
                        type="button"
                        onClick={() => handleDelete(note)}
                        disabled={busyId === note.id}
                        style={{ background: "#fff1f0", color: "#9f2d22", border: 0, borderRadius: "10px", padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
