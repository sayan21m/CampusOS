import React, { useState } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { resetPassword } from "../services/auth";
import "./Login.css";

export default function ResetPassword(): React.JSX.Element {
  const auth = useAuth() as { isAuthenticated: boolean };
  const { isAuthenticated } = auth;
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";

  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  function getErrorMessage(error: unknown): string {
    const err = error as {
      response?: {
        data?: {
          message?: string;
          errors?: Array<{ message: string }>;
        };
      };
    };

    if (!err.response) {
      return "CampusOS is unavailable right now. Check your connection and try again.";
    }

    const data = err.response.data;

    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      return data.errors.map((issue) => issue.message).join(" ");
    }

    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message;
    }

    return "Password reset failed. Please try again.";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!token) {
      setError("This reset link is missing a token. Request a new password reset email.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please check and try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await resetPassword({
        token,
        newPassword,
      });

      setSuccessMessage(data?.message || "Password reset successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="campus-login-wrapper">
      <section className="campus-hero-panel">
        <div className="hero-content">
          <div className="badge-pill">🏛️ Institutional Portal</div>
          <h1>Password Recovery</h1>
          <p>
            Use the secure link from your email to choose a new password and regain access to your
            CampusOS workspace.
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

      <section className="login-card-section" aria-labelledby="reset-title">
        <div className="login-card">
          <div className="login-header">
            <h2 id="reset-title">Create new password</h2>
            <p className="login-subtitle">
              {token
                ? "Enter a strong new password for your account."
                : "This reset link is invalid or incomplete."}
            </p>
          </div>

          {!token ? (
            <div className="login-form">
              <p className="form-error" role="alert">
                ⚠️ This reset link is missing a token. Request a new password reset email.
              </p>
              <Link to="/forgot-password" className="submit-button" style={{ textAlign: "center" }}>
                Request a new reset link
              </Link>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="newPassword">New Password</label>
                <div className="password-row">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    disabled={isSubmitting || Boolean(successMessage)}
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
                  disabled={isSubmitting || Boolean(successMessage)}
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

              {!successMessage && (
                <button className="submit-button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating password…" : "Reset Password"}
                </button>
              )}

              {successMessage && (
                <Link to="/login" className="submit-button" style={{ textAlign: "center" }}>
                  Go to Login
                </Link>
              )}
            </form>
          )}

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
