import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, ChevronDown, LogOut, Menu, UserRound } from "lucide-react";
import type { StudentAssignment } from "./dashboardUtils";
import { describeDeadline, getDeadlineTone, getInitials } from "./dashboardUtils";

interface DashboardHeaderProps {
  name: string;
  subtitle: string;
  photoUrl: string | null;
  alerts: StudentAssignment[];
  alertsLoading: boolean;
  onMenuClick: () => void;
  onLogout: () => void;
  onAlertClick: () => void;
}

type OpenMenu = "alerts" | "profile" | null;

export default function DashboardHeader({
  name,
  subtitle,
  photoUrl,
  alerts,
  alertsLoading,
  onMenuClick,
  onLogout,
  onAlertClick,
}: DashboardHeaderProps): React.JSX.Element {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) {
      return undefined;
    }

    function handlePointer(event: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [openMenu]);

  function toggle(menu: Exclude<OpenMenu, null>) {
    setOpenMenu((current) => (current === menu ? null : menu));
  }

  return (
    <header className="sd-header">
      <div className="sd-header-context">
        <button
          type="button"
          className="sd-icon-btn sd-menu-btn"
          onClick={onMenuClick}
          aria-label="Open navigation"
          aria-controls="sd-sidebar"
        >
          <Menu size={18} strokeWidth={2} />
        </button>
        <div>
          <p className="sd-header-crumb">Student Portal</p>
          <p className="sd-header-title">Dashboard</p>
        </div>
      </div>

      <div className="sd-header-actions" ref={actionsRef}>
        <div className="sd-menu-anchor">
          <button
            type="button"
            className="sd-icon-btn"
            onClick={() => toggle("alerts")}
            aria-haspopup="true"
            aria-expanded={openMenu === "alerts"}
            aria-label={`Deadline alerts${alerts.length ? `, ${alerts.length} new` : ""}`}
          >
            <Bell size={18} strokeWidth={2} />
            {alerts.length > 0 && <span className="sd-badge-dot">{alerts.length}</span>}
          </button>

          {openMenu === "alerts" && (
            <div className="sd-popover sd-popover-wide" role="menu">
              <p className="sd-popover-title">Deadline alerts</p>
              {alertsLoading ? (
                <p className="sd-popover-empty">Checking your deadlines…</p>
              ) : alerts.length === 0 ? (
                <p className="sd-popover-empty">You&apos;re all caught up. No urgent deadlines.</p>
              ) : (
                <ul className="sd-popover-list">
                  {alerts.map((assignment) => {
                    const tone = getDeadlineTone(assignment.deadline);
                    return (
                      <li key={assignment.assignment_id}>
                        <button
                          type="button"
                          className="sd-popover-item"
                          role="menuitem"
                          onClick={() => {
                            setOpenMenu(null);
                            onAlertClick();
                          }}
                        >
                          <span className={`sd-tone-dot is-${tone}`} aria-hidden="true" />
                          <span className="sd-popover-text">
                            <span className="sd-popover-strong">{assignment.title}</span>
                            <span>{describeDeadline(assignment.deadline)}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="sd-menu-anchor">
          <button
            type="button"
            className="sd-profile-btn"
            onClick={() => toggle("profile")}
            aria-haspopup="true"
            aria-expanded={openMenu === "profile"}
          >
            <span className="sd-avatar" aria-hidden="true">
              {photoUrl ? <img src={photoUrl} alt="" /> : getInitials(name)}
            </span>
            <span className="sd-profile-text">
              <span className="sd-profile-name">{name}</span>
              <span className="sd-profile-sub">{subtitle}</span>
            </span>
            <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
          </button>

          {openMenu === "profile" && (
            <div className="sd-popover" role="menu">
              <Link
                to="/student-profile"
                className="sd-popover-item"
                role="menuitem"
                onClick={() => setOpenMenu(null)}
              >
                <UserRound size={16} strokeWidth={2} aria-hidden="true" />
                My profile
              </Link>
              <button
                type="button"
                className="sd-popover-item is-danger"
                role="menuitem"
                onClick={onLogout}
              >
                <LogOut size={16} strokeWidth={2} aria-hidden="true" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
