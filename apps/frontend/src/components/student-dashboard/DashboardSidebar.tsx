import React from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Percent,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface DashboardSidebarProps {
  open: boolean;
  onClose: () => void;
  onAssignmentsClick: () => void;
}

const UPCOMING_MODULES: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Attendance", icon: Percent },
  { label: "Timetable", icon: CalendarDays },
  { label: "Study materials", icon: BookOpen },
  { label: "Notices", icon: Megaphone },
];

export default function DashboardSidebar({
  open,
  onClose,
  onAssignmentsClick,
}: DashboardSidebarProps): React.JSX.Element {
  return (
    <>
      <aside id="sd-sidebar" className={`sd-sidebar${open ? " is-open" : ""}`}>
        <div className="sd-sidebar-brand">
          <span className="sd-brand-mark" aria-hidden="true">
            <GraduationCap size={18} strokeWidth={2} />
          </span>
          <div>
            <p className="sd-brand-name">CampusOS</p>
            <p className="sd-brand-sub">Student Portal</p>
          </div>
          <button
            type="button"
            className="sd-sidebar-close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <nav className="sd-nav" aria-label="Student navigation">
          <p className="sd-nav-label">Overview</p>
          <Link
            to="/dashboard"
            className="sd-nav-item is-active"
            aria-current="page"
            onClick={onClose}
          >
            <LayoutDashboard size={17} strokeWidth={2} aria-hidden="true" />
            <span>Dashboard</span>
          </Link>
          <button
            type="button"
            className="sd-nav-item"
            onClick={() => {
              onAssignmentsClick();
              onClose();
            }}
          >
            <ClipboardList size={17} strokeWidth={2} aria-hidden="true" />
            <span>Assignments</span>
          </button>
          <Link to="/student-profile" className="sd-nav-item" onClick={onClose}>
            <UserRound size={17} strokeWidth={2} aria-hidden="true" />
            <span>Profile</span>
          </Link>

          <p className="sd-nav-label">Coming soon</p>
          {UPCOMING_MODULES.map(({ label, icon: Icon }) => (
            <span key={label} className="sd-nav-item is-disabled" aria-disabled="true">
              <Icon size={17} strokeWidth={2} aria-hidden="true" />
              <span>{label}</span>
              <span className="sd-nav-soon">Soon</span>
            </span>
          ))}
        </nav>
      </aside>
      {open && <div className="sd-sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
    </>
  );
}
