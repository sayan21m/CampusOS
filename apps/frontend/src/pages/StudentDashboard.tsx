import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Clock3,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MapPin,
  Megaphone,
  Percent,
  UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./StudentDashboard.css";

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

interface StudentAssignment {
  assignment_id: number;
  title: string;
  subject_id: number;
  section: string;
  deadline: string;
  max_marks: number;
  status: string;
  submission: unknown;
}

type DeadlineTone = "comfortable" | "soon" | "urgent";

function getDeadlineTone(deadline: string | Date): DeadlineTone {
  const hoursLeft = (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursLeft <= 24) {
    return "urgent";
  }

  if (hoursLeft <= 48) {
    return "soon";
  }

  return "comfortable";
}

function formatDeadline(deadline: string | Date): string {
  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) {
    return "Deadline unavailable";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDeadlinePill(tone: DeadlineTone): { className: string; label: string } {
  if (tone === "urgent") {
    return { className: "sd-pill sd-pill-urgent", label: "Due within 24h" };
  }

  if (tone === "soon") {
    return { className: "sd-pill sd-pill-soon", label: "Due soon" };
  }

  return { className: "sd-pill sd-pill-ok", label: "On track" };
}

function getClassStatusPill(status: string): string {
  if (status === "Completed") {
    return "sd-pill sd-pill-ok";
  }

  if (status === "Ongoing") {
    return "sd-pill sd-pill-info";
  }

  return "sd-pill sd-pill-neutral";
}

export default function StudentDashboard(): React.JSX.Element {
  const { user, logout } = useAuth() as {
    user: { name?: string; role?: string } | null;
    logout: () => void;
  };
  const navigate = useNavigate();

  const [todaysClasses, setTodaysClasses] = useState<ClassSchedule[]>([]);
  const [recentNotices, setRecentNotices] = useState<Notice[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<StudentAssignment[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboardData() {
      try {
        setLoadingData(true);
        setError("");

        const scheduleData: ClassSchedule[] = [];
        const noticesData: Notice[] = [];

        const assignmentsResponse = await api.get("/submissions/my");
        const assignments = Array.isArray(assignmentsResponse.data?.assignments)
          ? (assignmentsResponse.data.assignments as StudentAssignment[])
          : [];

        const pending = assignments
          .filter((assignment) => assignment.status === "Pending")
          .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

        if (!cancelled) {
          setTodaysClasses(scheduleData);
          setRecentNotices(noticesData);
          setPendingAssignments(pending);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            "Failed to load dashboard data.";
          setError(message);
          setPendingAssignments([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    }

    fetchDashboardData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="sd-page">
      <div className="sd-shell">
        <header className="sd-topbar">
          <div className="sd-brand">
            <span className="sd-brand-mark" aria-hidden="true">
              <GraduationCap size={18} strokeWidth={2} />
            </span>
            <div>
              <p className="sd-brand-name">CampusOS</p>
              <p className="sd-brand-title">Student Portal</p>
            </div>
          </div>
          <div className="sd-top-actions">
            <Link to="/student-profile" className="sd-btn sd-btn-ghost">
              <UserRound size={16} strokeWidth={2} aria-hidden="true" />
              <span>Profile</span>
            </Link>
            <button type="button" className="sd-btn sd-btn-danger" onClick={handleLogout}>
              <LogOut size={16} strokeWidth={2} aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <main className="sd-panel">
          <section className="sd-hero">
            <div className="sd-hero-icon" aria-hidden="true">
              <LayoutDashboard size={22} strokeWidth={2} />
            </div>
            <div className="sd-hero-copy">
              <p className="sd-hero-kicker">Student dashboard</p>
              <h1>Welcome back, {user?.name || "Student"}</h1>
              <p>Your timetable, assignments, notices, and attendance in one place.</p>
            </div>
          </section>

          <div className="sd-body">
            {error && (
              <div className="sd-alert" role="alert">
                <AlertCircle size={18} strokeWidth={2} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="sd-layout">
              <div className="sd-stack">
                <section className="sd-section" aria-labelledby="sd-timetable-heading">
                  <div className="sd-section-head">
                    <div className="sd-section-title">
                      <span className="sd-section-icon" aria-hidden="true">
                        <CalendarDays size={16} strokeWidth={2} />
                      </span>
                      <h2 id="sd-timetable-heading">Today&apos;s timetable</h2>
                    </div>
                    <span className="sd-meta">Coming soon</span>
                  </div>

                  {loadingData ? (
                    <p className="sd-loading">Loading schedule...</p>
                  ) : todaysClasses.length === 0 ? (
                    <div className="sd-empty">
                      <CalendarDays size={18} strokeWidth={2} aria-hidden="true" />
                      <p>
                        Timetable is not available yet. Your classes will appear here once scheduling
                        is enabled.
                      </p>
                    </div>
                  ) : (
                    <div className="sd-list">
                      {todaysClasses.map((cls, index) => (
                        <article key={`${cls.code}-${index}`} className="sd-item">
                          <div className="sd-time">
                            <Clock3 size={14} strokeWidth={2} aria-hidden="true" />
                            <span>{cls.time}</span>
                          </div>
                          <div className="sd-item-main">
                            <h3 className="sd-item-title">{cls.subject}</h3>
                            <p className="sd-item-sub">
                              <span>{cls.code}</span>
                              <span className="sd-dot" aria-hidden="true" />
                              <MapPin size={13} strokeWidth={2} aria-hidden="true" />
                              <span>{cls.room}</span>
                            </p>
                          </div>
                          <span className={getClassStatusPill(cls.status)}>{cls.status}</span>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section
                  id="pending-assignments"
                  className="sd-section"
                  aria-labelledby="sd-assignments-heading"
                >
                  <div className="sd-section-head">
                    <div className="sd-section-title">
                      <span className="sd-section-icon" aria-hidden="true">
                        <ClipboardList size={16} strokeWidth={2} />
                      </span>
                      <h2 id="sd-assignments-heading">Pending assignments</h2>
                    </div>
                    <span className="sd-meta">
                      {loadingData ? "Loading" : `${pendingAssignments.length} pending`}
                    </span>
                  </div>

                  {loadingData ? (
                    <p className="sd-loading">Loading pending assignments...</p>
                  ) : pendingAssignments.length === 0 ? (
                    <div className="sd-empty">
                      <ClipboardList size={18} strokeWidth={2} aria-hidden="true" />
                      <p>No pending assignments right now.</p>
                    </div>
                  ) : (
                    <div className="sd-list">
                      {pendingAssignments.slice(0, 5).map((assignment) => {
                        const tone = getDeadlineTone(assignment.deadline);
                        const pill = getDeadlinePill(tone);

                        return (
                          <article key={assignment.assignment_id} className="sd-item">
                            <div className="sd-item-main">
                              <h3 className="sd-item-title">{assignment.title}</h3>
                              <p className="sd-item-sub">
                                <Clock3 size={13} strokeWidth={2} aria-hidden="true" />
                                <span>Due {formatDeadline(assignment.deadline)}</span>
                                <span className="sd-dot" aria-hidden="true" />
                                <span>Max {assignment.max_marks} marks</span>
                              </p>
                            </div>
                            <span className={pill.className}>{pill.label}</span>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              <div className="sd-stack">
                <section className="sd-section" aria-labelledby="sd-attendance-heading">
                  <div className="sd-section-head">
                    <div className="sd-section-title">
                      <span className="sd-section-icon" aria-hidden="true">
                        <Percent size={16} strokeWidth={2} />
                      </span>
                      <h2 id="sd-attendance-heading">Attendance summary</h2>
                    </div>
                    <span className="sd-meta">Coming soon</span>
                  </div>

                  <div className="sd-attendance-card">
                    <div className="sd-attendance-top">
                      <span className="sd-attendance-icon" aria-hidden="true">
                        <Percent size={18} strokeWidth={2} />
                      </span>
                      <div>
                        <p className="sd-attendance-label">Overall attendance</p>
                        <p className="sd-attendance-value">—</p>
                      </div>
                    </div>
                    <p className="sd-attendance-note">
                      Attendance tracking is not available yet. Your overall percentage and
                      subject-wise warnings will appear here once attendance APIs are enabled.
                    </p>
                  </div>
                </section>

                <section className="sd-section" aria-labelledby="sd-notices-heading">
                  <div className="sd-section-head">
                    <div className="sd-section-title">
                      <span className="sd-section-icon" aria-hidden="true">
                        <Megaphone size={16} strokeWidth={2} />
                      </span>
                      <h2 id="sd-notices-heading">Recent notices</h2>
                    </div>
                    <span className="sd-meta">Coming soon</span>
                  </div>

                  {loadingData ? (
                    <p className="sd-loading">Loading notices...</p>
                  ) : recentNotices.length === 0 ? (
                    <div className="sd-empty">
                      <Megaphone size={18} strokeWidth={2} aria-hidden="true" />
                      <p>
                        Notices are not available yet. Campus announcements will appear here when the
                        notice board is enabled.
                      </p>
                    </div>
                  ) : (
                    <div className="sd-list">
                      {recentNotices.map((notice, index) => (
                        <article key={`${notice.title}-${index}`} className="sd-item">
                          <div className="sd-item-main">
                            <p className="sd-notice-meta">
                              <span className={`sd-notice-tag${notice.urgent ? " urgent" : ""}`}>
                                {notice.tag}
                              </span>
                              {notice.date}
                            </p>
                            <h3 className="sd-item-title">{notice.title}</h3>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>

            <section className="sd-quick" aria-labelledby="sd-quick-heading">
              <div className="sd-section-title sd-quick-heading">
                <span className="sd-section-icon" aria-hidden="true">
                  <ArrowRight size={16} strokeWidth={2} />
                </span>
                <h2 id="sd-quick-heading">Quick links</h2>
              </div>

              <div className="sd-quick-grid">
                <article className="sd-quick-card">
                  <span className="sd-quick-icon" aria-hidden="true">
                    <BookOpen size={18} strokeWidth={2} />
                  </span>
                  <h3>Notes & study material</h3>
                  <p>Access lecture notes, syllabus frameworks, and semester uploads.</p>
                  <span className="sd-quick-muted">Coming soon</span>
                </article>

                <article className="sd-quick-card">
                  <span className="sd-quick-icon" aria-hidden="true">
                    <FileText size={18} strokeWidth={2} />
                  </span>
                  <h3>Assignment submissions</h3>
                  <p>Review pending work and track evaluation status.</p>
                  <a href="#pending-assignments" className="sd-quick-link">
                    View pending
                    <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                  </a>
                </article>

                <article className="sd-quick-card">
                  <span className="sd-quick-icon" aria-hidden="true">
                    <UserRound size={18} strokeWidth={2} />
                  </span>
                  <h3>Profile & records</h3>
                  <p>Open your academic profile and institutional contact details.</p>
                  <Link to="/student-profile" className="sd-quick-link">
                    Open profile
                    <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                  </Link>
                </article>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
