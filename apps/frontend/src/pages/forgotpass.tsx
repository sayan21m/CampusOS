import React, { useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css"; // Reusing clean login & auth styles

export default function ForgotPassword(): React.JSX.Element {
  const auth = useAuth() as { isAuthenticated: boolean };
  const { isAuthenticated } = auth;
  
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Please enter your institutional email.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Placeholder simulation for sending password reset instructions
      await new Promise((resolve) => setTimeout(resolve, 900));
      
      setSuccessMessage(
        "If an account exists with this email, password reset instructions have been sent."
      );
    } catch (requestError) {
      setError("Failed to send reset link. Please try again.");
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
          <h1>Password Recovery</h1>
          <p>
            Regain access to your CampusOS workspace securely. Enter your registered institutional 
            email address to receive a recovery link.
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

      {/* Right Forgot Password Form Panel */}
      <section className="login-card-section" aria-labelledby="forgot-title">
        <div className="login-card">
          <div className="login-header">
            <h2 id="forgot-title">Reset your password</h2>
            <p className="login-subtitle">
              We'll send recovery instructions to your institutional email.
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
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

            {error && (
              <p className="form-error" role="alert">
                ⚠️ {error}
              </p>
            )}

            {successMessage && (
              <p
                style={{
                  margin: 0,
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "#e8f3ef",
                  color: "#0f6b57",
                  fontSize: "0.88rem",
                  fontWeight: 500,
                }}
                role="status"
              >
                ✅ {successMessage}
              </p>
            )}

            <button className="submit-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending link…" : "Send Reset Link"}
            </button>
          </form>

          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Remember your password?{" "}
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