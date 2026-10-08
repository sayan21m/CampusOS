import React from "react";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  hint: React.ReactNode;
  icon: LucideIcon;
  tone?: "default" | "warn" | "danger" | "muted";
  loading?: boolean;
}

export default function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  loading = false,
}: MetricCardProps): React.JSX.Element {
  return (
    <article className={`sd-metric is-${tone}`}>
      <div className="sd-metric-head">
        <p className="sd-metric-label">{label}</p>
        <span className="sd-metric-icon" aria-hidden="true">
          <Icon size={16} strokeWidth={2} />
        </span>
      </div>
      {loading ? (
        <>
          <span className="sd-skeleton-row sd-skeleton-value" />
          <span className="sd-skeleton-row sd-skeleton-hint" />
        </>
      ) : (
        <>
          <p className="sd-metric-value">{value}</p>
          <p className="sd-metric-hint">{hint}</p>
        </>
      )}
    </article>
  );
}
