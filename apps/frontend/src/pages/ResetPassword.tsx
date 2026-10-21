import React, { useState } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import AuthHero, { AuthBrand } from "../components/AuthHero";
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
      <AuthHero
        title="Password Recovery"
        description="Use the secure link from your email to choose a new password and regain access to your CampusOS workspace."
      />

      <section className="login-card-section" aria-labelledby="reset-title">
        <div className="login-card">
          <AuthBrand className="auth-mobile-brand" />
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
                <AlertCircle size={16} aria-hidden="true" />
                This reset link is missing a token. Request a new password reset email.
              </p>
              <Link to="/forgot-password" className="submit-button">
                Request a new reset link
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="newPassword">New Password</label>
                <div className="input-wrap password-row">
                  <Lock className="input-icon" size={17} aria-hidden="true" />
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
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="field">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-wrap">
                  <Lock className="input-icon" size={17} aria-hidden="true" />
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
              </div>

              {error && (
                <p className="form-error" role="alert">
                  <AlertCircle size={16} aria-hidden="true" />
                  {error}
                </p>
              )}

              {successMessage && (
                <p className="form-success" role="status">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  {successMessage}
                </p>
              )}

              {!successMessage && (
                <button className="submit-button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="spin" size={17} aria-hidden="true" />
                      Updating password…
                    </>
                  ) : (
                    <>
                      <KeyRound size={16} aria-hidden="true" />
                      Reset Password
                    </>
                  )}
                </button>
              )}

              {successMessage && (
                <Link to="/login" className="submit-button">
                  Go to Login
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              )}
            </form>
          )}

          <p className="auth-switch">
            Remember your password?{" "}
            <Link to="/login" className="forgot-link">
              Sign in
            </Link>
          </p>

          <div className="login-card-footer">
            <ShieldCheck size={14} aria-hidden="true" />
            <p>Protected by institutional security protocols. Unauthorized access is prohibited.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
