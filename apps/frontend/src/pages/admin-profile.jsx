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
import {
  changePassword,
  createDepartment,
  createFacultyProfile,
  createNotice,
  createStudentProfile,
  createSubject,
  createTimetableSlot,
  deleteTimetableSlot,
  fetchDepartments,
  fetchNotices,
  fetchStudentById,
  fetchSubjects,
  fetchTimetableSlots,
  updateDepartment,
} from "../services/campus";
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
  { title: "Academic Calendar", detail: "Exam/holiday notices and schedule dates", icon: CalendarDays, page: "Calendar" },
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

function OverviewBars({ departments, subjects, notices }) {
  const rows = [
    { label: "Departments", value: departments, color: "#1d6047" },
    { label: "Subjects", value: subjects, color: "#2e8a61" },
    { label: "Notices", value: notices, color: "#9ac4a5" },
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

  const [deptForm, setDeptForm] = useState({ dept_name: "", dept_code: "" });
  const [studentForm, setStudentForm] = useState({
    userId: "",
    roll_number: "",
    full_name: "",
    dept_id: "",
    semester: "1",
    section: "A",
    admission_year: String(new Date().getFullYear()),
    phone: "",
  });
  const [facultyForm, setFacultyForm] = useState({
    userId: "",
    employee_id: "",
    full_name: "",
    dept_id: "",
    designation: "",
    phone: "",
  });
  const [studentLookupId, setStudentLookupId] = useState("");
  const [studentLookup, setStudentLookup] = useState(null);

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

  const calendarNotices = useMemo(() => {
    return notices.filter((notice) => {
      const category = String(notice.tag || "").toLowerCase();
      return ["exam", "holiday", "event", "academic"].includes(category);
    });
  }, [notices]);

  const academicDates = useMemo(() => calendarNotices.slice(0, 8), [calendarNotices]);

  async function refreshCore() {
    const [deptRows, subjectRows, noticeRows] = await Promise.all([
      fetchDepartments(),
      fetchSubjects(),
      fetchNotices(),
    ]);
    setDepartments(deptRows);
    setSubjects(subjectRows);
    setNotices(noticeRows);

    if (!studentForm.dept_id && deptRows[0]) {
      setStudentForm((prev) => ({ ...prev, dept_id: String(deptRows[0].dept_id) }));
    }
    if (!facultyForm.dept_id && deptRows[0]) {
      setFacultyForm((prev) => ({ ...prev, dept_id: String(deptRows[0].dept_id) }));
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

  async function handleCreateStudent(event) {
    event.preventDefault();
    try {
      await createStudentProfile({
        userId: Number(studentForm.userId),
        roll_number: studentForm.roll_number,
        full_name: studentForm.full_name,
        dept_id: Number(studentForm.dept_id),
        semester: Number(studentForm.semester),
        section: studentForm.section,
        admission_year: Number(studentForm.admission_year),
        ...(studentForm.phone ? { phone: studentForm.phone } : {}),
      });
      flashSuccess("Student profile created.");
      setStudentForm((prev) => ({
        ...prev,
        userId: "",
        roll_number: "",
        full_name: "",
        phone: "",
      }));
    } catch (err) {
      flashError(err, "Could not create student profile. User account must already exist.");
    }
  }

  async function handleCreateFaculty(event) {
    event.preventDefault();
    try {
      await createFacultyProfile({
        userId: Number(facultyForm.userId),
        employee_id: facultyForm.employee_id,
        full_name: facultyForm.full_name,
        dept_id: Number(facultyForm.dept_id),
        designation: facultyForm.designation,
        ...(facultyForm.phone ? { phone: facultyForm.phone } : {}),
      });
      flashSuccess("Faculty profile created.");
      setFacultyForm((prev) => ({
        ...prev,
        userId: "",
        employee_id: "",
        full_name: "",
        designation: "",
        phone: "",
      }));
    } catch (err) {
      flashError(err, "Could not create faculty profile. User account must already exist with FACULTY role.");
    }
  }

  async function handleLookupStudent(event) {
    event.preventDefault();
    try {
      const row = await fetchStudentById(studentLookupId);
      setStudentLookup(row);
      flashSuccess("Student found.");
    } catch (err) {
      setStudentLookup(null);
      flashError(err, "Student not found.");
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
      await createNotice(noticeForm);
      setNoticeForm((prev) => ({ ...prev, title: "", content: "" }));
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
    try {
      await changePassword(passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      flashSuccess("Password updated.");
    } catch (err) {
      flashError(err, "Could not change password.");
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
                  <p>Live campus overview from departments, subjects, and notices.</p>
                </div>
                <span className="ap-date-pill">
                  <CalendarDays size={15} /> {todayLabel}
                </span>
              </section>

              <section className="ap-stats-grid">
                <StatCard icon={Building2} title="Departments" value={departments.length} hint="From departments API" />
                <StatCard icon={FileText} title="Active Subjects" value={subjects.length} hint="From subjects API" />
                <StatCard icon={Bell} title="Notices Published" value={notices.length} hint="Visible to your account" />
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
                    {notices.length === 0 ? (
                      <p className="ap-empty">No notices yet. Publish one from Notices.</p>
                    ) : (
                      notices.slice(0, 5).map((notice) => (
                        <div className="ap-activity-item" key={notice.id}>
                          <div className="ap-activity-icon">
                            <Megaphone size={18} />
                          </div>
                          <div className="ap-activity-copy">
                            <strong>{notice.title}</strong>
                            <p>{notice.content?.slice(0, 120) || notice.tag}</p>
                          </div>
                          <time>{notice.date || "Recent"}</time>
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
                        {(academicDates.length ? academicDates : notices.slice(0, 5)).map((item) => (
                          <tr key={item.id}>
                            <td>{item.date || "—"}</td>
                            <td>{item.title}</td>
                            <td>{item.content?.slice(0, 80) || "—"}</td>
                            <td>
                              <span className="ap-tag">{item.tag || "Notice"}</span>
                            </td>
                          </tr>
                        ))}
                        {notices.length === 0 ? (
                          <tr>
                            <td colSpan={4}>No academic dates available yet.</td>
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
                    departments={departments.length}
                    subjects={subjects.length}
                    notices={notices.length}
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

              <div className="ap-split">
                <article className="ap-panel">
                  <div className="ap-panel-heading">
                    <div>
                      <Users />
                      <h2>Create student profile</h2>
                    </div>
                  </div>
                  <p className="ap-help">Requires an existing User account (`userId`). Students usually register first.</p>
                  <form className="ap-form-grid" onSubmit={handleCreateStudent}>
                    <Field label="User ID">
                      <input type="number" value={studentForm.userId} onChange={(e) => setStudentForm({ ...studentForm, userId: e.target.value })} required />
                    </Field>
                    <Field label="Roll number">
                      <input value={studentForm.roll_number} onChange={(e) => setStudentForm({ ...studentForm, roll_number: e.target.value })} required />
                    </Field>
                    <Field label="Full name">
                      <input value={studentForm.full_name} onChange={(e) => setStudentForm({ ...studentForm, full_name: e.target.value })} required />
                    </Field>
                    <Field label="Department">
                      <select value={studentForm.dept_id} onChange={(e) => setStudentForm({ ...studentForm, dept_id: e.target.value })} required>
                        {departments.map((dept) => (
                          <option key={dept.dept_id} value={dept.dept_id}>
                            {dept.dept_code} — {dept.dept_name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Semester">
                      <input type="number" min={1} max={8} value={studentForm.semester} onChange={(e) => setStudentForm({ ...studentForm, semester: e.target.value })} required />
                    </Field>
                    <Field label="Section">
                      <input value={studentForm.section} onChange={(e) => setStudentForm({ ...studentForm, section: e.target.value })} required />
                    </Field>
                    <Field label="Admission year">
                      <input type="number" value={studentForm.admission_year} onChange={(e) => setStudentForm({ ...studentForm, admission_year: e.target.value })} required />
                    </Field>
                    <Field label="Phone (optional)">
                      <input value={studentForm.phone} onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })} placeholder="9876543210" />
                    </Field>
                    <button type="submit" className="ap-confirm-btn">Create student</button>
                  </form>
                </article>

                <article className="ap-panel">
                  <div className="ap-panel-heading">
                    <div>
                      <Users />
                      <h2>Create faculty profile</h2>
                    </div>
                  </div>
                  <p className="ap-help">Requires an existing User with FACULTY role (`userId`).</p>
                  <form className="ap-form-grid" onSubmit={handleCreateFaculty}>
                    <Field label="User ID">
                      <input type="number" value={facultyForm.userId} onChange={(e) => setFacultyForm({ ...facultyForm, userId: e.target.value })} required />
                    </Field>
                    <Field label="Employee ID">
                      <input value={facultyForm.employee_id} onChange={(e) => setFacultyForm({ ...facultyForm, employee_id: e.target.value })} required />
                    </Field>
                    <Field label="Full name">
                      <input value={facultyForm.full_name} onChange={(e) => setFacultyForm({ ...facultyForm, full_name: e.target.value })} required />
                    </Field>
                    <Field label="Department">
                      <select value={facultyForm.dept_id} onChange={(e) => setFacultyForm({ ...facultyForm, dept_id: e.target.value })} required>
                        {departments.map((dept) => (
                          <option key={dept.dept_id} value={dept.dept_id}>
                            {dept.dept_code} — {dept.dept_name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Designation">
                      <input value={facultyForm.designation} onChange={(e) => setFacultyForm({ ...facultyForm, designation: e.target.value })} required />
                    </Field>
                    <Field label="Phone (optional)">
                      <input value={facultyForm.phone} onChange={(e) => setFacultyForm({ ...facultyForm, phone: e.target.value })} placeholder="9876543210" />
                    </Field>
                    <button type="submit" className="ap-confirm-btn">Create faculty</button>
                  </form>
                </article>
              </div>

              <article className="ap-panel">
                <div className="ap-panel-heading">
                  <div>
                    <Users />
                    <h2>Lookup student by ID</h2>
                  </div>
                </div>
                <form className="ap-form-inline" onSubmit={handleLookupStudent}>
                  <input type="number" value={studentLookupId} onChange={(e) => setStudentLookupId(e.target.value)} placeholder="student_id" required />
                  <button type="submit" className="ap-confirm-btn">Lookup</button>
                </form>
                {studentLookup ? (
                  <pre className="ap-code">{JSON.stringify(studentLookup, null, 2)}</pre>
                ) : null}
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
                  <Field label="Faculty ID">
                    <input type="number" value={ttForm.faculty_id} onChange={(e) => setTtForm({ ...ttForm, faculty_id: e.target.value })} required />
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
                    <h2>Academic calendar</h2>
                  </div>
                </div>
                <p className="ap-help">
                  Dedicated Academic Calendar API is not shipped yet. This view uses exam/holiday/event notices as institutional dates.
                </p>
                <div className="ap-table-wrap">
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(calendarNotices.length ? calendarNotices : notices).map((notice) => (
                        <tr key={notice.id}>
                          <td>{notice.date || "—"}</td>
                          <td>{notice.title}</td>
                          <td>
                            <span className="ap-tag">{notice.tag || "Notice"}</span>
                          </td>
                          <td>{notice.priority || (notice.urgent ? "urgent" : "normal")}</td>
                        </tr>
                      ))}
                      {notices.length === 0 ? (
                        <tr>
                          <td colSpan={4}>No calendar-related notices yet.</td>
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
                        </strong>
                        <p>{notice.content}</p>
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
