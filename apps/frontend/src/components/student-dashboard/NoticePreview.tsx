import React from "react";
import { Megaphone } from "lucide-react";
import SectionCard, { SectionEmpty } from "./SectionCard";

export interface NoticeSummary {
  id: number | string;
  title: string;
  date: string;
  description: string;
  important?: boolean;
}

interface NoticePreviewProps {
  notices: NoticeSummary[];
}

export default function NoticePreview({ notices }: NoticePreviewProps): React.JSX.Element {
  return (
    <SectionCard
      title="Notices"
      icon={Megaphone}
      meta={
        <button
          type="button"
          className="sd-link-btn"
          disabled
          aria-disabled="true"
          title="Notice board is coming soon"
        >
          View all
        </button>
      }
    >
      {notices.length === 0 ? (
        <SectionEmpty
          icon={Megaphone}
          title="Notice board coming soon"
          description="Campus announcements will appear here once notices are enabled."
        />
      ) : (
        <ul className="sd-notices">
          {notices.slice(0, 3).map((notice) => (
            <li key={notice.id} className="sd-notice">
              <p className="sd-notice-meta">
                {notice.important && <span className="sd-badge is-danger">Important</span>}
                <span>{notice.date}</span>
              </p>
              <p className="sd-notice-title">{notice.title}</p>
              <p className="sd-notice-text">{notice.description}</p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
