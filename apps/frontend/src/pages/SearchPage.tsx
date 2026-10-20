import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchMyAssignments,
  fetchNotes,
  fetchNotices,
  fetchSubjects,
  fetchTodayTimetable,
} from "../services/campus";

type SearchHit = {
  id: string;
  type: string;
  title: string;
  detail: string;
  to: string;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [index, setIndex] = useState<SearchHit[]>([]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const [notices, assignments, notes, subjects, classes] = await Promise.all([
          fetchNotices().catch(() => []),
          fetchMyAssignments().catch(() => []),
          fetchNotes().catch(() => []),
          fetchSubjects().catch(() => []),
          fetchTodayTimetable().catch(() => []),
        ]);

        const hits: SearchHit[] = [
          ...notices.map((notice: any) => ({
            id: `notice-${notice.id}`,
            type: "Notice",
            title: notice.title,
            detail: notice.content?.slice(0, 140) || notice.tag,
            to: "/notices",
          })),
          ...assignments.map((item: any) => ({
            id: `assignment-${item.id}`,
            type: "Assignment",
            title: item.title,
            detail: `${item.subject} · ${item.status}`,
            to: "/assignments",
          })),
          ...notes.map((note: any) => ({
            id: `note-${note.id}`,
            type: "Notes",
            title: note.title,
            detail: `${note.subjectCode} · Unit ${note.unitNumber}`,
            to: "/notes",
          })),
          ...subjects.map((subject: any) => ({
            id: `subject-${subject.subject_id}`,
            type: "Subject",
            title: subject.subject_name,
            detail: subject.subject_code,
            to: "/notes",
          })),
          ...classes.map((cls: any) => ({
            id: `class-${cls.id}-${cls.time}`,
            type: "Timetable",
            title: cls.subject,
            detail: `${cls.time} · Room ${cls.room}`,
            to: "/timetable",
          })),
        ];

        setIndex(hits);
      } catch {
        setIndex([]);
        setError("Unable to build campus search index from the APIs.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return index.slice(0, 20);
    }

    return index.filter((hit) =>
      [hit.title, hit.detail, hit.type].some((value) => String(value).toLowerCase().includes(q))
    );
  }, [index, query]);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7f6", padding: "40px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, color: "#12241f" }}>Campus Search</h1>
            <p style={{ margin: "6px 0 0", color: "#4d625c" }}>
              Search notices, assignments, notes, subjects, and today&apos;s classes.
            </p>
          </div>
          <Link to="/dashboard" style={{ color: "#0f6b57", fontWeight: 700, textDecoration: "none", alignSelf: "center" }}>
            ← Back to Dashboard
          </Link>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search campus resources..."
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "14px 16px",
            borderRadius: "14px",
            border: "1px solid #c5d4ce",
            marginBottom: "16px",
            fontSize: "1rem",
          }}
        />

        {error && (
          <div style={{ marginBottom: "16px", padding: "12px 16px", background: "#fff1f0", color: "#9f2d22", borderRadius: "12px", fontWeight: 600 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={card}>Building search index...</div>
        ) : results.length === 0 ? (
          <div style={card}>No matches for “{query}”.</div>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {results.map((hit) => (
              <Link
                key={hit.id}
                to={hit.to}
                style={{ ...card, textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "#e8f3ef", color: "#0f6b57", padding: "2px 8px", borderRadius: "4px" }}>
                    {hit.type}
                  </span>
                </div>
                <h2 style={{ margin: "0 0 4px", fontSize: "1.02rem", color: "#12241f" }}>{hit.title}</h2>
                <p style={{ margin: 0, color: "#6a827b", fontSize: "0.88rem" }}>{hit.detail}</p>
              </Link>
            ))}
          </div>
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
