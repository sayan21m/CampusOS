import React, { useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { requestPasswordReset } from "../services/auth";
import "./Login.css";

export default function ForgotPassword(): React.JSX.Element {
  const auth = useAuth() as { isAuthenticated: boolean };
  const { isAuthenticated } = auth;
  const navigate = useNavigate();
  
  // Step management: "request" (email form) vs "reset" (new password form)
  const [step, setStep] = useState<"request" | "reset">("request");

  const [email, setEmail] = useState<string>("");
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

    return "Operation failed. Please try again.";
  }

  // Step 1: Handle Email Submission (Request Link)
  async function handleRequestSubmit(event: React.FormEvent<HTMLFormElement>) {
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
      await requestPasswordReset({ email: trimmedEmail });

     
      setSuccessMessage("Recovery email verified. Please set your new password.");
      setTimeout(() => {
        setStep("reset");
        setSuccessMessage("");
      }, 1000);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Step 2: Handle New Password Submission
  async function handleResetSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!newPassword || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please check and try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate backend call to update password
      await new Promise((resolve) => setTimeout(resolve, 800));

      setSuccessMessage("Password successfully reset! Redirecting to login…");
      
      // Redirect to login page after a brief delay
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
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
            Regain access to your CampusOS workspace securely. Update your institutional credentials 
            to continue accessing your academic ecosystem.
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

      {/* Right Form Panel */}
      <section className="login-card-section" aria-labelledby="forgot-title">
        <div className="login-card">
          <div className="login-header">
            <h2 id="forgot-title">
              {step === "request" ? "Reset your password" : "Create new password"}
            </h2>
            <p className="login-subtitle">
              {step === "request"
                ? "We'll send recovery instructions to your institutional email."
                : "Enter a strong new password for your account."}
            </p>
          </div>

          {/* STEP 1: Email Request Form */}
          {step === "request" && (
            <form className="login-form" onSubmit={handleRequestSubmit} noValidate>
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
                {isSubmitting ? "Verifying email…" : "Send Reset Link"}
              </button>
            </form>
          )}

          {/* STEP 2: New & Confirm Password Form */}
          {step === "reset" && (
            <form className="login-form" onSubmit={handleResetSubmit} noValidate>
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
                {isSubmitting ? "Updating password…" : "Proceed to Login"}
              </button>
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