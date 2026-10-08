import React from "react";
import { Activity, Award, Clock3, Eye, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import SectionCard, { SectionEmpty, SectionError, SectionSkeleton } from "./SectionCard";
import type { StudentAssignment } from "./dashboardUtils";
import { describeRelativePast, hasReleasedMarks } from "./dashboardUtils";

interface ActivityListProps {
  items: StudentAssignment[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}

const VISIBLE_LIMIT = 5;

function describeActivity(assignment: StudentAssignment): {
  icon: LucideIcon;
  action: string;
  tone: string;
} {
  if (hasReleasedMarks(assignment)) {
    return {
      icon: Award,
      action: `Marks released: ${assignment.submission?.marks}/${assignment.max_marks}`,
      tone: "ok",
    };
  }

  if (assignment.status === "Checked") {
    return { icon: Eye, action: "Evaluated · awaiting release", tone: "neutral" };
  }

  if (assignment.status === "Late") {
    return { icon: Clock3, action: "Submitted after the deadline", tone: "warn" };
  }

  return { icon: Send, action: "Submitted", tone: "info" };
}

export default function ActivityList({
  items,
  loading,
  error,
  onRetry,
}: ActivityListProps): React.JSX.Element {
  return (
    <SectionCard title="Recent activity" icon={Activity}>
      {loading ? (
        <SectionSkeleton rows={3} />
      ) : error ? (
        <SectionError message={error} onRetry={onRetry} />
      ) : items.length === 0 ? (
        <SectionEmpty
          icon={Activity}
          title="No activity yet"
          description="Your submissions and released grades will appear here."
        />
      ) : (
        <ul className="sd-activity">
          {items.slice(0, VISIBLE_LIMIT).map((assignment) => {
            const { icon: Icon, action, tone } = describeActivity(assignment);
            const submittedAt = assignment.submission?.submitted_at || "";
            return (
              <li key={assignment.assignment_id} className="sd-activity-item">
                <span className={`sd-activity-icon is-${tone}`} aria-hidden="true">
                  <Icon size={14} strokeWidth={2} />
                </span>
                <div className="sd-activity-body">
                  <p className="sd-activity-title">{assignment.title}</p>
                  <p className="sd-activity-meta">
                    {action}
                    {submittedAt && <span> · submitted {describeRelativePast(submittedAt)}</span>}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
