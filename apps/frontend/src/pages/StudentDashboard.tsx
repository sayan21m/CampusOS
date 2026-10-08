import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  ClipboardList,
  LineChart,
  Percent,
  RotateCw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import ActivityList from "../components/student-dashboard/ActivityList";
import AssignmentPanel from "../components/student-dashboard/AssignmentPanel";
import type {
  AssignmentGroups,
  AssignmentTab,
} from "../components/student-dashboard/AssignmentPanel";
import DashboardHeader from "../components/student-dashboard/DashboardHeader";
import DashboardSidebar from "../components/student-dashboard/DashboardSidebar";
import DeadlineList from "../components/student-dashboard/DeadlineList";
import MetricCard from "../components/student-dashboard/MetricCard";
import NoticePreview from "../components/student-dashboard/NoticePreview";
import PerformanceChart from "../components/student-dashboard/PerformanceChart";
import type { PerformancePoint } from "../components/student-dashboard/PerformanceChart";
import QuickActions from "../components/student-dashboard/QuickActions";
import SectionCard, {
  SectionEmpty,
  SectionError,
  SectionSkeleton,
} from "../components/student-dashboard/SectionCard";
import type {
  StudentAssignment,
  StudentProfileSummary,
} from "../components/student-dashboard/dashboardUtils";
import {
  describeDeadline,
  formatShortDate,
  getAcademicYear,
  getDeadlineTone,
  getGreeting,
  getScorePercent,
  getSubjectLabel,
  sortByDeadline,
  toTime,
} from "../components/student-dashboard/dashboardUtils";
import "./StudentDashboard.css";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const CHART_LIMIT = 10;

function getErrorMessage(error: unknown, fallback: string): string {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
  );
}

export default function StudentDashboard(): React.JSX.Element {
  const { user, logout } = useAuth() as {
    user: { name?: string; role?: string } | null;
    logout: () => void;
  };
  const navigate = useNavigate();
  const assignmentsRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<StudentProfileSummary | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string>("");

  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState<boolean>(true);
  const [assignmentsError, setAssignmentsError] = useState<string>("");

  const [reloadKey, setReloadKey] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<AssignmentTab>("pending");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const showAssignments = useCallback((tab?: AssignmentTab) => {
    if (tab) {
      setActiveTab(tab);
    }
    assignmentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboardData() {
      setProfileLoading(true);
      setAssignmentsLoading(true);
      setProfileError("");
      setAssignmentsError("");

      const [profileResult, assignmentsResult] = await Promise.allSettled([
        api.get("/profile"),
        api.get("/submissions/my"),
      ]);

      if (cancelled) {
        return;
      }

      if (profileResult.status === "fulfilled") {
        const data = profileResult.value.data?.profile;
        setProfile(
          data
            ? {
                fullName: data.full_name || "",
                rollNumber: data.roll_number || "",
                department: data.department?.dept_name || "",
                semester: data.semester ?? null,
                section: data.section || "",
                photoUrl: data.photo_url || null,
              }
            : null
        );
      } else {
        setProfile(null);
        setProfileError(getErrorMessage(profileResult.reason, "Profile details unavailable."));
      }
      setProfileLoading(false);

      if (assignmentsResult.status === "fulfilled") {
        const list = assignmentsResult.value.data?.assignments;
        setAssignments(Array.isArray(list) ? (list as StudentAssignment[]) : []);
      } else {
        setAssignments([]);
        setAssignmentsError(
          getErrorMessage(assignmentsResult.reason, "Failed to load your assignments.")
        );
      }
      setAssignmentsLoading(false);
    }

    fetchDashboardData();

    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  useEffect(() => {
    if (!sidebarOpen) {
      return undefined;
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [sidebarOpen]);

  const derived = useMemo(() => {
    const now = Date.now();
    const pending = sortByDeadline(assignments.filter((item) => item.status === "Pending"));
    const overdue = pending.filter((item) => toTime(item.deadline) < now);
    const dueThisWeek = pending.filter((item) => {
      const time = toTime(item.deadline);
      return time >= now && time - now <= WEEK;
    });
    const graded = sortByDeadline(assignments.filter((item) => getScorePercent(item) !== null));
    const scores = graded.map((item) => getScorePercent(item) as number);
    const averageScore = scores.length
      ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10
      : null;

    const groups: AssignmentGroups = {
      pending,
      submitted: assignments.filter(
        (item) =>
          item.status === "Submitted" || (item.status === "Checked" && !item.submission?.is_late)
      ),
      late: assignments.filter(
        (item) =>
          item.status === "Late" || (item.status === "Checked" && Boolean(item.submission?.is_late))
      ),
      graded: [...assignments.filter((item) => item.status === "Graded")].sort(
        (a, b) => toTime(b.deadline) - toTime(a.deadline)
      ),
    };

    const activity = assignments
      .filter((item) => item.submission?.submitted_at)
      .sort(
        (a, b) =>
          toTime(b.submission?.submitted_at || "") - toTime(a.submission?.submitted_at || "")
      );

    const alerts = pending.filter((item) => getDeadlineTone(item.deadline, now) !== "normal");

    const chartPoints: PerformancePoint[] = graded.slice(-CHART_LIMIT).map((item) => ({
      id: item.assignment_id,
      label: item.title,
      detail: `${getSubjectLabel(item)} · due ${formatShortDate(item.deadline)}`,
      value: getScorePercent(item) as number,
      caption: `${item.submission?.marks}/${item.max_marks} marks`,
    }));

    return {
      pending,
      overdue,
      dueThisWeek,
      graded,
      averageScore,
      groups,
      activity,
      alerts,
      chartPoints,
    };
  }, [assignments]);

  const displayName = profile?.fullName || user?.name || "Student";
  const firstName = displayName.split(" ")[0];
  const contextChips = [
    profile?.semester !== null && profile?.semester !== undefined
      ? { label: "Semester", value: String(profile.semester) }
      : null,
    profile?.department ? { label: "Department", value: profile.department } : null,
    profile?.section ? { label: "Section", value: profile.section } : null,
    { label: "Academic year", value: getAcademicYear() },
  ].filter((chip): chip is { label: string; value: string } => chip !== null);

  const nextDeadline = derived.dueThisWeek[0];

  return (
    <div className="sd-page">
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onAssignmentsClick={() => showAssignments()}
      />

      <div className="sd-main">
        <DashboardHeader
          name={displayName}
          subtitle={profile?.rollNumber ? `Roll ${profile.rollNumber}` : "Student"}
          photoUrl={profile?.photoUrl || null}
          alerts={derived.alerts}
          alertsLoading={assignmentsLoading}
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={handleLogout}
          onAlertClick={() => showAssignments("pending")}
        />

        <main className="sd-content">
          <section className="sd-welcome" aria-labelledby="sd-welcome-heading">
            <div className="sd-welcome-copy">
              <h1 id="sd-welcome-heading">
                {getGreeting()}, {firstName} <span aria-hidden="true">👋</span>
              </h1>
              <p>Here&apos;s your academic overview for this semester.</p>

              {profileLoading ? (
                <div className="sd-chips" aria-busy="true">
                  <span className="sd-skeleton-row sd-skeleton-chip" />
                  <span className="sd-skeleton-row sd-skeleton-chip" />
                  <span className="sd-skeleton-row sd-skeleton-chip" />
                </div>
              ) : (
                <ul className="sd-chips" aria-label="Academic context">
                  {contextChips.map((chip) => (
                    <li key={chip.label} className="sd-chip">
                      <span>{chip.label}</span>
                      {chip.value}
                    </li>
                  ))}
                  {profileError && (
                    <li className="sd-chip is-error">
                      <AlertTriangle size={13} strokeWidth={2} aria-hidden="true" />
                      {profileError}
                      <button type="button" className="sd-link-btn" onClick={reload}>
                        <RotateCw size={12} strokeWidth={2} aria-hidden="true" />
                        Retry
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>

            <button
              type="button"
              className="sd-btn sd-btn-primary"
              onClick={() => showAssignments("pending")}
            >
              View pending work
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </section>

          <section className="sd-metrics" aria-label="Academic overview">
            <MetricCard
              label="Average score"
              icon={BarChart3}
              loading={assignmentsLoading}
              tone={derived.averageScore === null ? "muted" : "default"}
              value={
                assignmentsError
                  ? "—"
                  : derived.averageScore === null
                    ? "—"
                    : `${derived.averageScore}%`
              }
              hint={
                assignmentsError
                  ? "Unavailable right now"
                  : derived.graded.length
                    ? `Across ${derived.graded.length} released assignment${derived.graded.length === 1 ? "" : "s"}`
                    : "No released grades yet"
              }
            />
            <MetricCard
              label="Pending assignments"
              icon={ClipboardList}
              loading={assignmentsLoading}
              tone={derived.overdue.length ? "danger" : "default"}
              value={assignmentsError ? "—" : derived.pending.length}
              hint={
                assignmentsError
                  ? "Unavailable right now"
                  : derived.overdue.length
                    ? `${derived.overdue.length} overdue`
                    : derived.pending.length
                      ? "None overdue"
                      : "You're all caught up"
              }
            />
            <MetricCard
              label="Due in 7 days"
              icon={CalendarClock}
              loading={assignmentsLoading}
              tone={
                nextDeadline && getDeadlineTone(nextDeadline.deadline) === "approaching"
                  ? "warn"
                  : "default"
              }
              value={assignmentsError ? "—" : derived.dueThisWeek.length}
              hint={
                assignmentsError
                  ? "Unavailable right now"
                  : nextDeadline
                    ? `Next: ${describeDeadline(nextDeadline.deadline).replace("Due ", "")}`
                    : "Nothing due this week"
              }
            />
            <MetricCard
              label="Attendance"
              icon={Percent}
              tone="muted"
              value="—"
              hint="Not tracked in CampusOS yet"
            />
          </section>

          <div className="sd-grid">
            <div className="sd-col-main">
              <SectionCard
                title="Performance trend"
                icon={LineChart}
                meta={
                  !assignmentsLoading && !assignmentsError && derived.chartPoints.length > 0
                    ? `Last ${derived.chartPoints.length} released`
                    : null
                }
              >
                {assignmentsLoading ? (
                  <SectionSkeleton rows={4} />
                ) : assignmentsError ? (
                  <SectionError message={assignmentsError} onRetry={reload} />
                ) : derived.chartPoints.length === 0 ? (
                  <SectionEmpty
                    icon={LineChart}
                    title="No released grades yet"
                    description="Your score trend across assignments will appear once faculty release marks."
                  />
                ) : (
                  <>
                    <PerformanceChart
                      points={derived.chartPoints}
                      ariaLabel="Score percentage across released assignments"
                    />
                    <p className="sd-chart-legend">
                      <span className="sd-legend-line" aria-hidden="true" />
                      Score %
                      {derived.chartPoints.length > 1 && (
                        <>
                          <span className="sd-legend-line is-dashed" aria-hidden="true" />
                          Average
                        </>
                      )}
                    </p>
                  </>
                )}
              </SectionCard>

              <div ref={assignmentsRef} className="sd-anchor">
                <AssignmentPanel
                  id="sd-assignments"
                  groups={derived.groups}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  loading={assignmentsLoading}
                  error={assignmentsError}
                  onRetry={reload}
                />
              </div>
            </div>

            <div className="sd-col-side">
              <DeadlineList
                deadlines={derived.pending}
                loading={assignmentsLoading}
                error={assignmentsError}
                onRetry={reload}
                onSelect={() => showAssignments("pending")}
              />
              <QuickActions onViewAssignments={() => showAssignments()} />
              <ActivityList
                items={derived.activity}
                loading={assignmentsLoading}
                error={assignmentsError}
                onRetry={reload}
              />
              <NoticePreview notices={[]} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
