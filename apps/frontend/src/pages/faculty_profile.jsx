import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./faculty_profile.css";

const FacultyProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

        if (user.role && user.role !== "FACULTY") {
          setError("Faculty profile is only available for faculty accounts.");
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
            employeeId: data.employeeId || "N/A",
            designation: data.designation || "N/A",
            email: data.email || "N/A",
            department: data.department?.dept_name || "N/A",
            role: data.role || user.role || "FACULTY",
            profilePhoto: data.photo_url || null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          const message = err?.response?.data?.message || "Failed to load faculty profile details.";
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
      <div className="faculty-page">
        <div className="profile-container">
          <p>Loading faculty profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="faculty-page">
        <div className="profile-container">
          <p>{error || "Profile unavailable."}</p>
          <button type="button" className="back-btn" onClick={() => navigate("/dashboard")}>
            ← <span>Back to Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  const mailto = profile.email && profile.email !== "N/A" ? `mailto:${profile.email}` : undefined;

  return (
    <div className="faculty-page">
      <div className="profile-container">
        {/* ================= HEADER ================= */}
        <div className="profile-header">
          {/* Back Button */}
          <button type="button" className="back-btn" onClick={() => navigate("/dashboard")}>
            ← <span>Back to Dashboard</span>
          </button>

          {/* Change Password */}
          <button
            type="button"
            className="password-btn"
            onClick={() => navigate("/reset-password")}
          >
            🔒 Change Password
          </button>

          {/* Profile Section */}
          <div className="profile-intro">
            {/* Avatar */}
            <div className="avatar">
              <div className="avatar-face">
                {profile.profilePhoto ? (
                  <img src={profile.profilePhoto} alt={profile.name} />
                ) : (
                  "👩🏻‍🏫"
                )}
              </div>
            </div>

            <div className="profile-main-info">
              {/* Edit Profile */}
              <button type="button" className="edit-btn">
                ✎ &nbsp; Edit Profile
              </button>

              <h1>
                <span className="user-icon">👤</span>
                {profile.name}
              </h1>

              <h3>{profile.designation}</h3>

              <div className="header-details">
                <span>🎓 &nbsp; {profile.department}</span>

                <span>
                  ✉ &nbsp;
                  {mailto ? <a href={mailto}>{profile.email}</a> : profile.email}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= INFORMATION CARDS ================= */}
        <div className="info-grid">
          {/* Full Name */}
          <div className="info-card">
            <div className="card-icon">👤</div>

            <div className="card-content">
              <p>Full Name</p>
              <h3>{profile.name}</h3>
            </div>
          </div>

          {/* Email */}
          <div className="info-card">
            <div className="card-icon">✉</div>

            <div className="card-content">
              <p>Email</p>
              <h3>{mailto ? <a href={mailto}>{profile.email}</a> : profile.email}</h3>
            </div>
          </div>

          {/* Employee ID */}
          <div className="info-card">
            <div className="card-icon">🪪</div>

            <div className="card-content">
              <p>Employee ID</p>
              <h3>{profile.employeeId}</h3>
            </div>
          </div>

          {/* Department */}
          <div className="info-card">
            <div className="card-icon">🎓</div>

            <div className="card-content">
              <p>Department</p>
              <h3>{profile.department}</h3>
            </div>
          </div>

          {/* Designation */}
          <div className="info-card">
            <div className="card-icon">🎓</div>

            <div className="card-content">
              <p>Designation</p>
              <h3>{profile.designation}</h3>
            </div>
          </div>

          {/* Role */}
          <div className="info-card">
            <div className="card-icon">👥</div>

            <div className="card-content">
              <p>Role</p>
              <h3>{profile.role}</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyProfile;
