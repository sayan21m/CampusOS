import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarDays,
  Megaphone,
  Settings,
  LogOut,
  FileText,
  Bell,
  Clock3,
  Zap,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { isPasswordStrong, PASSWORD_POLICY_MESSAGE } from "../utils/passwordPolicy";
import {
  activateUser,
  adminResetUserPassword,
  bulkCreateUsersCsv,
  changePassword,
  createAllocation,
  createCalendarEntry,
  createDepartment,
  createManagedUser,
  createNotice,
  createSubject,
  createTimetableSlot,
  deactivateUser,
  deleteAllocation,
  deleteCalendarEntry,
  deleteTimetableSlot,
  fetchAdminOverview,
  fetchAllocations,
  fetchCalendarEntries,
  fetchDepartments,
  fetchNotices,
  fetchSubjects,
  fetchTimetableSlots,
  fetchUsers,
  updateCalendarEntry,
  updateDepartment,
  updateManagedUser,
} from "../services/campus";
import ProfileSettings from "../components/profile/ProfileSettings";
import "./admin-profile.css";

const DAY_LABELS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Users", icon: Users },
  { label: "Subjects", icon: BookOpen },
  { label: "Timetable", icon: Clock3 },
  { label: "Calendar", icon: CalendarDays },
  { label: "Notices", icon: Megaphone },
  { label: "Settings", icon: Settings },
];

const shortcuts = [
  { title: "User Management", detail: "Departments and student/faculty profiles", icon: Users, page: "Users" },
  { title: "Subject Management", detail: "Create and list subjects by department", icon: BookOpen, page: "Subjects" },
  { title: "Campus-wide Notices", detail: "Publish targeted institutional notices", icon: Megaphone, page: "Notices" },
  { title: "Academic Calendar", detail: "Manage holidays, exams, and important dates", icon: CalendarDays, page: "Calendar" },
  { title: "Timetable Management", detail: "Create and review section timetables", icon: Clock3, page: "Timetable" },
];

function StatCard({ icon: Icon, title, value, hint }) {
  return (
    <article className="ap-stat-card">
      <div className="ap-stat-icon">
        <Icon size={25} />
      </div>
      <div className="ap-stat-copy">
        <p>{title}</p>
        <strong>{Number(value || 0).toLocaleString()}</strong>
        {hint ? (
          <small>
            <TrendingUp size={15} /> <span>{hint}</span>
          </small>
        ) : null}
      </div>
    </article>
  );
}

function MessageBanner({ error, success }) {
  if (!error && !success) return null;
  return (
    <div className={`ap-banner ${error ? "is-error" : "is-success"}`}>
      {error || success}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="ap-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function OverviewBars({ users, materials, notices }) {
  const rows = [
    { label: "Active users", value: users, color: "#1d6047" },
    { label: "Study materials", value: materials, color: "#2e8a61" },
    { label: "Notices published", value: notices, color: "#9ac4a5" },
  ];
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <div className="ap-overview-bars">
      {rows.map((row) => (
        <div key={row.label} className="ap-overview-row">
          <div className="ap-overview-meta">
            <strong>{row.label}</strong>
            <span>{row.value}</span>
          </div>
          <div className="ap-overview-track">
            <span style={{ width: `${(row.value / max) * 100}%`, background: row.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activePage, setActivePage] = useState("Dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [notices, setNotices] = useState([]);
  const [users, setUsers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [overview, setOverview] = useState(null);
  const [calendarEntries, setCalendarEntries] = useState([]);
  const [userFilter, setUserFilter] = useState({ role: "", search: "", isActive: "" });
  const [calendarForm, setCalendarForm] = useState({
    title: "",
    description: "",
    entry_type: "HOLIDAY",
    start_date: "",
    end_date: "",
    academic_year: String(new Date().getFullYear()),
  });

  const [deptForm, setDeptForm] = useState({ dept_name: "", dept_code: "" });
  const [userForm, setUserForm] = useState({
    role: "STUDENT",
    name: "",
    email: "",
    password: "",
    dept_id: "",
    roll_number: "",
    semester: "1",
    section: "A",
    admission_year: String(new Date().getFullYear()),
    employee_id: "",
    designation: "",
    phone: "",
  });
  const [csvFile, setCsvFile] = useState(null);
  const [allocationForm, setAllocationForm] = useState({
    faculty_id: "",
    subject_id: "",
  });

  const [subjectForm, setSubjectForm] = useState({
    subject_code: "",
    subject_name: "",
    dept_id: "",
    semester: "1",
    credits: "3",
    is_active: true,
  });

  const [noticeForm, setNoticeForm] = useState({
    title: "",
    content: "",
    category: "academic",
    priority: "normal",
    target_type: "all",
    target_value: "ALL",
  });
  const [noticeFile, setNoticeFile] = useState(null);

  const [ttQuery, setTtQuery] = useState({ dept_id: "", semester: "5", section: "A" });
  const [ttSlots, setTtSlots] = useState([]);
  const [ttForm, setTtForm] = useState({
    subject_id: "",
    faculty_id: "",
    dept_id: "",
    semester: "5",
    section: "A",
    day_of_week: "1",
    period: "1",
    room: "",
    start_time: "09:00",
    end_time: "09:50",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const displayName = user?.name || "Admin";
  const initials = useMemo(() => {
    return displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "AD";
  }, [displayName]);

  const userCounts = useMemo(() => {
    return {
      active: overview?.users?.active ?? users.filter((row) => row.isActive).length,
      students: overview?.users?.students ?? users.filter((row) => row.role === "STUDENT").length,
      faculty: overview?.users?.faculty ?? users.filter((row) => row.role === "FACULTY").length,
      notices: overview?.notices?.total ?? notices.length,
      materials: overview?.materials?.total ?? 0,
      departments: overview?.departments?.total ?? departments.length,
      subjects: overview?.subjects?.active ?? subjects.length,
    };
  }, [overview, users, notices, departments, subjects]);

  const upcomingDates = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return [...calendarEntries]
      .filter((item) => String(item.end_date || item.start_date) >= today)
      .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))
      .slice(0, 8);
  }, [calendarEntries]);

  const recentActivity = useMemo(() => {
    const noticeItems = notices.map((notice) => ({
      id: `notice-${notice.id}`,
      title: notice.title,
      detail: notice.content?.slice(0, 120) || notice.tag,
      date: notice.date || "Recent",
      kind: "Notice",
    }));
    const userItems = users.slice(0, 8).map((row) => ({
      id: `user-${row.user_id}`,
      title: row.name,
      detail: `${row.role} · ${row.email}`,
      date: row.createdAt
        ? new Date(row.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "Recent",
      kind: "User",
    }));
    return [...noticeItems, ...userItems].slice(0, 6);
  }, [notices, users]);

  const facultyUsers = useMemo(
    () => users.filter((row) => row.role === "FACULTY" && row.faculty),
    [users]
  );

  async function refreshUsers(nextFilter = userFilter) {
    const params = {};
    if (nextFilter.role) params.role = nextFilter.role;
    if (nextFilter.search) params.search = nextFilter.search;
    if (nextFilter.isActive) params.isActive = nextFilter.isActive;
    const rows = await fetchUsers(params);
    setUsers(rows);
    return rows;
  }

  async function refreshCalendar() {
    const year = Number(calendarForm.academic_year) || new Date().getFullYear();
    const entries = await fetchCalendarEntries({
      academic_year: year,
      include_deadlines: false,
    }).catch(() => []);
    setCalendarEntries(entries);
  }

  async function refreshCore() {
    const [deptRows, subjectRows, noticeRows, allocationRows, overviewRow] = await Promise.all([
      fetchDepartments(),
      fetchSubjects(),
      fetchNotices(),
      fetchAllocations().catch(() => []),
      fetchAdminOverview().catch(() => null),
    ]);
    setDepartments(deptRows);
    setSubjects(subjectRows);
    setNotices(noticeRows);
    setAllocations(allocationRows);
    setOverview(overviewRow);
    const userRows = await refreshUsers();
    await refreshCalendar();
    const firstFaculty = (userRows || []).find((row) => row.role === "FACULTY" && row.faculty);

    if (!userForm.dept_id && deptRows[0]) {
      setUserForm((prev) => ({ ...prev, dept_id: String(deptRows[0].dept_id) }));
    }
    if (!subjectForm.dept_id && deptRows[0]) {
      setSubjectForm((prev) => ({ ...prev, dept_id: String(deptRows[0].dept_id) }));
    }
    if (!ttQuery.dept_id && deptRows[0]) {
      setTtQuery((prev) => ({ ...prev, dept_id: String(deptRows[0].dept_id) }));
      setTtForm((prev) => ({ ...prev, dept_id: String(deptRows[0].dept_id) }));
    }
    if (!ttForm.subject_id && subjectRows[0]) {
      setTtForm((prev) => ({ ...prev, subject_id: String(subjectRows[0].subject_id) }));
    }
    if (!allocationForm.subject_id && subjectRows[0]) {
      setAllocationForm((prev) => ({ ...prev, subject_id: String(subjectRows[0].subject_id) }));
    }
    if (firstFaculty) {
      setAllocationForm((prev) =>
        prev.faculty_id ? prev : { ...prev, faculty_id: String(firstFaculty.faculty.faculty_id) }
      );
      setTtForm((prev) =>
        prev.faculty_id ? prev : { ...prev, faculty_id: String(firstFaculty.faculty.faculty_id) }
      );
    }
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        await refreshCore();
      } catch (err) {
        setError(err?.response?.data?.message || "Unable to load admin dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectPage(label) {
    setActivePage(label);
    setMenuOpen(false);
    setError("");
    setSuccess("");
  }

  function flashSuccess(message) {
    setSuccess(message);
    setError("");
  }

  function flashError(err, fallback) {
    setSuccess("");
    setError(err?.response?.data?.message || fallback);
  }

  async function handleCreateDepartment(event) {
    event.preventDefault();
    try {
      await createDepartment(deptForm);
      setDeptForm({ dept_name: "", dept_code: "" });
      await refreshCore();
      flashSuccess("Department created.");
    } catch (err) {
      flashError(err, "Could not create department.");
    }
  }

  async function handleRenameDepartment(dept) {
    const nextName = window.prompt("New department name", dept.dept_name);
    if (!nextName || nextName.trim() === dept.dept_name) return;
    try {
      await updateDepartment(dept.dept_id, { dept_name: nextName.trim() });
      await refreshCore();
      flashSuccess("Department updated.");
    } catch (err) {
      flashError(err, "Could not update department.");
    }
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    if (!isPasswordStrong(userForm.password)) {
      flashError(null, PASSWORD_POLICY_MESSAGE);
      return;
    }
    try {
      const payload = {
        role: userForm.role,
        name: userForm.name,
        email: userForm.email,
        password: userForm.password,
        dept_id: Number(userForm.dept_id),
        full_name: userForm.name,
        ...(userForm.phone ? { phone: userForm.phone } : {}),
      };

      if (userForm.role === "STUDENT") {
        Object.assign(payload, {
          roll_number: userForm.roll_number,
          semester: Number(userForm.semester),
          section: userForm.section,
          admission_year: Number(userForm.admission_year),
        });
      } else {
        Object.assign(payload, {
          employee_id: userForm.employee_id,
          designation: userForm.designation,
        });
      }

      await createManagedUser(payload);
      setUserForm((prev) => ({
        ...prev,
        name: "",
        email: "",
        password: "",
        roll_number: "",
        employee_id: "",
        designation: "",
        phone: "",
      }));
      await refreshCore();
      flashSuccess("User created with profile.");
    } catch (err) {
      flashError(err, "Could not create user.");
    }
  }

  async function handleEditUser(row) {
    const nextName = window.prompt("Full name", row.student?.full_name || row.faculty?.full_name || row.name);
    if (!nextName || !nextName.trim()) return;
    try {
      await updateManagedUser(row.user_id, {
        name: nextName.trim(),
        full_name: nextName.trim(),
      });
      await refreshUsers();
      flashSuccess("User updated.");
    } catch (err) {
      flashError(err, "Could not update user.");
    }
  }

  async function handleToggleActive(row) {
    try {
      if (row.isActive) {
        await deactivateUser(row.user_id);
        flashSuccess("User deactivated.");
      } else {
        await activateUser(row.user_id);
        flashSuccess("User activated.");
      }
      await refreshUsers();
    } catch (err) {
      flashError(err, "Could not update account status.");
    }
  }

  async function handleResetPassword(row) {
    const nextPassword = window.prompt(`New password for ${row.email}`);
    if (!isPasswordStrong(nextPassword)) {
      flashError(null, PASSWORD_POLICY_MESSAGE);
      return;
    }
    try {
      await adminResetUserPassword(row.user_id, nextPassword);
      flashSuccess("Password reset.");
    } catch (err) {
      flashError(err, "Could not reset password.");
    }
  }

  async function handleCsvUpload(event) {
    event.preventDefault();
    if (!csvFile) {
      flashError(null, "Choose a CSV file first.");
      return;
    }
    try {
      const result = await bulkCreateUsersCsv(csvFile);
      setCsvFile(null);
      await refreshCore();
      flashSuccess(
        `CSV import finished: ${result.created_count} created, ${result.failed_count} failed.`
      );
    } catch (err) {
      flashError(err, "CSV import failed.");
    }
  }

  async function handleCreateAllocation(event) {
    event.preventDefault();
    try {
      await createAllocation({
        faculty_id: Number(allocationForm.faculty_id),
        subject_id: Number(allocationForm.subject_id),
      });
      const rows = await fetchAllocations();
      setAllocations(rows);
      flashSuccess("Faculty allocated to subject.");
    } catch (err) {
      flashError(err, "Could not create allocation.");
    }
  }

  async function handleDeleteAllocation(allocationId) {
    if (!window.confirm(`Remove allocation #${allocationId}?`)) return;
    try {
      await deleteAllocation(allocationId);
      setAllocations(await fetchAllocations());
      flashSuccess("Allocation removed.");
    } catch (err) {
      flashError(err, "Could not delete allocation.");
    }
  }

  async function handleCreateSubject(event) {
    event.preventDefault();
    try {
      await createSubject({
        subject_code: subjectForm.subject_code,
        subject_name: subjectForm.subject_name,
        dept_id: Number(subjectForm.dept_id),
        semester: Number(subjectForm.semester),
        credits: Number(subjectForm.credits),
        is_active: Boolean(subjectForm.is_active),
      });
      setSubjectForm((prev) => ({
        ...prev,
        subject_code: "",
        subject_name: "",
      }));
      await refreshCore();
      flashSuccess("Subject created.");
    } catch (err) {
      flashError(err, "Could not create subject.");
    }
  }

  async function handleCreateNotice(event) {
    event.preventDefault();
    try {
      await createNotice(noticeForm, noticeFile);
      setNoticeForm((prev) => ({ ...prev, title: "", content: "" }));
      setNoticeFile(null);
      await refreshCore();
      flashSuccess("Notice published.");
    } catch (err) {
      flashError(err, "Could not publish notice.");
    }
  }

  async function handleLoadTimetable(event) {
    event?.preventDefault?.();
    try {
      const rows = await fetchTimetableSlots({
        dept_id: Number(ttQuery.dept_id),
        semester: Number(ttQuery.semester),
        section: ttQuery.section,
      });
      setTtSlots(rows);
      flashSuccess(`Loaded ${rows.length} timetable slot(s).`);
    } catch (err) {
      setTtSlots([]);
      flashError(err, "Could not load timetable.");
    }
  }

  async function handleCreateTimetable(event) {
    event.preventDefault();
    try {
      await createTimetableSlot({
        subject_id: Number(ttForm.subject_id),
        faculty_id: Number(ttForm.faculty_id),
        dept_id: Number(ttForm.dept_id),
        semester: Number(ttForm.semester),
        section: ttForm.section,
        day_of_week: Number(ttForm.day_of_week),
        period: Number(ttForm.period),
        room: ttForm.room,
        start_time: ttForm.start_time,
        end_time: ttForm.end_time,
      });
      flashSuccess("Timetable slot created.");
      if (
        String(ttQuery.dept_id) === String(ttForm.dept_id) &&
        String(ttQuery.semester) === String(ttForm.semester) &&
        String(ttQuery.section).toUpperCase() === String(ttForm.section).toUpperCase()
      ) {
        await handleLoadTimetable();
      }
    } catch (err) {
      flashError(err, "Could not create timetable slot.");
    }
  }

  async function handleDeleteSlot(timetableId) {
    if (!window.confirm(`Delete timetable slot #${timetableId}?`)) return;
    try {
      await deleteTimetableSlot(timetableId);
      flashSuccess("Timetable slot deleted.");
      await handleLoadTimetable();
    } catch (err) {
      flashError(err, "Could not delete timetable slot.");
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    if (!isPasswordStrong(passwordForm.newPassword)) {
      flashError(null, PASSWORD_POLICY_MESSAGE);
      return;
    }
    try {
      await changePassword(passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      flashSuccess("Password updated.");
    } catch (err) {
      flashError(err, "Could not change password.");
    }
  }

  async function handleCreateCalendarEntry(event) {
    event.preventDefault();
    try {
      await createCalendarEntry({
        title: calendarForm.title,
        description: calendarForm.description || null,
        entry_type: calendarForm.entry_type,
        start_date: calendarForm.start_date,
        end_date: calendarForm.end_date || calendarForm.start_date,
        academic_year: Number(calendarForm.academic_year),
      });
      setCalendarForm((prev) => ({ ...prev, title: "", description: "" }));
      await refreshCalendar();
      flashSuccess("Calendar entry created.");
    } catch (err) {
      flashError(err, "Could not create calendar entry.");
    }
  }

  async function handleRenameCalendarEntry(entry) {
    const nextTitle = window.prompt("New title", entry.title);
    if (!nextTitle || nextTitle.trim() === entry.title) return;
    try {
      await updateCalendarEntry(entry.calendar_id, { title: nextTitle.trim() });
      await refreshCalendar();
      flashSuccess("Calendar entry updated.");
    } catch (err) {
      flashError(err, "Could not update calendar entry.");
    }
  }

  async function handleDeleteCalendarEntry(calendarId) {
    if (!window.confirm(`Delete calendar entry #${calendarId}?`)) return;
    try {
      await deleteCalendarEntry(calendarId);
      await refreshCalendar();
      flashSuccess("Calendar entry deleted.");
    } catch (err) {
      flashError(err, "Could not delete calendar entry.");
    }
  }

  function confirmSignOut() {
    logout();
    navigate("/login", { replace: true });
  }

  const todayLabel = new Date().toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="ap-shell">
      <aside className={`ap-sidebar ${menuOpen ? "ap-sidebar-open" : ""}`}>
        <div className="ap-brand">
          <GraduationCap size={30} />
          <span>CampusOS</span>
          <button className="ap-mobile-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}>
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
        <button className="ap-backdrop" aria-label="Close navigation overlay" onClick={() => setMenuOpen(false)} />
      )}

      <main className="ap-main">
        <header className="ap-topbar">
          <button className="ap-mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}>
            ☰
          </button>

          <div>
            <p className="ap-eyebrow">CAMPUSOS / MANAGEMENT</p>
            <h1>{activePage === "Dashboard" ? "Admin Dashboard" : activePage}</h1>
          </div>

          <div className="ap-admin-tools">
            <div className="ap-avatar">{initials}</div>
            <div className="ap-admin-id">
              <strong>{displayName}</strong>
              <span>System Administrator</span>
            </div>
            <button className="ap-signout" onClick={() => setShowSignOut(true)}>
              <LogOut size={17} />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <div className="ap-content">
          <MessageBanner error={error} success={success} />

          {loading ? (
            <div className="ap-panel">Loading admin dashboard from CampusOS APIs…</div>
          ) : null}

          {!loading && activePage === "Dashboard" && (
            <>
              <section className="ap-welcome">
                <div>
                  <h2>Welcome back, {displayName}</h2>
                  <p>Live campus overview: user counts, recent activity, and management shortcuts.</p>
                </div>
                <span className="ap-date-pill">
                  <CalendarDays size={15} /> {todayLabel}
                </span>
              </section>

              <section className="ap-stats-grid">
                <StatCard
                  icon={Users}
                  title="Active Users"
                  value={userCounts.active}
                  hint={`${userCounts.students} students · ${userCounts.faculty} faculty`}
                />
                <StatCard
                  icon={Bell}
                  title="Notices Published"
                  value={userCounts.notices}
                  hint={overview ? "From admin overview" : "From published notices"}
                />
                <StatCard
                  icon={FileText}
                  title="Study Materials"
                  value={userCounts.materials}
                  hint="Uploaded notes"
                />
                <StatCard
                  icon={Building2}
                  title="Departments"
                  value={userCounts.departments}
                  hint={`${userCounts.subjects} active subjects`}
                />
              </section>

              <section className="ap-main-grid">
                <article className="ap-panel">
                  <div className="ap-panel-heading">
                    <div>
                      <Clock3 />
                      <h2>Recent Activity</h2>
                    </div>
                    <button className="ap-text-action" onClick={() => selectPage("Notices")}>
                      View all <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <div className="ap-activity-list">
                    {recentActivity.length === 0 ? (
                      <p className="ap-empty">No recent activity yet. Create a user or publish a notice.</p>
                    ) : (
                      recentActivity.map((item) => (
                        <div className="ap-activity-item" key={item.id}>
                          <div className="ap-activity-icon">
                            {item.kind === "User" ? <Users size={18} /> : <Megaphone size={18} />}
                          </div>
                          <div className="ap-activity-copy">
                            <strong>{item.title}</strong>
                            <p>{item.detail}</p>
                          </div>
                          <time>{item.date}</time>
                        </div>
                      ))
                    )}
                  </div>
                </article>

                <article className="ap-panel">
                  <div className="ap-panel-heading">
                    <div>
                      <Zap />
                      <h2>Management Shortcuts</h2>
                    </div>
                  </div>
                  <div className="ap-shortcut-grid">
                    {shortcuts.map(({ title, detail, icon: Icon, page }) => (
                      <button className="ap-shortcut" key={title} onClick={() => selectPage(page)}>
                        <span className="ap-shortcut-icon">
                          <Icon size={21} />
                        </span>
                        <strong>{title}</strong>
                        <p>{detail}</p>
                        <ArrowUpRight className="ap-shortcut-arrow" size={17} />
                      </button>
                    ))}
                  </div>
                </article>

                <article className="ap-panel">
                  <div className="ap-panel-heading">
                    <div>
                      <CalendarDays />
                      <h2>Upcoming Academic Dates</h2>
                    </div>
                    <button className="ap-text-action" onClick={() => selectPage("Calendar")}>
                      View all <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <div className="ap-table-wrap">
                    <table className="ap-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Event</th>
                          <th>Details</th>
                          <th>Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {upcomingDates.map((item) => (
                          <tr key={item.calendar_id}>
                            <td>
                              {item.start_date}
                              {item.end_date && item.end_date !== item.start_date ? ` – ${item.end_date}` : ""}
                            </td>
                            <td>{item.title}</td>
                            <td>{item.description || "—"}</td>
                            <td>
                              <span className="ap-tag">{item.entry_type}</span>
                            </td>
                          </tr>
                        ))}
                        {upcomingDates.length === 0 ? (
                          <tr>
                            <td colSpan={4}>No academic calendar entries yet.</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </article>

                <article className="ap-panel">
                  <div className="ap-panel-heading">
                    <div>
                      <TrendingUp />
                      <h2>System Overview</h2>
                    </div>
                    <span className="ap-date-pill">Live counts</span>
                  </div>
                  <OverviewBars
                    users={userCounts.active}
                    materials={userCounts.materials}
                    notices={userCounts.notices}
                  />
                </article>
              </section>
            </>
          )}

          {!loading && activePage === "Users" && (
            <section className="ap-stack">
              <article className="ap-panel">
                <div className="ap-panel-heading">
                  <div>
                    <Users />
                    <h2>User directory</h2>
                  </div>
                </div>
                <form
                  className="ap-form-grid"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    try {
                      await refreshUsers(userFilter);
                      flashSuccess("User list refreshed.");
                    } catch (err) {
                      flashError(err, "Could not load users.");
                    }
                  }}
                >
                  <Field label="Role">
                    <select value={userFilter.role} onChange={(e) => setUserFilter({ ...userFilter, role: e.target.value })}>
                      <option value="">All</option>
                      <option value="STUDENT">STUDENT</option>
                      <option value="FACULTY">FACULTY</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </Field>
                  <Field label="Status">
                    <select value={userFilter.isActive} onChange={(e) => setUserFilter({ ...userFilter, isActive: e.target.value })}>
                      <option value="">All</option>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </Field>
                  <Field label="Search">
                    <input value={userFilter.search} onChange={(e) => setUserFilter({ ...userFilter, search: e.target.value })} placeholder="name, email, roll, employee id" />
                  </Field>
                  <button type="submit" className="ap-confirm-btn">Apply filters</button>
                </form>
                <div className="ap-table-wrap" style={{ marginTop: 16 }}>
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Profile</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((row) => (
                        <tr key={row.user_id}>
                          <td>{row.user_id}</td>
                          <td>{row.name}</td>
                          <td>{row.email}</td>
                          <td>{row.role}</td>
                          <td>
                            {row.student
                              ? `${row.student.roll_number} · sem ${row.student.semester}${row.student.section}`
                              : row.faculty
                                ? `${row.faculty.employee_id} · ${row.faculty.designation}`
                                : "—"}
                          </td>
                          <td>
                            <span className="ap-tag">{row.isActive ? "Active" : "Inactive"}</span>
                          </td>
                          <td>
                            <div className="ap-action-row">
                              {row.role !== "ADMIN" ? (
                                <>
                                  <button type="button" className="ap-text-action" onClick={() => handleEditUser(row)}>Edit</button>
                                  <button type="button" className="ap-text-action" onClick={() => handleToggleActive(row)}>
                                    {row.isActive ? "Deactivate" : "Activate"}
                                  </button>
                                  <button type="button" className="ap-text-action" onClick={() => handleResetPassword(row)}>Reset password</button>
                                </>
                              ) : (
                                <span className="ap-help">Protected</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={7}>No users match these filters.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </article>

              <div className="ap-split">
                <article className="ap-panel">
                  <div className="ap-panel-heading">
                    <div>
                      <Users />
                      <h2>Create user + profile</h2>
                    </div>
                  </div>
                  <form className="ap-form-grid" onSubmit={handleCreateUser}>
                    <Field label="Role">
                      <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                        <option value="STUDENT">STUDENT</option>
                        <option value="FACULTY">FACULTY</option>
                      </select>
                    </Field>
                    <Field label="Name">
                      <input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
                    </Field>
                    <Field label="Email">
                      <input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
                    </Field>
                    <Field label="Password">
                      <input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} minLength={8} required />
                    </Field>
                    <Field label="Department">
                      <select value={userForm.dept_id} onChange={(e) => setUserForm({ ...userForm, dept_id: e.target.value })} required>
                        {departments.map((dept) => (
                          <option key={dept.dept_id} value={dept.dept_id}>
                            {dept.dept_code} — {dept.dept_name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {userForm.role === "STUDENT" ? (
                      <>
                        <Field label="Roll number">
                          <input value={userForm.roll_number} onChange={(e) => setUserForm({ ...userForm, roll_number: e.target.value })} required />
                        </Field>
                        <Field label="Semester">
                          <input type="number" min={1} max={8} value={userForm.semester} onChange={(e) => setUserForm({ ...userForm, semester: e.target.value })} required />
                        </Field>
                        <Field label="Section">
                          <input value={userForm.section} onChange={(e) => setUserForm({ ...userForm, section: e.target.value })} required />
                        </Field>
                        <Field label="Admission year">
                          <input type="number" value={userForm.admission_year} onChange={(e) => setUserForm({ ...userForm, admission_year: e.target.value })} required />
                        </Field>
                      </>
                    ) : (
                      <>
                        <Field label="Employee ID">
                          <input value={userForm.employee_id} onChange={(e) => setUserForm({ ...userForm, employee_id: e.target.value })} required />
                        </Field>
                        <Field label="Designation">
                          <input value={userForm.designation} onChange={(e) => setUserForm({ ...userForm, designation: e.target.value })} required />
                        </Field>
                      </>
                    )}
                    <Field label="Phone (optional)">
                      <input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} placeholder="9876543210" />
                    </Field>
                    <button type="submit" className="ap-confirm-btn">Create account</button>
                  </form>
                </article>

                <article className="ap-panel">
                  <div className="ap-panel-heading">
                    <div>
                      <FileText />
                      <h2>CSV bulk upload</h2>
                    </div>
                  </div>
                  <p className="ap-help">
                    Header: role,name,email,password,dept_id,roll_number,semester,section,admission_year,employee_id,designation,phone
                  </p>
                  <form className="ap-form-grid" onSubmit={handleCsvUpload}>
                    <Field label="CSV file">
                      <input type="file" accept=".csv,text/csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} required />
                    </Field>
                    <button type="submit" className="ap-confirm-btn">Import CSV</button>
                  </form>
                </article>
              </div>

              <article className="ap-panel">
                <div className="ap-panel-heading">
                  <div>
                    <Building2 />
                    <h2>Departments</h2>
                  </div>
                </div>
                <form className="ap-form-grid" onSubmit={handleCreateDepartment}>
                  <Field label="Department name">
                    <input value={deptForm.dept_name} onChange={(e) => setDeptForm({ ...deptForm, dept_name: e.target.value })} required />
                  </Field>
                  <Field label="Department code">
                    <input value={deptForm.dept_code} onChange={(e) => setDeptForm({ ...deptForm, dept_code: e.target.value.toUpperCase() })} required />
                  </Field>
                  <button type="submit" className="ap-confirm-btn">Create department</button>
                </form>
                <div className="ap-table-wrap" style={{ marginTop: 16 }}>
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Code</th>
                        <th>Name</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map((dept) => (
                        <tr key={dept.dept_id}>
                          <td>{dept.dept_id}</td>
                          <td>{dept.dept_code}</td>
                          <td>{dept.dept_name}</td>
                          <td>
                            <button type="button" className="ap-text-action" onClick={() => handleRenameDepartment(dept)}>
                              Rename
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          )}

          {!loading && activePage === "Subjects" && (
            <section className="ap-stack">
              <article className="ap-panel">
                <div className="ap-panel-heading">
                  <div>
                    <BookOpen />
                    <h2>Create subject</h2>
                  </div>
                </div>
                <form className="ap-form-grid" onSubmit={handleCreateSubject}>
                  <Field label="Subject code">
                    <input value={subjectForm.subject_code} onChange={(e) => setSubjectForm({ ...subjectForm, subject_code: e.target.value })} required />
                  </Field>
                  <Field label="Subject name">
                    <input value={subjectForm.subject_name} onChange={(e) => setSubjectForm({ ...subjectForm, subject_name: e.target.value })} required />
                  </Field>
                  <Field label="Department">
                    <select value={subjectForm.dept_id} onChange={(e) => setSubjectForm({ ...subjectForm, dept_id: e.target.value })} required>
                      {departments.map((dept) => (
                        <option key={dept.dept_id} value={dept.dept_id}>
                          {dept.dept_code} — {dept.dept_name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Semester">
                    <input type="number" min={1} max={8} value={subjectForm.semester} onChange={(e) => setSubjectForm({ ...subjectForm, semester: e.target.value })} required />
                  </Field>
                  <Field label="Credits">
                    <input type="number" min={1} value={subjectForm.credits} onChange={(e) => setSubjectForm({ ...subjectForm, credits: e.target.value })} required />
                  </Field>
                  <button type="submit" className="ap-confirm-btn">Create subject</button>
                </form>
              </article>

              <article className="ap-panel">
                <div className="ap-panel-heading">
                  <div>
                    <BookOpen />
                    <h2>Subjects</h2>
                  </div>
                </div>
                <div className="ap-table-wrap">
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Dept</th>
                        <th>Sem</th>
                        <th>Credits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((subject) => (
                        <tr key={subject.subject_id}>
                          <td>{subject.subject_id}</td>
                          <td>{subject.subject_code}</td>
                          <td>{subject.subject_name}</td>
                          <td>{subject.dept_id}</td>
                          <td>{subject.semester}</td>
                          <td>{subject.credits}</td>
                        </tr>
                      ))}
                      {subjects.length === 0 ? (
                        <tr>
                          <td colSpan={6}>No subjects yet.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="ap-panel">
                <div className="ap-panel-heading">
                  <div>
                    <Users />
                    <h2>Faculty–subject allocation</h2>
                  </div>
                </div>
                <p className="ap-help">
                  Optional faculty–subject allocation beyond timetable slots. If the allocation API is not available, timetable allotment still works.
                </p>
                <form className="ap-form-grid" onSubmit={handleCreateAllocation}>
                  <Field label="Faculty">
                    <select value={allocationForm.faculty_id} onChange={(e) => setAllocationForm({ ...allocationForm, faculty_id: e.target.value })} required>
                      <option value="">Select faculty</option>
                      {facultyUsers.map((row) => (
                        <option key={row.user_id} value={row.faculty.faculty_id}>
                          {row.faculty.full_name} ({row.faculty.employee_id})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Subject">
                    <select value={allocationForm.subject_id} onChange={(e) => setAllocationForm({ ...allocationForm, subject_id: e.target.value })} required>
                      {subjects.map((subject) => (
                        <option key={subject.subject_id} value={subject.subject_id}>
                          {subject.subject_code} — {subject.subject_name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <button type="submit" className="ap-confirm-btn">Allocate faculty</button>
                </form>
                <div className="ap-table-wrap" style={{ marginTop: 16 }}>
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Faculty</th>
                        <th>Subject</th>
                        <th>Dept</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.map((row) => (
                        <tr key={row.allocation_id}>
                          <td>{row.allocation_id}</td>
                          <td>
                            {row.faculty?.full_name} ({row.faculty?.employee_id})
                          </td>
                          <td>
                            {row.subject?.subject_code} — {row.subject?.subject_name}
                          </td>
                          <td>{row.subject?.dept_id}</td>
                          <td>
                            <button type="button" className="ap-text-action" onClick={() => handleDeleteAllocation(row.allocation_id)}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                      {allocations.length === 0 ? (
                        <tr>
                          <td colSpan={5}>No faculty–subject allocations yet.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          )}

          {!loading && activePage === "Timetable" && (
            <section className="ap-stack">
              <article className="ap-panel">
                <div className="ap-panel-heading">
                  <div>
                    <Clock3 />
                    <h2>Load section timetable</h2>
                  </div>
                </div>
                <form className="ap-form-grid" onSubmit={handleLoadTimetable}>
                  <Field label="Department">
                    <select value={ttQuery.dept_id} onChange={(e) => setTtQuery({ ...ttQuery, dept_id: e.target.value })} required>
                      {departments.map((dept) => (
                        <option key={dept.dept_id} value={dept.dept_id}>
                          {dept.dept_code} — {dept.dept_name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Semester">
                    <input type="number" min={1} max={8} value={ttQuery.semester} onChange={(e) => setTtQuery({ ...ttQuery, semester: e.target.value })} required />
                  </Field>
                  <Field label="Section">
                    <input value={ttQuery.section} onChange={(e) => setTtQuery({ ...ttQuery, section: e.target.value })} required />
                  </Field>
                  <button type="submit" className="ap-confirm-btn">Load timetable</button>
                </form>
              </article>

              <article className="ap-panel">
                <div className="ap-panel-heading">
                  <div>
                    <Clock3 />
                    <h2>Create timetable slot</h2>
                  </div>
                </div>
                <form className="ap-form-grid" onSubmit={handleCreateTimetable}>
                  <Field label="Subject">
                    <select value={ttForm.subject_id} onChange={(e) => setTtForm({ ...ttForm, subject_id: e.target.value })} required>
                      {subjects.map((subject) => (
                        <option key={subject.subject_id} value={subject.subject_id}>
                          {subject.subject_code} — {subject.subject_name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Faculty">
                    <select value={ttForm.faculty_id} onChange={(e) => setTtForm({ ...ttForm, faculty_id: e.target.value })} required>
                      <option value="">Select faculty</option>
                      {facultyUsers.map((row) => (
                        <option key={row.user_id} value={row.faculty.faculty_id}>
                          {row.faculty.full_name} ({row.faculty.employee_id})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Department">
                    <select value={ttForm.dept_id} onChange={(e) => setTtForm({ ...ttForm, dept_id: e.target.value })} required>
                      {departments.map((dept) => (
                        <option key={dept.dept_id} value={dept.dept_id}>
                          {dept.dept_code}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Semester">
                    <input type="number" min={1} max={8} value={ttForm.semester} onChange={(e) => setTtForm({ ...ttForm, semester: e.target.value })} required />
                  </Field>
                  <Field label="Section">
                    <input value={ttForm.section} onChange={(e) => setTtForm({ ...ttForm, section: e.target.value })} required />
                  </Field>
                  <Field label="Day of week (1=Mon … 7=Sun)">
                    <input type="number" min={1} max={7} value={ttForm.day_of_week} onChange={(e) => setTtForm({ ...ttForm, day_of_week: e.target.value })} required />
                  </Field>
                  <Field label="Period">
                    <input type="number" min={1} value={ttForm.period} onChange={(e) => setTtForm({ ...ttForm, period: e.target.value })} required />
                  </Field>
                  <Field label="Room">
                    <input value={ttForm.room} onChange={(e) => setTtForm({ ...ttForm, room: e.target.value })} required />
                  </Field>
                  <Field label="Start time">
                    <input value={ttForm.start_time} onChange={(e) => setTtForm({ ...ttForm, start_time: e.target.value })} required />
                  </Field>
                  <Field label="End time">
                    <input value={ttForm.end_time} onChange={(e) => setTtForm({ ...ttForm, end_time: e.target.value })} required />
                  </Field>
                  <button type="submit" className="ap-confirm-btn">Create slot</button>
                </form>
              </article>

              <article className="ap-panel">
                <div className="ap-panel-heading">
                  <div>
                    <Clock3 />
                    <h2>Section slots</h2>
                  </div>
                </div>
                <div className="ap-table-wrap">
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Day</th>
                        <th>Period</th>
                        <th>Time</th>
                        <th>Subject</th>
                        <th>Faculty</th>
                        <th>Room</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {ttSlots.map((slot) => (
                        <tr key={slot.timetable_id}>
                          <td>{slot.timetable_id}</td>
                          <td>{DAY_LABELS[slot.day_of_week] || slot.day_of_week}</td>
                          <td>{slot.period}</td>
                          <td>
                            {slot.start_time}–{slot.end_time}
                          </td>
                          <td>{slot.subject?.subject_code || slot.subject_id}</td>
                          <td>{slot.faculty?.full_name || slot.faculty_id}</td>
                          <td>{slot.room}</td>
                          <td>
                            <button type="button" className="ap-text-action" onClick={() => handleDeleteSlot(slot.timetable_id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {ttSlots.length === 0 ? (
                        <tr>
                          <td colSpan={8}>Load a section timetable to manage slots.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          )}

          {!loading && activePage === "Calendar" && (
            <section className="ap-stack">
              <article className="ap-panel">
                <div className="ap-panel-heading">
                  <div>
                    <CalendarDays />
                    <h2>Add calendar entry</h2>
                  </div>
                </div>
                <p className="ap-help">
                  Holidays, examinations, events, and last working days. Assignment deadlines can also appear on student calendars.
                </p>
                <form className="ap-form-grid" onSubmit={handleCreateCalendarEntry}>
                  <Field label="Title">
                    <input value={calendarForm.title} onChange={(e) => setCalendarForm({ ...calendarForm, title: e.target.value })} required />
                  </Field>
                  <Field label="Type">
                    <select value={calendarForm.entry_type} onChange={(e) => setCalendarForm({ ...calendarForm, entry_type: e.target.value })}>
                      {["HOLIDAY", "EXAMINATION", "EVENT", "LAST_WORKING_DAY", "ASSIGNMENT_DEADLINE"].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Start date">
                    <input type="date" value={calendarForm.start_date} onChange={(e) => setCalendarForm({ ...calendarForm, start_date: e.target.value })} required />
                  </Field>
                  <Field label="End date">
                    <input type="date" value={calendarForm.end_date} onChange={(e) => setCalendarForm({ ...calendarForm, end_date: e.target.value })} />
                  </Field>
                  <Field label="Academic year">
                    <input
                      value={calendarForm.academic_year}
                      onChange={(e) => setCalendarForm({ ...calendarForm, academic_year: e.target.value })}
                      onBlur={() => refreshCalendar()}
                      required
                    />
                  </Field>
                  <Field label="Description">
                    <input value={calendarForm.description} onChange={(e) => setCalendarForm({ ...calendarForm, description: e.target.value })} />
                  </Field>
                  <button type="submit" className="ap-confirm-btn">Create entry</button>
                </form>
              </article>

              <article className="ap-panel">
                <div className="ap-panel-heading">
                  <div>
                    <CalendarDays />
                    <h2>Academic calendar</h2>
                  </div>
                  <button type="button" className="ap-text-action" onClick={() => refreshCalendar().then(() => flashSuccess("Calendar refreshed."))}>
                    Refresh
                  </button>
                </div>
                <div className="ap-table-wrap">
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Dates</th>
                        <th>Title</th>
                        <th>Type</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {calendarEntries.map((entry) => (
                        <tr key={entry.calendar_id}>
                          <td>{entry.calendar_id}</td>
                          <td>
                            {entry.start_date}
                            {entry.end_date && entry.end_date !== entry.start_date ? ` – ${entry.end_date}` : ""}
                          </td>
                          <td>{entry.title}</td>
                          <td>
                            <span className="ap-tag">{entry.entry_type}</span>
                          </td>
                          <td>
                            <button type="button" className="ap-text-action" onClick={() => handleRenameCalendarEntry(entry)}>
                              Edit
                            </button>
                            <button type="button" className="ap-text-action" onClick={() => handleDeleteCalendarEntry(entry.calendar_id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {calendarEntries.length === 0 ? (
                        <tr>
                          <td colSpan={5}>No calendar entries for this academic year.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          )}

          {!loading && activePage === "Notices" && (
            <section className="ap-stack">
              <article className="ap-panel">
                <div className="ap-panel-heading">
                  <div>
                    <Megaphone />
                    <h2>Publish notice</h2>
                  </div>
                </div>
                <form className="ap-form-grid" onSubmit={handleCreateNotice}>
                  <Field label="Title">
                    <input value={noticeForm.title} onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })} required />
                  </Field>
                  <Field label="Category">
                    <select value={noticeForm.category} onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })}>
                      {["academic", "exam", "event", "holiday", "urgent"].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Priority">
                    <select value={noticeForm.priority} onChange={(e) => setNoticeForm({ ...noticeForm, priority: e.target.value })}>
                      {["normal", "important", "urgent"].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Target type">
                    <select value={noticeForm.target_type} onChange={(e) => setNoticeForm({ ...noticeForm, target_type: e.target.value })}>
                      {["all", "dept", "year", "section"].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Target value">
                    <input value={noticeForm.target_value} onChange={(e) => setNoticeForm({ ...noticeForm, target_value: e.target.value })} required />
                  </Field>
                  <Field label="Content">
                    <textarea rows={4} value={noticeForm.content} onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })} required />
                  </Field>
                  <Field label="Attachment (optional)">
                    <input
                      type="file"
                      onChange={(e) => setNoticeFile(e.target.files?.[0] || null)}
                    />
                  </Field>
                  <button type="submit" className="ap-confirm-btn">Publish notice</button>
                </form>
              </article>

              <article className="ap-panel">
                <div className="ap-panel-heading">
                  <div>
                    <Megaphone />
                    <h2>Published notices</h2>
                  </div>
                </div>
                <div className="ap-activity-list">
                  {notices.map((notice) => (
                    <div className="ap-activity-item" key={notice.id}>
                      <div className="ap-activity-icon">
                        <Megaphone size={18} />
                      </div>
                      <div className="ap-activity-copy">
                        <strong>
                          {notice.title} · {notice.tag}
                          {typeof notice.read_count === "number" ? ` · ${notice.read_count} opened` : ""}
                        </strong>
                        <p>{notice.content}</p>
                        {notice.has_attachment ? <p>Attachment available</p> : null}
                      </div>
                      <time>{notice.date}</time>
                    </div>
                  ))}
                  {notices.length === 0 ? <p className="ap-empty">No notices published yet.</p> : null}
                </div>
              </article>
            </section>
          )}

          {!loading && activePage === "Settings" && (
            <section className="ap-stack">
              <article className="ap-panel">
                <div className="ap-panel-heading">
                  <div>
                    <Settings />
                    <h2>Change password</h2>
                  </div>
                </div>
                <form className="ap-form-grid" onSubmit={handleChangePassword}>
                  <Field label="Current password">
                    <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
                  </Field>
                  <Field label="New password">
                    <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} minLength={8} required />
                  </Field>
                  <button type="submit" className="ap-confirm-btn">Update password</button>
                </form>
              </article>
              <ProfileSettings />
            </section>
          )}
        </div>
      </main>

      {showSignOut && (
        <div className="ap-modal-backdrop" onClick={() => setShowSignOut(false)}>
          <section
            className="ap-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ap-signout-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ap-modal-icon">
              <LogOut size={23} />
            </div>
            <h2 id="ap-signout-title">Sign out?</h2>
            <p>You will be returned to the login screen.</p>
            <div className="ap-modal-actions">
              <button className="ap-cancel-btn" onClick={() => setShowSignOut(false)}>
                Cancel
              </button>
              <button className="ap-confirm-btn" onClick={confirmSignOut}>
                Sign out
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
