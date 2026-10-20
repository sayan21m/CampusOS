import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  LogOut,
  Megaphone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

const MODULES = [
  {
    icon: ClipboardList,
    title: "Assignments",
    description: "Create, publish, and review section assignments.",
  },
  {
    icon: CalendarCheck,
    title: "Attendance",
    description: "Track class attendance across your sections.",
  },
  {
    icon: Megaphone,
    title: "Notices",
    description: "Share announcements with students and staff.",
  },
];

function getInitials(name) {
  if (!name) {
    return "U";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function Dashboard() {
  const { user, logout } = useAuth();
  const isFaculty = user?.role === "FACULTY";
  const roleLabel = user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : "User";

  return (
    <main className="db-page">
      <div className="db-shell">
        <header className="db-topbar">
          <div className="db-brand">
            <span className="db-brand-mark" aria-hidden="true">
              <GraduationCap size={20} />
            </span>
            <div>
              <p className="db-brand-name">CampusOS</p>
              <p className="db-brand-title">{roleLabel} Workspace</p>
            </div>
          </div>

          <div className="db-top-actions">
            {isFaculty && (
              <Link to="/faculty-profile" className="db-btn db-btn-ghost" aria-label="Profile">
                <UserRound size={16} aria-hidden="true" />
                <span className="db-btn-label">Profile</span>
              </Link>
            )}
            <button
              type="button"
              className="db-btn db-btn-danger"
              onClick={logout}
              aria-label="Sign out"
            >
              <LogOut size={16} aria-hidden="true" />
              <span className="db-btn-label">Sign out</span>
            </button>
          </div>
        </header>

        <section className="db-panel">
          <div className="db-hero">
            <div className="db-avatar" aria-hidden="true">
              {getInitials(user?.name)}
            </div>
            <div className="db-hero-text">
              <span className="db-role-pill">
                <ShieldCheck size={14} aria-hidden="true" />
                {roleLabel}
              </span>
              <h1>Welcome, {user?.name}</h1>
              <p>{user?.email || "Manage your CampusOS workspace from one place."}</p>
            </div>
          </div>

          <div className="db-body">
            <div className="db-section-head">
              <h2>Workspace modules</h2>
              <span className="db-muted">Rolling out soon</span>
            </div>

            <div className="db-modules">
              {MODULES.map(({ icon: Icon, title, description }) => (
                <article className="db-module" key={title}>
                  <span className="db-module-icon" aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                  <span className="db-soon">Coming soon</span>
                </article>
              ))}
            </div>

            {isFaculty && (
              <Link to="/faculty-profile" className="db-cta">
                <span className="db-module-icon" aria-hidden="true">
                  <UserRound size={20} />
                </span>
                <div>
                  <h3>Your faculty profile</h3>
                  <p>View your department, designation, and contact details.</p>
                </div>
                <ArrowRight className="db-cta-arrow" size={18} aria-hidden="true" />
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default Dashboard;
