import React from "react";
import { CalendarClock, CalendarCheck2 } from "lucide-react";
import SectionCard, { SectionEmpty, SectionError, SectionSkeleton } from "./SectionCard";
import type { StudentAssignment } from "./dashboardUtils";
import {
  describeDeadline,
  formatShortDate,
  formatTime,
  getDeadlineTone,
  getSubjectLabel,
} from "./dashboardUtils";

interface DeadlineListProps {
  deadlines: StudentAssignment[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onSelect: () => void;
}

const VISIBLE_LIMIT = 5;

export default function DeadlineList({
  deadlines,
  loading,
  error,
  onRetry,
  onSelect,
}: DeadlineListProps): React.JSX.Element {
  return (
    <SectionCard
      title="Upcoming deadlines"
      icon={CalendarClock}
      meta={!loading && !error && deadlines.length > 0 ? `${deadlines.length} open` : null}
    >
      {loading ? (
        <SectionSkeleton rows={3} />
      ) : error ? (
        <SectionError message={error} onRetry={onRetry} />
      ) : deadlines.length === 0 ? (
        <SectionEmpty
          icon={CalendarCheck2}
          title="No upcoming deadlines"
          description="Pending assignments will be listed here by due date."
        />
      ) : (
        <ol className="sd-timeline">
          {deadlines.slice(0, VISIBLE_LIMIT).map((assignment) => {
            const tone = getDeadlineTone(assignment.deadline);
            return (
              <li key={assignment.assignment_id} className={`sd-timeline-item is-${tone}`}>
                <button type="button" className="sd-timeline-btn" onClick={onSelect}>
                  <span className="sd-timeline-date" aria-hidden="true">
                    {formatShortDate(assignment.deadline)}
                  </span>
                  <span className="sd-timeline-body">
                    <span className="sd-timeline-title">{assignment.title}</span>
                    <span className="sd-timeline-meta">
                      <span className="sd-timeline-due">
                        {describeDeadline(assignment.deadline)}
                      </span>
                      <span>· {formatTime(assignment.deadline)}</span>
                      <span>· {getSubjectLabel(assignment)}</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </SectionCard>
  );
}
