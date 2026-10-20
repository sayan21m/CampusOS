import React from "react";
import { Link } from "react-router-dom";
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
        <Link to="/notices" className="sd-link-btn">
          View all
        </Link>
      }
    >
      {notices.length === 0 ? (
        <SectionEmpty
          icon={Megaphone}
          title="No notices yet"
          description="Campus announcements will appear here when published."
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
