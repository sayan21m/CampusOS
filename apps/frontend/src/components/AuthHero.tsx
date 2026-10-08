import React from "react";
import { Clock3, GraduationCap, Lock, RefreshCw, ShieldCheck } from "lucide-react";

interface AuthHeroProps {
  title: string;
  description: string;
}

export function AuthBrand({ className = "hero-brand" }: { className?: string }): React.JSX.Element {
  return (
    <div className={className}>
      <span className="hero-brand-mark" aria-hidden="true">
        <GraduationCap size={22} />
      </span>
      <p className="hero-brand-name">CampusOS</p>
    </div>
  );
}

export default function AuthHero({ title, description }: AuthHeroProps): React.JSX.Element {
  return (
    <section className="campus-hero-panel">
      <div className="hero-content">
        <AuthBrand />
        <div className="badge-pill">
          <ShieldCheck size={14} aria-hidden="true" />
          Institutional Portal
        </div>
        <h1>{title}</h1>
        <p>{description}</p>

        <div className="campus-stats-grid">
          <div className="stat-item">
            <RefreshCw className="stat-icon" size={18} aria-hidden="true" />
            <span className="stat-number">100%</span>
            <span className="stat-label">Digital Sync</span>
          </div>
          <div className="stat-item">
            <Clock3 className="stat-icon" size={18} aria-hidden="true" />
            <span className="stat-number">24/7</span>
            <span className="stat-label">LMS Access</span>
          </div>
          <div className="stat-item">
            <Lock className="stat-icon" size={18} aria-hidden="true" />
            <span className="stat-number">Secure</span>
            <span className="stat-label">Role-Based Auth</span>
          </div>
        </div>
      </div>

      <div className="hero-footer-note">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>Secure SSL Encrypted Gateway</span>
      </div>
    </section>
  );
}
