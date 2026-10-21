import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchNotices } from "../services/campus";

export default function NotificationsPage() {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [priority, setPriority] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        setNotices(await fetchNotices());
      } catch {
        setNotices([]);
        setError("Unable to load notifications from the notices API.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filtered = notices.filter((notice) => {
    if (priority === "all") return true;
    if (priority === "urgent") return notice.urgent;
    return String(notice.priority || "").toLowerCase() === priority;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7f6", padding: "40px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, color: "#12241f" }}>Notifications</h1>
            <p style={{ margin: "6px 0 0", color: "#4d625c" }}>
              Personal alert inbox powered by institutional notices.
            </p>
          </div>
          <Link to="/dashboard" style={{ color: "#0f6b57", fontWeight: 700, textDecoration: "none", alignSelf: "center" }}>
            ← Back to Dashboard
          </Link>
        </div>

        <div style={{ marginBottom: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            ["all", "All"],
            ["urgent", "Urgent"],
            ["normal", "Normal"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPriority(value)}
              style={{
                background: priority === value ? "#0f6b57" : "#fff",
                color: priority === value ? "#fff" : "#0f6b57",
                border: "1px solid #c5d4ce",
                borderRadius: "999px",
                padding: "6px 14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
          <Link to="/notices" style={{ marginLeft: "auto", color: "#0f6b57", fontWeight: 700, textDecoration: "none", alignSelf: "center" }}>
            Open notices board →
          </Link>
        </div>

        {error && (
          <div style={{ marginBottom: "16px", padding: "12px 16px", background: "#fff1f0", color: "#9f2d22", borderRadius: "12px", fontWeight: 600 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={card}>Loading notifications...</div>
        ) : filtered.length === 0 ? (
          <div style={card}>No notifications in this filter.</div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {filtered.map((notice) => (
              <article key={notice.id} style={{ ...card, color: "#4d625c" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
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
                </div>
                <h2 style={{ margin: "0 0 8px", fontSize: "1.05rem", color: "#12241f" }}>{notice.title}</h2>
                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{notice.content}</p>
              </article>
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
  padding: "18px 20px",
  color: "#6a827b",
};
