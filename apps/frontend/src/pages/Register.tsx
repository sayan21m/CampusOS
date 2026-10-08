import React, { useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import AuthHero, { AuthBrand } from "../components/AuthHero";
import { useAuth } from "../context/AuthContext";
import { registerUser } from "../services/auth";
import "./Login.css";

export default function Register(): React.JSX.Element {
  const auth = useAuth() as {
    isAuthenticated: boolean;
    login: (data: { token: string; user: any }) => void;
  };
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

    return "Registration failed. Please try again later.";
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

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      await registerUser({
        name: trimmedName,
        email: trimmedEmail,
        password,
      });

      navigate("/login", { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="campus-login-wrapper">
      <AuthHero
        title="Join CampusOS"
        description="Set up your academic profile to access centralized notices, study materials, assignment portals, and real-time attendance tracking."
      />

      <section className="login-card-section" aria-labelledby="register-title">
        <div className="login-card">
          <AuthBrand className="auth-mobile-brand" />
          <div className="login-header">
            <h2 id="register-title">Create an account</h2>
            <p className="login-subtitle">
              Enter your details to register for your institutional account.
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="name">Full Name</label>
              <div className="input-wrap">
                <UserRound className="input-icon" size={17} aria-hidden="true" />
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
            </div>

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

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-wrap password-row">
                <Lock className="input-icon" size={17} aria-hidden="true" />
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

            <button className="submit-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="spin" size={17} aria-hidden="true" />
                  Creating account…
                </>
              ) : (
                <>
                  Register Account
                  <ArrowRight size={17} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{" "}
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
