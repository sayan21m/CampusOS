import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, GraduationCap, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import "./profile.css";

export interface ProfileNavItem {
  label: string;
  icon: LucideIcon;
  to?: string;
  active?: boolean;
}

interface ProfileLayoutProps {
  portalLabel: string;
  name: string;
  subtitle: string;
  photoUrl: string | null;
  navItems: ProfileNavItem[];
  upcomingItems?: ProfileNavItem[];
  onLogout: () => void;
  children: React.ReactNode;
}

export function getInitials(name: string | null | undefined): string {
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

export default function ProfileLayout({
  portalLabel,
  name,
  subtitle,
  photoUrl,
  navItems,
  upcomingItems = [],
  onLogout,
  children,
}: ProfileLayoutProps): React.JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sidebarOpen && !menuOpen) {
      return undefined;
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSidebarOpen(false);
        setMenuOpen(false);
      }
    }

    function handlePointer(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handlePointer);

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handlePointer);
    };
  }, [sidebarOpen, menuOpen]);

  return (
    <div className="pf-page">
      <aside id="pf-sidebar" className={`pf-sidebar${sidebarOpen ? " is-open" : ""}`}>
        <div className="pf-sidebar-brand">
          <span className="pf-brand-mark" aria-hidden="true">
            <GraduationCap size={18} strokeWidth={2} />
          </span>
          <div>
            <p className="pf-brand-name">CampusOS</p>
            <p className="pf-brand-sub">{portalLabel}</p>
          </div>
          <button
            type="button"
            className="pf-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <nav className="pf-nav" aria-label={`${portalLabel} navigation`}>
          <p className="pf-nav-label">Overview</p>
          {navItems.map(({ label, icon: Icon, to, active }) =>
            to ? (
              <Link
                key={label}
                to={to}
                className={`pf-nav-item${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={17} strokeWidth={2} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            ) : null
          )}

          {upcomingItems.length > 0 && (
            <>
              <p className="pf-nav-label">Coming soon</p>
              {upcomingItems.map(({ label, icon: Icon }) => (
                <span key={label} className="pf-nav-item is-disabled" aria-disabled="true">
                  <Icon size={17} strokeWidth={2} aria-hidden="true" />
                  <span>{label}</span>
                  <span className="pf-nav-soon">Soon</span>
                </span>
              ))}
            </>
          )}
        </nav>
      </aside>
      {sidebarOpen && (
        <div
          className="pf-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="pf-main">
        <header className="pf-header">
          <div className="pf-header-context">
            <button
              type="button"
              className="pf-icon-btn pf-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              aria-controls="pf-sidebar"
            >
              <Menu size={18} strokeWidth={2} />
            </button>
            <div>
              <p className="pf-header-crumb">{portalLabel}</p>
              <p className="pf-header-title">My profile</p>
            </div>
          </div>

          <div className="pf-menu-anchor" ref={menuRef}>
            <button
              type="button"
              className="pf-profile-btn"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <span className="pf-avatar-sm" aria-hidden="true">
                {photoUrl ? <img src={photoUrl} alt="" /> : getInitials(name)}
              </span>
              <span className="pf-profile-text">
                <span className="pf-profile-name">{name}</span>
                <span className="pf-profile-sub">{subtitle}</span>
              </span>
              <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
            </button>

            {menuOpen && (
              <div className="pf-popover" role="menu">
                <Link
                  to="/dashboard"
                  className="pf-popover-item"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  <LayoutDashboard size={16} strokeWidth={2} aria-hidden="true" />
                  Dashboard
                </Link>
                <button
                  type="button"
                  className="pf-popover-item is-danger"
                  role="menuitem"
                  onClick={onLogout}
                >
                  <LogOut size={16} strokeWidth={2} aria-hidden="true" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="pf-content">{children}</main>
      </div>
    </div>
  );
}
