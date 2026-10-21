import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  fetchFacultyAssignments,
  fetchNotices,
  fetchTodayTimetable,
  toDateKey,
} from "../services/campus";
import "./faculty_dashboard.css";

function getInitials(name) {
  if (!name) {
    return "F";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function FacultyDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [todayClasses, setTodayClasses] = useState([]);
  const [notices, setNotices] = useState([]);
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [error, setError] = useState("");

  const displayName = profile?.full_name || user?.name || "Faculty";
  const initials = useMemo(() => getInitials(displayName), [displayName]);

  useEffect(() => {
    async function load() {
      try {
        setError("");
        const [profileRes, classes, noticeRows, assignments] = await Promise.all([
          api.get("/profile"),
          fetchTodayTimetable(),
          fetchNotices(),
          fetchFacultyAssignments().catch(() => []),
        ]);

        setProfile(profileRes.data?.profile || profileRes.data || null);
        setTodayClasses(classes);
        setNotices(noticeRows.slice(0, 4));
        setAssignmentCount(Array.isArray(assignments) ? assignments.length : 0);
      } catch {
        setError("Unable to sync some faculty dashboard data from the API.");
      }
    }

    load();
  }, []);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="faculty-dashboard">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">🎓</div>
          <div>
            <h2>CampusOS</h2>
            <span>Faculty Portal</span>
          </div>
        </div>

        <div className="menu-title">OVERVIEW</div>
        <nav>
          <Link to="/dashboard" className="menu-item active">
            <span>⌂</span>
            <span>Dashboard</span>
          </Link>
          <Link to="/faculty-profile" className="menu-item">
            <span>♙</span>
            <span>My Profile</span>
          </Link>
          <Link to="/timetable" className="menu-item">
            <span>▣</span>
            <span>My Classes</span>
          </Link>
        </nav>

        <div className="menu-title">ACADEMIC</div>
        <nav>
          <Link to="/attendance" className="menu-item">
            <span>▥</span>
            <span>Attendance</span>
          </Link>
          <Link to="/timetable" className="menu-item">
            <span>▦</span>
            <span>Timetable</span>
          </Link>
          <Link to="/notes" className="menu-item">
            <span>▤</span>
            <span>Study Materials</span>
          </Link>
          <Link to="/notices" className="menu-item">
            <span>⚑</span>
            <span>Notices</span>
          </Link>
        </nav>

        <div className="menu-title">OTHERS</div>
        <nav>
          <button type="button" className="menu-item" onClick={handleLogout} style={{ width: "100%", border: 0, background: "transparent", cursor: "pointer" }}>
            <span>↪</span>
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p>Faculty Portal</p>
            <h1>Dashboard</h1>
          </div>

          <div className="faculty-account">
            <div className="account-avatar">{initials}</div>
            <div>
              <strong>Prof. {displayName}</strong>
              <small>{profile?.designation || "Faculty"}</small>
            </div>
          </div>
        </header>

        <section className="dashboard-body">
          {error && (
            <div style={{ marginBottom: "16px", padding: "12px 16px", background: "#fff1f0", color: "#9f2d22", borderRadius: "12px", fontWeight: 600 }}>
              {error}
            </div>
          )}

          <section className="profile-banner">
            <div className="profile-left">
              <div className="large-avatar">{initials}</div>
              <div className="profile-details">
                <h2>Prof. {displayName}</h2>
                <p>{profile?.designation || "Faculty Member"}</p>
                <div className="faculty-info">
                  <div>
                    <span>🏫</span>
                    <div>
                      <small>Department</small>
                      <strong>
                        {profile?.department?.dept_name ||
                          profile?.department_name ||
                          "Department sync pending"}
                      </strong>
                    </div>
                  </div>
                  <div>
                    <span>♙</span>
                    <div>
                      <small>Employee ID</small>
                      <strong>{profile?.employee_id || profile?.employeeId || "—"}</strong>
                    </div>
                  </div>
                  <div>
                    <span>✉</span>
                    <div>
                      <small>Email</small>
                      <strong>{user?.email || "—"}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="welcome">
              <span>☀</span>
              <strong>Welcome back,</strong>
              <small>Live data synced from CampusOS API</small>
            </div>
          </section>

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon green">♟</div>
              <div>
                <span>Today&apos;s Classes</span>
                <h2>{todayClasses.length}</h2>
                <small>From timetable API</small>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue">♟</div>
              <div>
                <span>My Assignments</span>
                <h2>{assignmentCount}</h2>
                <small>Created by you</small>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon purple">⚑</div>
              <div>
                <span>Recent Notices</span>
                <h2>{notices.length}</h2>
                <small>Visible to you</small>
              </div>
            </div>
          </section>

          <section className="middle-grid">
            <div className="card quick-card" style={{ gridColumn: "1 / -1" }}>
              <div className="card-title">
                <div className="quick-icon">⚡</div>
                <h2>Quick Actions</h2>
              </div>
              <div className="quick-grid">
                <Link to="/attendance" className="menu-item" style={{ textDecoration: "none" }}>
                  <span>▣</span>
                  <strong>Mark Attendance</strong>
                  <b>→</b>
                </Link>
                <Link to="/timetable" className="menu-item" style={{ textDecoration: "none" }}>
                  <span>▦</span>
                  <strong>View Timetable</strong>
                  <b>→</b>
                </Link>
                <Link to="/assignments" className="menu-item" style={{ textDecoration: "none" }}>
                  <span>▤</span>
                  <strong>Manage Assignments</strong>
                  <b>→</b>
                </Link>
                <Link to="/notes" className="menu-item" style={{ textDecoration: "none" }}>
                  <span>☁</span>
                  <strong>Upload Study Material</strong>
                  <b>→</b>
                </Link>
              </div>
            </div>
          </section>

          <section className="bottom-grid">
            <div className="card classes-card">
              <div className="card-title-row">
                <div className="card-title">
                  <div className="small-icon">▦</div>
                  <h2>Today&apos;s Classes</h2>
                </div>
                <Link to="/timetable">View All →</Link>
              </div>
              <div className="class-table">
                <div className="table-header">
                  <span>Time</span>
                  <span>Subject</span>
                  <span>Status</span>
                  <span>Room</span>
                  <span>Attendance</span>
                </div>
                {todayClasses.length === 0 ? (
                  <div className="table-row">
                    <span>—</span>
                    <span>No classes scheduled for today</span>
                    <span>—</span>
                    <span>—</span>
                    <span>—</span>
                  </div>
                ) : (
                  todayClasses.map((item) => (
                    <div className="table-row" key={`${item.id}-${item.time}`}>
                      <span>{item.time}</span>
                      <span>
                        {item.code} – {item.subject}
                      </span>
                      <span>{item.status}</span>
                      <span>{item.room}</span>
                      <span>
                        {item.cancelled ? (
                          "—"
                        ) : (
                          <Link
                            to={`/attendance?date=${toDateKey()}&class=${item.id}`}
                            className="mark-attendance-link"
                          >
                            Mark
                          </Link>
                        )}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card notices-card">
              <div className="card-title-row">
                <div className="card-title">
                  <div className="small-icon">⚑</div>
                  <h2>Recent Notices</h2>
                </div>
                <Link to="/notices">View All →</Link>
              </div>
              <div className="notices-list">
                {notices.length === 0 ? (
                  <div className="notice">
                    <span className="notice-dot green"></span>
                    <div className="notice-content">
                      <strong>No notices yet</strong>
                      <p>Campus notices will appear here when available.</p>
                    </div>
                  </div>
                ) : (
                  notices.map((notice) => (
                    <div className="notice" key={notice.id}>
                      <span className={`notice-dot ${notice.urgent ? "orange" : "green"}`}></span>
                      <div className="notice-content">
                        <strong>{notice.title}</strong>
                        <p>{notice.content || notice.tag}</p>
                      </div>
                      <time>{notice.date}</time>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

export default FacultyDashboard;
