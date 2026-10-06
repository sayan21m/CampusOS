import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

interface StudentProfileData {
  name: string;
  rollNumber: string;
  branch: string;
  semester: string | number;
  section: string;
  email: string;
  phone: string;
  profilePhoto?: string | null;
  accountStatus: boolean;
}

export default function StudentProfile(): React.JSX.Element {
  const { user, logout } = useAuth() as {
    user: { role?: string; name?: string } | null;
    logout: () => void;
  };
  const navigate = useNavigate();

  const [profile, setProfile] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function fetchProfileData() {
      try {
        setLoading(true);
        setError("");

        if (!user) {
          setError("No active session detected.");
          setProfile(null);
          return;
        }

        if (user.role && user.role !== "STUDENT") {
          setError("Student profile is only available for student accounts.");
          setProfile(null);
          return;
        }

        const response = await api.get("/profile");
        const data = response.data?.profile;

        if (!data) {
          setError("Profile unavailable.");
          setProfile(null);
          return;
        }

        if (!cancelled) {
          setProfile({
            name: data.full_name || user.name || "N/A",
            rollNumber: data.roll_number || "N/A",
            branch: data.department?.dept_name || "N/A",
            semester: data.semester ?? "N/A",
            section: data.section || "N/A",
            email: data.email || "N/A",
            phone: data.phone || "N/A",
            profilePhoto: data.photo_url || null,
            accountStatus: Boolean(data.accountStatus),
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            "Failed to load student profile details.";
          setError(message);
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProfileData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#09382e",
          color: "#fff",
          fontFamily: "inherit",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid rgba(255,255,255,0.2)",
              borderTopColor: "#fff",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <p style={{ fontWeight: 600, letterSpacing: "0.05em" }}>Loading student profile...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f4f7f6",
          padding: "24px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "420px" }}>
          <p
            style={{
              color: "#9f2d22",
              background: "#fff1f0",
              padding: "16px 24px",
              borderRadius: "12px",
              fontWeight: 600,
              marginBottom: "16px",
            }}
          >
            {error || "Profile unavailable."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            style={{
              background: "#0f6b57",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "10px 16px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #06241e 0%, #09382e 50%, #0f6b57 100%)",
        padding: "40px 20px",
        fontFamily: "inherit",
      }}
    >
      <main style={{ maxWidth: "880px", margin: "0 auto", width: "100%" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginBottom: "16px",
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "10px",
              padding: "8px 14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={logout}
            style={{
              background: "#fff",
              color: "#09382e",
              border: "none",
              borderRadius: "10px",
              padding: "8px 14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Log out
          </button>
        </div>

        <div
          style={{
            background: "rgba(255, 255, 255, 0.96)",
            backdropFilter: "blur(20px)",
            borderRadius: "28px",
            boxShadow: "0 25px 60px rgba(4, 28, 22, 0.4)",
            overflow: "hidden",
            border: "1px solid rgba(255, 255, 255, 0.4)",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #09382e 0%, #0f6b57 100%)",
              padding: "48px 40px 40px",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: "32px",
              flexWrap: "wrap",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "110px",
                height: "110px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.15)",
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
                border: "4px solid rgba(255, 255, 255, 0.4)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                flexShrink: 0,
              }}
            >
              {profile.profilePhoto ? (
                <img
                  src={profile.profilePhoto}
                  alt={profile.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: "2rem", fontWeight: 800 }}>
                  {profile.name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: "240px", zIndex: 1 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(255, 255, 255, 0.18)",
                  padding: "6px 14px",
                  borderRadius: "30px",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  marginBottom: "12px",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                {profile.accountStatus ? "ACTIVE STUDENT" : "INACTIVE ACCOUNT"}
              </div>
              <h1
                style={{
                  margin: "0 0 6px",
                  fontSize: "2.5rem",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                }}
              >
                {profile.name}
              </h1>
              <p
                style={{
                  margin: 0,
                  color: "#b6ded3",
                  fontSize: "1rem",
                  fontWeight: 500,
                }}
              >
                Roll ID: <strong style={{ color: "#fff" }}>{profile.rollNumber}</strong>
              </p>
            </div>
          </div>

          <div style={{ padding: "40px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "24px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.15rem",
                  color: "#12241f",
                  fontWeight: 800,
                }}
              >
                Academic particulars
              </h3>
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "#0f6b57",
                  fontWeight: 700,
                  background: "#e8f3ef",
                  padding: "6px 12px",
                  borderRadius: "10px",
                }}
              >
                From GET /profile
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "16px",
              }}
            >
              <div
                style={{
                  background: "#f8fbf9",
                  padding: "18px 20px",
                  borderRadius: "16px",
                  border: "1px solid #e2ece8",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#6a827b",
                    fontWeight: 700,
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Branch of study
                </span>
                <span style={{ fontSize: "1rem", color: "#12241f", fontWeight: 700 }}>
                  {profile.branch}
                </span>
              </div>

              <div
                style={{
                  background: "#f8fbf9",
                  padding: "18px 20px",
                  borderRadius: "16px",
                  border: "1px solid #e2ece8",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#6a827b",
                    fontWeight: 700,
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Current semester
                </span>
                <span style={{ fontSize: "1rem", color: "#12241f", fontWeight: 700 }}>
                  {profile.semester}
                </span>
              </div>

              <div
                style={{
                  background: "#f8fbf9",
                  padding: "18px 20px",
                  borderRadius: "16px",
                  border: "1px solid #e2ece8",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#6a827b",
                    fontWeight: 700,
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Class section
                </span>
                <span style={{ fontSize: "1rem", color: "#12241f", fontWeight: 700 }}>
                  {profile.section}
                </span>
              </div>

              <div
                style={{
                  background: "#f8fbf9",
                  padding: "18px 20px",
                  borderRadius: "16px",
                  border: "1px solid #e2ece8",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#6a827b",
                    fontWeight: 700,
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Institutional email
                </span>
                <span
                  style={{
                    fontSize: "0.95rem",
                    color: "#12241f",
                    fontWeight: 700,
                    wordBreak: "break-all",
                  }}
                >
                  {profile.email}
                </span>
              </div>

              <div
                style={{
                  background: "#f8fbf9",
                  padding: "18px 20px",
                  borderRadius: "16px",
                  border: "1px solid #e2ece8",
                  gridColumn: "1 / -1",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#6a827b",
                    fontWeight: 700,
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Phone contact
                </span>
                <span style={{ fontSize: "1rem", color: "#12241f", fontWeight: 700 }}>
                  {profile.phone}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
