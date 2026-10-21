import React, { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, Mail, Send, ShieldCheck } from "lucide-react";
import AuthHero, { AuthBrand } from "../components/AuthHero";
import { useAuth } from "../context/AuthContext";
import { requestPasswordReset } from "../services/auth";
import "./Login.css";

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

    return "Failed to send reset link. Please try again.";
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
      const data = await requestPasswordReset({ email: trimmedEmail });

      setSuccessMessage(
        data?.message || "If the email exists, a password reset link has been sent."
      );
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
        description="Regain access to your CampusOS workspace securely. Update your institutional credentials to continue accessing your academic ecosystem."
      />

      <section className="login-card-section" aria-labelledby="forgot-title">
        <div className="login-card">
          <AuthBrand className="auth-mobile-brand" />
          <div className="login-header">
            <h2 id="forgot-title">Reset your password</h2>
            <p className="login-subtitle">
              We'll send recovery instructions to your institutional email.
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Institutional Email</label>
              <div className="input-wrap">
                <Mail className="input-icon" size={17} aria-hidden="true" />
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

            <button className="submit-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="spin" size={17} aria-hidden="true" />
                  Sending reset link…
                </>
              ) : (
                <>
                  <Send size={16} aria-hidden="true" />
                  Send Reset Link
                </>
              )}
            </button>
          </form>

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
