import React from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SectionCardProps {
  id?: string;
  title: string;
  icon: LucideIcon;
  meta?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export default function SectionCard({
  id,
  title,
  icon: Icon,
  meta,
  className = "",
  children,
}: SectionCardProps): React.JSX.Element {
  const headingId = `${id || title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`;

  return (
    <section id={id} className={`sd-card ${className}`} aria-labelledby={headingId}>
      <header className="sd-card-head">
        <div className="sd-card-title">
          <span className="sd-card-icon" aria-hidden="true">
            <Icon size={16} strokeWidth={2} />
          </span>
          <h2 id={headingId}>{title}</h2>
        </div>
        {meta && <div className="sd-card-meta">{meta}</div>}
      </header>
      {children}
    </section>
  );
}

export function SectionSkeleton({ rows = 3 }: { rows?: number }): React.JSX.Element {
  return (
    <div className="sd-skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className="sd-skeleton-row" />
      ))}
    </div>
  );
}

interface SectionEmptyProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export function SectionEmpty({
  icon: Icon,
  title,
  description,
}: SectionEmptyProps): React.JSX.Element {
  return (
    <div className="sd-empty">
      <span className="sd-empty-icon" aria-hidden="true">
        <Icon size={18} strokeWidth={2} />
      </span>
      <p className="sd-empty-title">{title}</p>
      {description && <p className="sd-empty-text">{description}</p>}
    </div>
  );
}

interface SectionErrorProps {
  message: string;
  onRetry?: () => void;
}

export function SectionError({ message, onRetry }: SectionErrorProps): React.JSX.Element {
  return (
    <div className="sd-error" role="alert">
      <AlertCircle size={18} strokeWidth={2} aria-hidden="true" />
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="sd-btn sd-btn-secondary sd-btn-sm" onClick={onRetry}>
          <RotateCw size={14} strokeWidth={2} aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  );
}
