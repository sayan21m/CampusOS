import React from "react";
import { CheckCircle2, ClipboardList, Clock3, FileText, Inbox } from "lucide-react";
import SectionCard, { SectionEmpty, SectionError, SectionSkeleton } from "./SectionCard";
import type { StudentAssignment } from "./dashboardUtils";
import {
  describeDeadline,
  formatDateTime,
  getDeadlineTone,
  getStatusBadge,
  getSubjectLabel,
  hasReleasedMarks,
} from "./dashboardUtils";

export type AssignmentTab = "pending" | "submitted" | "late" | "graded";

export interface AssignmentGroups {
  pending: StudentAssignment[];
  submitted: StudentAssignment[];
  late: StudentAssignment[];
  graded: StudentAssignment[];
}

interface AssignmentPanelProps {
  id: string;
  groups: AssignmentGroups;
  activeTab: AssignmentTab;
  onTabChange: (tab: AssignmentTab) => void;
  loading: boolean;
  error: string;
  onRetry: () => void;
}

const TABS: Array<{ key: AssignmentTab; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "submitted", label: "Submitted" },
  { key: "late", label: "Late" },
  { key: "graded", label: "Graded" },
];

const EMPTY_COPY: Record<AssignmentTab, { title: string; description: string }> = {
  pending: {
    title: "No pending assignments",
    description: "You're all caught up. New assignments will appear here.",
  },
  submitted: {
    title: "Nothing awaiting review",
    description: "Assignments you submit on time will show up here.",
  },
  late: {
    title: "No late submissions",
    description: "Great work staying on schedule.",
  },
  graded: {
    title: "No released grades yet",
    description: "Marks appear here once your faculty releases them.",
  },
};

const VISIBLE_LIMIT = 6;

function AssignmentRow({ assignment }: { assignment: StudentAssignment }): React.JSX.Element {
  const badge = getStatusBadge(assignment);
  const showMarks = hasReleasedMarks(assignment);
  const isPending = assignment.status === "Pending";
  const tone = isPending ? getDeadlineTone(assignment.deadline) : "normal";
  const submittedAt = assignment.submission?.submitted_at;

  return (
    <li className="sd-assignment">
      <span className="sd-assignment-icon" aria-hidden="true">
        <FileText size={16} strokeWidth={2} />
      </span>
      <div className="sd-assignment-main">
        <p className="sd-assignment-title">{assignment.title}</p>
        <p className="sd-assignment-meta">
          <span>{getSubjectLabel(assignment)}</span>
          <span className="sd-dot" aria-hidden="true" />
          <span className={isPending ? `sd-due is-${tone}` : undefined}>
            <Clock3 size={13} strokeWidth={2} aria-hidden="true" />
            {isPending
              ? `${describeDeadline(assignment.deadline)} · ${formatDateTime(assignment.deadline)}`
              : `Due ${formatDateTime(assignment.deadline)}`}
          </span>
          {submittedAt && (
            <>
              <span className="sd-dot" aria-hidden="true" />
              <span>Submitted {formatDateTime(submittedAt)}</span>
            </>
          )}
        </p>
        {showMarks && assignment.submission?.feedback && (
          <p className="sd-assignment-feedback">“{assignment.submission.feedback}”</p>
        )}
      </div>
      <div className="sd-assignment-side">
        {showMarks ? (
          <p className="sd-marks">
            <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />
            {assignment.submission?.marks}
            <span>/{assignment.max_marks}</span>
          </p>
        ) : (
          <p className="sd-marks-muted">Max {assignment.max_marks}</p>
        )}
        <span className={`sd-badge is-${badge.tone}`}>{badge.label}</span>
      </div>
    </li>
  );
}

export default function AssignmentPanel({
  id,
  groups,
  activeTab,
  onTabChange,
  loading,
  error,
  onRetry,
}: AssignmentPanelProps): React.JSX.Element {
  const items = groups[activeTab];
  const total = TABS.reduce((sum, tab) => sum + groups[tab.key].length, 0);

  function handleTabKey(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
      return;
    }

    event.preventDefault();
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const next = TABS[(index + offset + TABS.length) % TABS.length];
    onTabChange(next.key);
    document.getElementById(`sd-tab-${next.key}`)?.focus();
  }

  return (
    <SectionCard
      id={id}
      title="Assignments"
      icon={ClipboardList}
      meta={loading ? "Loading…" : error ? null : `${total} total`}
      className="sd-card-assignments"
    >
      <div className="sd-tabs" role="tablist" aria-label="Assignment status">
        {TABS.map((tab, index) => (
          <button
            key={tab.key}
            id={`sd-tab-${tab.key}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls="sd-assignment-tabpanel"
            tabIndex={activeTab === tab.key ? 0 : -1}
            className={`sd-tab${activeTab === tab.key ? " is-active" : ""}`}
            onClick={() => onTabChange(tab.key)}
            onKeyDown={(event) => handleTabKey(event, index)}
          >
            {tab.label}
            <span className="sd-tab-count">{loading ? "–" : groups[tab.key].length}</span>
          </button>
        ))}
      </div>

      <div
        id="sd-assignment-tabpanel"
        role="tabpanel"
        aria-labelledby={`sd-tab-${activeTab}`}
        className="sd-tabpanel"
      >
        {loading ? (
          <SectionSkeleton rows={4} />
        ) : error ? (
          <SectionError message={error} onRetry={onRetry} />
        ) : items.length === 0 ? (
          <SectionEmpty
            icon={Inbox}
            title={EMPTY_COPY[activeTab].title}
            description={EMPTY_COPY[activeTab].description}
          />
        ) : (
          <>
            <ul className="sd-assignment-list">
              {items.slice(0, VISIBLE_LIMIT).map((assignment) => (
                <AssignmentRow key={assignment.assignment_id} assignment={assignment} />
              ))}
            </ul>
            {items.length > VISIBLE_LIMIT && (
              <p className="sd-list-foot">
                Showing {VISIBLE_LIMIT} of {items.length}
              </p>
            )}
          </>
        )}
      </div>
    </SectionCard>
  );
}
