import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

interface ClassSchedule {
  time: string;
  subject: string;
  code: string;
  room: string;
  status: string;
}

interface Notice {
  title: string;
  date: string;
  tag: string;
  urgent: boolean;
}

export default function StudentDashboard(): React.JSX.Element {
  const { user, logout } = useAuth() as { user: any; logout: () => void };
  const navigate = useNavigate();

  const [todaysClasses, setTodaysClasses] = useState<ClassSchedule[]>([]);
  const [recentNotices, setRecentNotices] = useState<Notice[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoadingData(true);
        const scheduleData: ClassSchedule[] = [];
        const noticesData: Notice[] = [];

        setTodaysClasses(scheduleData);
        setRecentNotices(noticesData);
        setError("");
      } catch (err) {
        setError("Failed to synchronize live dashboard data from server.");
      } finally {
        setLoadingData(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7f6", padding: "0", fontFamily: "inherit", boxSizing: "border-box", width: "100%", pointerEvents: "auto" }}>
      <main style={{ width: "100%", margin: "0", boxSizing: "border-box", pointerEvents: "auto" }}>
        
        <div style={{ background: "#ffffff", borderRadius: "0", boxShadow: "none", overflow: "hidden", border: "none", width: "100%", boxSizing: "border-box", pointerEvents: "auto" }}>
          
          <div style={{ background: "linear-gradient(135deg, #09382e 0%, #0f6b57 100%)", padding: "40px", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px", position: "relative", pointerEvents: "auto" }}>
            
            <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "200px", height: "200px", background: "radial-gradient(circle, rgba(46, 204, 113, 0.25) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

            <div style={{ position: "relative", zIndex: 2, pointerEvents: "auto" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255, 255, 255, 0.18)", padding: "5px 12px", borderRadius: "30px", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "8px", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.2)" }}>
                <span>🟢</span> STUDENT DASHBOARD
              </div>
              <h1 style={{ margin: 0, fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
                Welcome back, {user?.name || "Scholar"}!
              </h1>
              <p style={{ margin: "4px 0 0", color: "#b6ded3", fontSize: "0.95rem" }}>
                Manage your academic ecosystem, timetable, and campus notices.
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", position: "relative", zIndex: 50, pointerEvents: "auto" }}>
              <Link 
                to="/student_prof" 
                style={{ background: "rgba(255, 255, 255, 0.15)", border: "1px solid rgba(255, 255, 255, 0.3)", color: "#ffffff", padding: "10px 18px", borderRadius: "12px", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none", backdropFilter: "blur(4px)", transition: "background 0.2s", pointerEvents: "auto", cursor: "pointer" }}
              >
                👤 View Profile
              </Link>
              <button 
                onClick={handleLogout}
                style={{ background: "#9f2d22", border: 0, color: "#ffffff", padding: "10px 18px", borderRadius: "12px", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(159, 45, 34, 0.3)", pointerEvents: "auto" }}
              >
                Sign Out
              </button>
            </div>

          </div>

          <div style={{ padding: "40px", width: "100%", boxSizing: "border-box", pointerEvents: "auto" }}>
            
            {error && (
              <div style={{ marginBottom: "24px", padding: "14px 18px", background: "#fff1f0", color: "#9f2d22", borderRadius: "12px", fontSize: "0.9rem", fontWeight: 600 }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ marginBottom: "36px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#12241f", fontWeight: 800 }}>
                  📅 Today's Timetable
                </h3>
                <span style={{ fontSize: "0.8rem", color: "#6a827b", fontWeight: 600 }}>Live Feed</span>
              </div>

              {loadingData ? (
                <div style={{ padding: "24px", textAlign: "center", color: "#6a827b", background: "#f8fbf9", borderRadius: "14px", border: "1px solid #e2ece8" }}>
                  Loading schedule from institutional gateway...
                </div>
              ) : todaysClasses.length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", color: "#6a827b", background: "#f8fbf9", borderRadius: "14px", border: "1px solid #e2ece8" }}>
                  No classes scheduled for today or backend sync pending.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {todaysClasses.map((cls, index) => (
                    <div key={index} style={{ background: "#f8fbf9", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2ece8", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{ background: "#e8f3ef", color: "#0f6b57", padding: "10px 14px", borderRadius: "10px", fontSize: "0.85rem", fontWeight: 700, minWidth: "140px", textAlign: "center" }}>
                          {cls.time}
                        </div>
                        <div>
                          <h4 style={{ margin: "0 0 4px", color: "#12241f", fontSize: "1rem", fontWeight: 700 }}>{cls.subject}</h4>
                          <p style={{ margin: 0, color: "#6a827b", fontSize: "0.82rem" }}>Code: {cls.code} | Location: {cls.room}</p>
                        </div>
                      </div>
                      <div>
                        <span style={{ 
                          fontSize: "0.75rem", 
                          padding: "4px 10px", 
                          borderRadius: "6px", 
                          fontWeight: 700,
                          background: cls.status === "Completed" ? "#edf7ed" : cls.status === "Ongoing" ? "#e1f5fe" : "#f1f3f4",
                          color: cls.status === "Completed" ? "#2e7d32" : cls.status === "Ongoing" ? "#0288d1" : "#5f6368"
                        }}>
                          {cls.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: "36px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#12241f", fontWeight: 800 }}>
                  📢 Recent Institutional Notices
                </h3>
                <span style={{ fontSize: "0.8rem", color: "#0f6b57", fontWeight: 700, cursor: "pointer" }}>View All →</span>
              </div>

              {loadingData ? (
                <div style={{ padding: "24px", textAlign: "center", color: "#6a827b", background: "#f8fbf9", borderRadius: "14px", border: "1px solid #e2ece8" }}>
                  Fetching campus notices...
                </div>
              ) : recentNotices.length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", color: "#6a827b", background: "#f8fbf9", borderRadius: "14px", border: "1px solid #e2ece8" }}>
                  No active notices found from backend server.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {recentNotices.map((notice, index) => (
                    <div key={index} style={{ background: "#f8fbf9", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2ece8", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, background: notice.urgent ? "#fde8e8" : "#e8f3ef", color: notice.urgent ? "#9f2d22" : "#0f6b57", padding: "2px 8px", borderRadius: "4px" }}>
                            {notice.tag}
                          </span>
                          <span style={{ fontSize: "0.78rem", color: "#6a827b" }}>{notice.date}</span>
                        </div>
                        <h4 style={{ margin: 0, color: "#12241f", fontSize: "0.95rem", fontWeight: 700 }}>{notice.title}</h4>
                      </div>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f6b57", cursor: "pointer" }}>Read →</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <h3 style={{ margin: "0 0 20px", fontSize: "1.15rem", color: "#12241f", fontWeight: 800 }}>
              🚀 Quick Links & Phase 1 Modules
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px", pointerEvents: "auto" }}>
              
              <Link to="/timetable" style={{ textDecoration: "none", background: "#f8fbf9", padding: "24px", borderRadius: "20px", border: "1px solid #e2ece8", display: "block", pointerEvents: "auto", cursor: "pointer" }}>
                <span style={{ fontSize: "1.5rem" }}>📅</span>
                <h4 style={{ margin: "12px 0 6px", color: "#12241f", fontSize: "1.05rem" }}>Timetable</h4>
                <p style={{ margin: "0 0 16px", color: "#4d625c", fontSize: "0.88rem", lineHeight: "1.4" }}>View daily class schedules and room allocations.</p>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f6b57" }}>Open Timetable →</span>
              </Link>

              <Link to="/assignments" style={{ textDecoration: "none", background: "#f8fbf9", padding: "24px", borderRadius: "20px", border: "1px solid #e2ece8", display: "block", pointerEvents: "auto", cursor: "pointer" }}>
                <span style={{ fontSize: "1.5rem" }}>📝</span>
                <h4 style={{ margin: "12px 0 6px", color: "#12241f", fontSize: "1.05rem" }}>Assignments</h4>
                <p style={{ margin: "0 0 16px", color: "#4d625c", fontSize: "0.88rem", lineHeight: "1.4" }}>Upload lab assignments and track evaluation scores.</p>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f6b57" }}>Upload Files →</span>
              </Link>

              <Link to="/notes" style={{ textDecoration: "none", background: "#f8fbf9", padding: "24px", borderRadius: "20px", border: "1px solid #e2ece8", display: "block", pointerEvents: "auto", cursor: "pointer" }}>
                <span style={{ fontSize: "1.5rem" }}>📚</span>
                <h4 style={{ margin: "12px 0 6px", color: "#12241f", fontSize: "1.05rem" }}>Notes & LMS</h4>
                <p style={{ margin: "0 0 16px", color: "#4d625c", fontSize: "0.88rem", lineHeight: "1.4" }}>Access lecture notes, syllabus frameworks, and semester uploads.</p>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f6b57" }}>Access Portal →</span>
              </Link>

              <Link to="/notices" style={{ textDecoration: "none", background: "#f8fbf9", padding: "24px", borderRadius: "20px", border: "1px solid #e2ece8", display: "block", pointerEvents: "auto", cursor: "pointer" }}>
                <span style={{ fontSize: "1.5rem" }}>📢</span>
                <h4 style={{ margin: "12px 0 6px", color: "#12241f", fontSize: "1.05rem" }}>Notices</h4>
                <p style={{ margin: "0 0 16px", color: "#4d625c", fontSize: "0.88rem", lineHeight: "1.4" }}>Check official institutional announcements and notices.</p>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f6b57" }}>View All →</span>
              </Link>

              <Link to="/attendance" style={{ textDecoration: "none", background: "#f8fbf9", padding: "24px", borderRadius: "20px", border: "1px solid #e2ece8", display: "block", pointerEvents: "auto", cursor: "pointer" }}>
                <span style={{ fontSize: "1.5rem" }}>📊</span>
                <h4 style={{ margin: "12px 0 6px", color: "#12241f", fontSize: "1.05rem" }}>Attendance</h4>
                <p style={{ margin: "0 0 16px", color: "#4d625c", fontSize: "0.88rem", lineHeight: "1.4" }}>Monitor subject-wise attendance percentages and logs.</p>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f6b57" }}>View Records →</span>
              </Link>

              <Link to="/calendar" style={{ textDecoration: "none", background: "#f8fbf9", padding: "24px", borderRadius: "20px", border: "1px solid #e2ece8", display: "block", pointerEvents: "auto", cursor: "pointer" }}>
                <span style={{ fontSize: "1.5rem" }}>🗓️</span>
                <h4 style={{ margin: "12px 0 6px", color: "#12241f", fontSize: "1.05rem" }}>Calendar</h4>
                <p style={{ margin: "0 0 16px", color: "#4d625c", fontSize: "0.88rem", lineHeight: "1.4" }}>Track semester events, exams, and institutional holidays.</p>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f6b57" }}>Open Calendar →</span>
              </Link>

              <Link to="/notifications" style={{ textDecoration: "none", background: "#f8fbf9", padding: "24px", borderRadius: "20px", border: "1px solid #e2ece8", display: "block", pointerEvents: "auto", cursor: "pointer" }}>
                <span style={{ fontSize: "1.5rem" }}>🔔</span>
                <h4 style={{ margin: "12px 0 6px", color: "#12241f", fontSize: "1.05rem" }}>Notifications</h4>
                <p style={{ margin: "0 0 16px", color: "#4d625c", fontSize: "0.88rem", lineHeight: "1.4" }}>Review personal alerts and system updates inbox.</p>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f6b57" }}>View Inbox →</span>
              </Link>

              <Link to="/search" style={{ textDecoration: "none", background: "#f8fbf9", padding: "24px", borderRadius: "20px", border: "1px solid #e2ece8", display: "block", pointerEvents: "auto", cursor: "pointer" }}>
                <span style={{ fontSize: "1.5rem" }}>🔍</span>
                <h4 style={{ margin: "12px 0 6px", color: "#12241f", fontSize: "1.05rem" }}>Campus Search</h4>
                <p style={{ margin: "0 0 16px", color: "#4d625c", fontSize: "0.88rem", lineHeight: "1.4" }}>Quickly look up peers, faculty members, or resources.</p>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f6b57" }}>Search Now →</span>
              </Link>

              

            </div>

          </div>
        </div>

      </main>
    </div>
  );
}