import React, { useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css"; 

export default function Register(): React.JSX.Element {
  const auth = useAuth() as { isAuthenticated: boolean; login: (data: { token: string; user: any }) => void };
  const { isAuthenticated } = auth;
  const navigate = useNavigate();
  
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please check and try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Redirect user back to login after successful mock registration
      navigate("/login", { replace: true });
    } catch (requestError) {
      setError("Registration failed. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="campus-login-wrapper">
      {/* Left Hero / College Showcase Panel */}
      <section className="campus-hero-panel">
        <div className="hero-content">
          <div className="badge-pill">🏛️ Institutional Portal</div>
          <h1>Join CampusOS</h1>
          <p>
            Set up your academic profile to access centralized notices, study materials, assignment portals, 
            and real-time attendance tracking.
          </p>

          <div className="campus-stats-grid">
            <div className="stat-item">
              <span className="stat-number">100%</span>
              <span className="stat-label">Digital Sync</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">24/7</span>
              <span className="stat-label">LMS Access</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">Secure</span>
              <span className="stat-label">Role-Based Auth</span>
            </div>
          </div>
        </div>

        <div className="hero-footer-note">
          <span>Secure SSL Encrypted Gateway</span>
        </div>
      </section>

      {/* Right Register Form Panel */}
      <section className="login-card-section" aria-labelledby="register-title">
        <div className="login-card">
          <div className="login-header">
            <h2 id="register-title">Create an account</h2>
            <p className="login-subtitle">
              Enter your details to register for your institutional account.
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="email">Institutional Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="student@college.edu"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="password-row">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            {error && (
              <p className="form-error" role="alert">
                ⚠️ {error}
              </p>
            )}

            <button className="submit-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating account…" : "Register Account"}
            </button>
          </form>

          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Already have an account?{" "}
              <Link to="/login" className="forgot-link">
                Sign in
              </Link>
            </p>
          </div>

          <div className="login-card-footer">
            <p>Protected by institutional security protocols. Unauthorized access is prohibited.</p>
          </div>
        </div>
      </section>
    </main>
  );
}