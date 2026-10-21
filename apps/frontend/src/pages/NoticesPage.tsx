import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { downloadNoticeAttachment, fetchNotices, markNoticeRead } from "../services/campus";

export default function NoticesPage() {
  const { user } = useAuth() as { user: { role?: string } | null };
  const canSeeReads = user?.role === "ADMIN" || user?.role === "FACULTY";
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | number | null>(null);

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
