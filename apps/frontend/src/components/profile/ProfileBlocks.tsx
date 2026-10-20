import React from "react";
import { AlertCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getInitials } from "./ProfileLayout";

export interface ProfileFact {
  label: string;
  value: React.ReactNode;
}

interface ProfileHeroProps {
  name: string;
  roleLabel: string;
  photoUrl: string | null;
  isActive: boolean;
  facts: ProfileFact[];
  actions?: React.ReactNode;
}

export function ProfileHero({
  name,
  roleLabel,
  photoUrl,
  isActive,
  facts,
  actions,
}: ProfileHeroProps): React.JSX.Element {
  return (
    <section className="pf-hero" aria-labelledby="pf-name">
      <div className="pf-avatar">
        {photoUrl ? <img src={photoUrl} alt={name} /> : <span>{getInitials(name)}</span>}
      </div>

      <div className="pf-hero-body">
        <div className="pf-hero-top">
          <div className="pf-hero-identity">
            <div className="pf-hero-badges">
              <span className="pf-badge is-role">{roleLabel}</span>
              <span className={`pf-badge ${isActive ? "is-ok" : "is-warn"}`}>
                <span className="pf-status-dot" aria-hidden="true" />
                {isActive ? "Active account" : "Inactive account"}
              </span>
            </div>
            <h1 id="pf-name">{name}</h1>
          </div>
          {actions && <div className="pf-hero-actions">{actions}</div>}
        </div>

        {facts.length > 0 && (
          <dl className="pf-facts">
            {facts.map((fact) => (
              <div key={fact.label} className="pf-fact">
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

export interface ProfileField {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  wrap?: boolean;
}

interface ProfileSectionProps {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  fields: ProfileField[];
}

export function ProfileSection({
  id,
  title,
  description,
  icon: Icon,
  fields,
}: ProfileSectionProps): React.JSX.Element {
  const headingId = `${id}-heading`;

  return (
    <section className="pf-card" aria-labelledby={headingId}>
      <header className="pf-card-head">
        <span className="pf-card-icon" aria-hidden="true">
          <Icon size={16} strokeWidth={2} />
        </span>
        <div>
          <h2 id={headingId}>{title}</h2>
          <p>{description}</p>
        </div>
      </header>

      {fields.length === 0 ? (
        <p className="pf-card-empty">No details available yet.</p>
      ) : (
        <dl className="pf-fields">
          {fields.map(({ label, value, icon: FieldIcon, wrap }) => (
            <div key={label} className="pf-field">
              <span className="pf-field-icon" aria-hidden="true">
                <FieldIcon size={16} strokeWidth={2} />
              </span>
              <dt>{label}</dt>
              <dd className={wrap ? "is-wrap" : undefined}>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export function ProfileSkeleton(): React.JSX.Element {
  return (
    <div className="pf-skeleton" aria-busy="true" aria-label="Loading profile">
      <div className="pf-hero pf-hero-skeleton">
        <span className="pf-skeleton-block pf-skeleton-avatar" />
        <div className="pf-skeleton-lines">
          <span className="pf-skeleton-block pf-skeleton-title" />
          <span className="pf-skeleton-block pf-skeleton-line" />
        </div>
      </div>
      <div className="pf-grid">
        <span className="pf-skeleton-block pf-skeleton-card" />
        <span className="pf-skeleton-block pf-skeleton-card" />
      </div>
    </div>
  );
}

interface ProfileErrorProps {
  message: string;
  action: React.ReactNode;
}

export function ProfileError({ message, action }: ProfileErrorProps): React.JSX.Element {
  return (
    <section className="pf-card pf-error-card" role="alert">
      <span className="pf-error-icon" aria-hidden="true">
        <AlertCircle size={20} strokeWidth={2} />
      </span>
      <h2>We couldn&apos;t load this profile</h2>
      <p>{message}</p>
      {action}
    </section>
  );
}
