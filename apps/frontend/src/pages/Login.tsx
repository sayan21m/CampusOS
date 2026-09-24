import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginUser } from "../services/auth";
import "./Login.css";

const SUPPORTED_ROLES: Record<string, string> = {
  STUDENT: "/dashboard",
  FACULTY: "/dashboard",
  ADMIN: "/dashboard",
};

interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
      errors?: Array<{ message: string }>;
    };
  };
}

function getErrorMessage(error: unknown): string {
  const err = error as ApiErrorResponse;
  
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

  return "Login failed. Please try again.";
}

export default function Login(): React.JSX.Element {
  const auth = useAuth() as { isAuthenticated: boolean; login: (data: { token: string; user: any }) => void };
  const { isAuthenticated, login } = auth;
  const navigate = useNavigate();
  
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError("Enter both your institutional email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const data: any = await loginUser({
        email: trimmedEmail,
        password,
      });

      const role = data?.user?.role;
      const destination = SUPPORTED_ROLES[role];

      if (!data?.token || !data?.user || !destination) {
        setError("Login succeeded, but this account role is not authorized for portal access.");
        return;
      }

      login({
        token: data.token,
        user: data.user,
      });
      navigate(destination, { replace: true });
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
          <h1>Welcome to CampusOS</h1>
          <p>
            Your complete academic ecosystem. Centralizing notices, notes, assignment submissions, 
            and real-time attendance tracking in one seamless operating system.
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

      <section className="login-card-section" aria-labelledby="login-title">
        <div className="login-card">
          <div className="login-header">
            <h2 id="login-title">Sign in to portal</h2>
            <p className="login-subtitle">
              Enter your official college credentials to continue.
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

            <div className="field">
              <div className="label-row">
                <label htmlFor="password">Password</label>
                <a href="#forgot" className="forgot-link" onClick={(e) => e.preventDefault()}>
                  Forgot password?
                </a>
              </div>
              <div className="password-row">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
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

            {error && (
              <p className="form-error" role="alert">
                ⚠️ {error}
              </p>
            )}

            <button className="submit-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Authenticating session…" : "Sign in to Dashboard"}
            </button>
          </form>

          <div className="login-card-footer">
            <p>Protected by institutional security protocols. Unauthorized access is prohibited.</p>
          </div>
        </div>
      </section>
    </main>
  );
}