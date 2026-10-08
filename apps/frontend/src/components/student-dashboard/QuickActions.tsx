import React from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Megaphone,
  Upload,
  UserRound,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import SectionCard from "./SectionCard";

interface QuickActionsProps {
  onViewAssignments: () => void;
}

interface QuickActionItem {
  label: string;
  icon: LucideIcon;
  to?: string;
  onClick?: () => void;
}

function QuickAction({ label, icon: Icon, to, onClick }: QuickActionItem): React.JSX.Element {
  const content = (
    <>
      <span className="sd-quick-icon" aria-hidden="true">
        <Icon size={17} strokeWidth={2} />
      </span>
      <span className="sd-quick-label">{label}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className="sd-quick">
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" className="sd-quick" onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <span className="sd-quick is-disabled" aria-disabled="true" title="Coming soon">
      {content}
      <span className="sd-quick-soon">Soon</span>
    </span>
  );
}

export default function QuickActions({ onViewAssignments }: QuickActionsProps): React.JSX.Element {
  const actions: QuickActionItem[] = [
    { label: "View assignments", icon: ClipboardList, onClick: onViewAssignments },
    { label: "Submit assignment", icon: Upload },
    { label: "Study materials", icon: BookOpen },
    { label: "Notices", icon: Megaphone },
    { label: "Timetable", icon: CalendarDays },
    { label: "Profile", icon: UserRound, to: "/student-profile" },
  ];

  return (
    <SectionCard title="Quick actions" icon={Zap}>
      <div className="sd-quick-grid">
        {actions.map((action) => (
          <QuickAction key={action.label} {...action} />
        ))}
      </div>
    </SectionCard>
  );
}
