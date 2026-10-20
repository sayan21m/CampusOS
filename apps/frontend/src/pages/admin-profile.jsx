import { useState } from "react";
import {
  GraduationCap, LayoutDashboard, Users, BookOpen,
  CalendarDays, Megaphone, Settings, LogOut,
  FileText, Bell, Clock3, Zap, TrendingUp,
  ArrowUpRight, ShieldCheck
} from "lucide-react";
import "./admin-profile.css";

const activities = [
  { title: "New user account created", detail: "A new student account was registered.", time: "10:42 AM", icon: Users },
  { title: "Subject allocation updated", detail: "Data Structures assigned to Section B.", time: "09:15 AM", icon: BookOpen },
  { title: "Notice published", detail: "Examination schedule was released.", time: "Yesterday", icon: Megaphone },
  { title: "Timetable revised", detail: "Semester 5 timetable was updated.", time: "Oct 16", icon: CalendarDays }
];

const dates = [
  { date: "Nov 10, 2026", event: "Mid Semester Examination", details: "All B.Tech Programs", type: "Exam" },
  { date: "Nov 15, 2026", event: "University Holiday", details: "Campus closed", type: "Holiday" },
  { date: "Nov 25, 2026", event: "Semester Registration", details: "All eligible students", type: "Registration" }
];

const chartData = [
  { day: "Oct 12", users: 560, materials: 210 },
  { day: "Oct 13", users: 600, materials: 240 },
  { day: "Oct 14", users: 640, materials: 260 },
  { day: "Oct 15", users: 670, materials: 280 },
  { day: "Oct 16", users: 710, materials: 320 },
  { day: "Oct 17", users: 780, materials: 400 },
  { day: "Oct 18", users: 850, materials: 480 }
];

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Users", icon: Users },
  { label: "Subjects", icon: BookOpen },
  { label: "Timetable", icon: Clock3 },
  { label: "Calendar", icon: CalendarDays },
  { label: "Notices", icon: Megaphone },
  { label: "Settings", icon: Settings }
];

const shortcuts = [
  { title: "User Management", detail: "Create, edit and manage users", icon: Users },
  { title: "Subject & Faculty Allocation", detail: "Assign subjects and faculty", icon: BookOpen },
  { title: "Campus-wide Notices", detail: "Publish and manage notices", icon: Megaphone },
  { title: "Academic Calendar", detail: "Manage exams and holidays", icon: CalendarDays },
  { title: "Timetable Management", detail: "Update class schedules", icon: Clock3 }
];

function StatCard({ icon: Icon, title, value, change }) {
  return (
    <article className="ap-stat-card">
      <div className="ap-stat-icon"><Icon size={25} /></div>
      <div className="ap-stat-copy">
        <p>{title}</p>
        <strong>{value.toLocaleString()}</strong>
        <small><TrendingUp size={15} /> <b>{change}</b> <span>vs. last month</span></small>
      </div>
    </article>
  );
}

function SystemChart() {
  const max = Math.max(...chartData.map(item => item.users));

  return (
    <div className="ap-chart">
      <div className="ap-y-labels">
        <span>900</span><span>600</span><span>300</span><span>0</span>
      </div>

      <div className="ap-chart-columns">
        {chartData.map(item => (
          <div className="ap-chart-column" key={item.day}>
            <div className="ap-bars">
              <span
                className="ap-bar ap-users-bar"
                title={`Active users: ${item.users}`}
                style={{ height: `${item.users / max * 100}%` }}
              />
              <span
                className="ap-bar ap-materials-bar"
                title={`Uploaded materials: ${item.materials}`}
                style={{ height: `${item.materials / max * 100}%` }}
              />
            </div>
            <small>{item.day}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminProfile() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);

  function selectPage(label) {
    setActivePage(label);
    setMenuOpen(false);

    if (label !== "Dashboard") {
      window.alert(
        `${label} page needs to be connected to its own component.`
      );
    }
  }

  return (
    <div className="ap-shell">
      <aside className={`ap-sidebar ${menuOpen ? "ap-sidebar-open" : ""}`}>
        <div className="ap-brand">
          <GraduationCap size={30} />
          <span>CampusOS</span>
          <button
            className="ap-mobile-close"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          >
            ×
          </button>
        </div>

        <nav className="ap-nav" aria-label="Admin navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`ap-nav-link ${activePage === label ? "ap-active" : ""}`}
              onClick={() => selectPage(label)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
          
        </nav>

        <div className="ap-sidebar-foot">
          <ShieldCheck size={16} />
          <span>Admin workspace</span>
        </div>
      </aside>

      {menuOpen && (
        <button
          className="ap-backdrop"
          aria-label="Close navigation overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <main className="ap-main">
        <header className="ap-topbar">
          <button
            className="ap-mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </button>

          <div>
            <p className="ap-eyebrow">CAMPUSOS / MANAGEMENT</p>
            <h1>Admin Dashboard</h1>
          </div>

          <div className="ap-admin-tools">
            <div className="ap-avatar">AD</div>
            <div className="ap-admin-id">
              <strong>Admin</strong>
              <span>System Administrator</span>
            </div>
            <button className="ap-signout" onClick={() => setShowSignOut(true)}>
              <LogOut size={17} />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <div className="ap-content">
          <section className="ap-welcome">
            <div>
              <h2>Welcome back, Admin</h2>
              <p>Here’s your campus system at a glance.</p>
            </div>
            <span className="ap-date-pill">
              <CalendarDays size={15} /> October 18, 2026
            </span>
          </section>

          <section className="ap-stats-grid">
            <StatCard icon={Users} title="Active Users" value={1248} change="+12%" />
            <StatCard icon={FileText} title="Uploaded Materials" value={386} change="+8%" />
            <StatCard icon={Bell} title="Notices Published" value={24} change="+33%" />
          </section>

          <section className="ap-main-grid">
            <article className="ap-panel">
              <div className="ap-panel-heading">
                <div><Clock3 /><h2>Recent Activity</h2></div>
                <button
                  className="ap-text-action"
                  onClick={() => window.alert("Connect an activity history page.")}
                >
                  View all <ArrowUpRight size={16} />
                </button>
              </div>

              <div className="ap-activity-list">
                {activities.map(({ title, detail, time, icon: Icon }) => (
                  <div className="  ap-activity-item" key={title}>
                    <div className="ap-activity-icon"><Icon size={18} /></div>
                    <div className="  ap-activity-copy">
                      <strong>{title}</strong>
                      <p>{detail}</p>
                    </div>
                    <time>{time}</time>
                  </div>
                ))}
              </div>
            </article>

            <article className="ap-panel">
              <div className="ap-panel-heading">
                <div><Zap /><h2>Management Shortcuts</h2></div>
              </div>

              <div className="ap-shortcut-grid">
                {shortcuts.map(({ title, detail, icon: Icon }) => (
                  <button
                    className="ap-shortcut"
                    key={title}
                    onClick={() => window.alert(`${title} page is not connected yet.`)}
                  >
                    <span className="ap-shortcut-icon"><Icon size={21} /></span>
                    <strong>{title}</strong>
                    <p>{detail}</p>
                    <ArrowUpRight className="ap-shortcut-arrow" size={17} />
                  </button>
                ))}
              </div>
            </article>

            <article className="ap-panel">
              <div className="ap-panel-heading">
                <div><CalendarDays /><h2>Upcoming Academic Dates</h2></div>
                <button className="ap-text-action" onClick={() => selectPage("Calendar")}>
                  View all <ArrowUpRight size={16} />
                </button>
              </div>

              <div className="ap-table-wrap">
                <table className="ap-table">
                  <thead>
                    <tr><th>Date</th><th>Event</th><th>Details</th><th>Type</th></tr>
                  </thead>
                  <tbody>
                    {dates.map(item => (
                      <tr key={item.event}>
                        <td>{item.date}</td>
                        <td>{item.event}</td>
                        <td>{item.details}</td>
                        <td><span className="ap-tag">{item.type}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="ap-panel">
              <div className="ap-panel-heading">
                <div><TrendingUp /><h2>System Overview</h2></div>
                <span className="ap-date-pill">Last 7 Days</span>
              </div>

              <SystemChart />

              <div className="ap-legend">
                <span><i className="ap-legend-users" />Active Users</span>
                <span><i className="ap-legend-materials" />Uploaded Materials</span>
              </div>
            </article>
          </section>

          
        </div>
      </main>

      {showSignOut && (
        <div
          className="ap-modal-backdrop"
          onClick={() => setShowSignOut(false)}
        >
          <section
            className="ap-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ap-signout-title"
            onClick={event => event.stopPropagation()}
          >
            <div className="ap-modal-icon"><LogOut size={23} /></div>
            <h2 id="ap-signout-title">Sign out?</h2>
            <p>This frontend demo has no real login session.</p>
            <div className="ap-modal-actions">
              <button className="ap-cancel-btn" onClick={() => setShowSignOut(false)}>
                Cancel
              </button>
              <button
                className="ap-confirm-btn"
                onClick={() => {
                  setShowSignOut(false);
                  setActivePage("Dashboard");
                  window.alert("Demo only: connect real authentication to sign out.");
                }}
              >
                Sign out
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
