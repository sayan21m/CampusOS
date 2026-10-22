import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  createNotice,
  deleteNotice,
  downloadNoticeAttachment,
  fetchNotices,
  markNoticeRead,
  updateNotice,
} from "../services/campus";

export default function NoticesPage() {
  const { user } = useAuth() as { user: { role?: string; user_id?: number } | null };
  const canSeeReads = user?.role === "ADMIN" || user?.role === "FACULTY";
  const canPublish = user?.role === "ADMIN" || user?.role === "FACULTY";
  const [editingId, setEditingId] = useState<number | null>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [openId, setOpenId] = useState<string | number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [noticeFile, setNoticeFile] = useState<File | null>(null);
  const [noticeForm, setNoticeForm] = useState({
    title: "",
    content: "",
    category: "academic",
    priority: "normal",
    target_type: "all",
    target_value: "ALL",
  });

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        setNotices(await fetchNotices());
      } catch {
        setError("Unable to load notices from the CampusOS API.");
        setNotices([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  function canManageNotice(item: any) {
    return user?.role === "ADMIN" || item.created_by === user?.user_id;
  }

  function startEdit(item: any) {
    setEditingId(item.id);
    setNoticeForm({
      title: item.title || "",
      content: item.content || "",
      category: item.category || "academic",
      priority: item.priority || "normal",
      target_type: item.target_type || "all",
      target_value: item.target_value || "ALL",
    });
    setNoticeFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setNoticeForm((prev) => ({ ...prev, title: "", content: "" }));
    setNoticeFile(null);
  }

  async function handlePublish(event: FormEvent) {
    event.preventDefault();
    try {
      setPublishing(true);
      setError("");
      setNotice("");
      if (editingId) {
        await updateNotice(editingId, noticeForm);
        setNotice("Notice updated.");
      } else {
        await createNotice(noticeForm, noticeFile || undefined);
        setNotice("Notice published.");
      }
      cancelEdit();
      setNotices(await fetchNotices());
    } catch {
      setError(editingId ? "Could not update notice." : "Could not publish notice.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete(item: any) {
    if (!window.confirm(`Delete notice “${item.title}”?`)) return;
    try {
      setError("");
      await deleteNotice(item.id);
      if (editingId === item.id) {
        cancelEdit();
      }
      setNotices(await fetchNotices());
      setNotice("Notice deleted.");
    } catch {
      setError("Could not delete notice.");
    }
  }

  async function openNotice(notice: any) {
    setOpenId(notice.id);
    if (notice.is_read) {
      return;
    }

    try {
      await markNoticeRead(notice.id);
      setNotices((current) =>
        current.map((item) =>
          item.id === notice.id
            ? {
                ...item,
                is_read: true,
                read_count:
                  typeof item.read_count === "number" ? item.read_count + 1 : item.read_count,
              }
            : item
        )
      );
    } catch {
      // Listing still works if read tracking is unavailable.
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7f6", padding: "40px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, color: "#12241f" }}>Notices</h1>
            <p style={{ margin: "6px 0 0", color: "#4d625c" }}>Live institutional announcements from the API.</p>
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

        {canPublish && (
          <form
            onSubmit={handlePublish}
            style={{ background: "#fff", border: "1px solid #d7e0dc", borderRadius: "16px", padding: "18px 20px", marginBottom: "16px", display: "grid", gap: "12px" }}
          >
            <h2 style={{ margin: 0, fontSize: "1.05rem", color: "#12241f" }}>
              {editingId ? "Edit notice" : "Publish notice"}
            </h2>
            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Title</span>
                <input required value={noticeForm.title} onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })} style={field} />
              </label>
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Category</span>
                <select value={noticeForm.category} onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })} style={field}>
                  {["academic", "exam", "event", "holiday", "urgent"].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Priority</span>
                <select value={noticeForm.priority} onChange={(e) => setNoticeForm({ ...noticeForm, priority: e.target.value })} style={field}>
                  {["normal", "important", "urgent"].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Target type</span>
                <select value={noticeForm.target_type} onChange={(e) => setNoticeForm({ ...noticeForm, target_type: e.target.value })} style={field}>
                  {["all", "dept", "year", "section"].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Target value</span>
                <input required value={noticeForm.target_value} onChange={(e) => setNoticeForm({ ...noticeForm, target_value: e.target.value })} style={field} />
              </label>
            </div>
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Content</span>
              <textarea required rows={3} value={noticeForm.content} onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })} style={field} />
            </label>
            {editingId ? null : (
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4d625c" }}>Attachment (optional)</span>
                <input type="file" onChange={(e) => setNoticeFile(e.target.files?.[0] || null)} />
              </label>
            )}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button type="submit" disabled={publishing} style={{ background: "#0f6b57", color: "#fff", border: 0, borderRadius: "10px", padding: "10px 16px", fontWeight: 700, cursor: publishing ? "wait" : "pointer", width: "fit-content" }}>
                {publishing ? "Saving..." : editingId ? "Save changes" : "Publish notice"}
              </button>
              {editingId ? (
                <button type="button" onClick={cancelEdit} style={btnGhost}>
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        )}

        {loading ? (
          <div style={{ padding: "24px", background: "#fff", borderRadius: "16px", border: "1px solid #d7e0dc", color: "#6a827b" }}>
            Loading notices...
          </div>
        ) : notices.length === 0 ? (
          <div style={{ padding: "24px", background: "#fff", borderRadius: "16px", border: "1px solid #d7e0dc", color: "#6a827b" }}>
            No notices available for your account.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {notices.map((notice) => {
              const open = openId === notice.id;
              return (
                <article
                  key={notice.id}
                  style={{
                    background: "#fff",
                    border: "1px solid #d7e0dc",
                    borderRadius: "16px",
                    padding: "18px 20px",
                    opacity: notice.is_read ? 0.92 : 1,
                  }}
                >
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background: notice.urgent ? "#fde8e8" : "#e8f3ef",
                        color: notice.urgent ? "#9f2d22" : "#0f6b57",
                        padding: "2px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      {notice.tag}
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "#6a827b" }}>{notice.date}</span>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background: notice.is_read ? "#edf7ed" : "#fff4e5",
                        color: notice.is_read ? "#1f6b3a" : "#8a5300",
                        padding: "2px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      {notice.is_read ? "Read" : "Unread"}
                    </span>
                    {canSeeReads && typeof notice.read_count === "number" ? (
                      <span style={{ fontSize: "0.78rem", color: "#4d625c" }}>{notice.read_count} opened</span>
                    ) : null}
                  </div>
                  <h2 style={{ margin: "0 0 8px", fontSize: "1.05rem", color: "#12241f" }}>{notice.title}</h2>
                  {open ? (
                    <>
                      <p style={{ margin: "0 0 12px", color: "#4d625c", whiteSpace: "pre-wrap" }}>{notice.content}</p>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        {notice.has_attachment ? (
                          <button
                            type="button"
                            onClick={() => downloadNoticeAttachment(notice.id, notice.title)}
                            style={btn}
                          >
                            Download attachment
                          </button>
                        ) : null}
                        <button type="button" onClick={() => setOpenId(null)} style={btnGhost}>
                          Collapse
                        </button>
                        {canPublish && canManageNotice(notice) ? (
                          <>
                            <button type="button" onClick={() => startEdit(notice)} style={btnGhost}>
                              Edit
                            </button>
                            <button type="button" onClick={() => handleDelete(notice)} style={btnGhost}>
                              Delete
                            </button>
                          </>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <button type="button" onClick={() => openNotice(notice)} style={btnGhost}>
                      {notice.has_attachment ? "Read notice & attachment" : "Read notice"}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const btn = {
  background: "#0f6b57",
  color: "#fff",
  border: 0,
  borderRadius: "10px",
  padding: "8px 14px",
  fontWeight: 700,
  cursor: "pointer",
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

const field = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #c5d4ce",
  width: "100%",
  boxSizing: "border-box" as const,
};
