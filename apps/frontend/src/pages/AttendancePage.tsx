import { Link } from "react-router-dom";

export default function AttendancePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f4f7f6", padding: "40px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", background: "#fff", border: "1px solid #d7e0dc", borderRadius: "16px", padding: "32px" }}>
        <h1 style={{ margin: "0 0 12px", color: "#12241f" }}>Attendance</h1>
        <p style={{ margin: "0 0 16px", color: "#4d625c", lineHeight: 1.5 }}>
          There is no attendance API in CampusOS yet, so this module cannot be wired to live records.
          Related schedule data is available from the timetable endpoints.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link
            to="/timetable"
            style={{ background: "#0f6b57", color: "#fff", padding: "10px 18px", borderRadius: "10px", textDecoration: "none", fontWeight: 700 }}
          >
            Open timetable
          </Link>
          <Link
            to="/dashboard"
            style={{ background: "#e8f3ef", color: "#0f6b57", padding: "10px 18px", borderRadius: "10px", textDecoration: "none", fontWeight: 700 }}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
