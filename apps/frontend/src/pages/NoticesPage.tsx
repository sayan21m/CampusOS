import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchNotices } from "../services/campus";

export default function NoticesPage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
            {notices.map((notice) => (
              <article
                key={notice.id}
                style={{ background: "#fff", border: "1px solid #d7e0dc", borderRadius: "16px", padding: "18px 20px" }}
              >
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
                <p style={{ margin: 0, color: "#4d625c", whiteSpace: "pre-wrap" }}>{notice.content}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
