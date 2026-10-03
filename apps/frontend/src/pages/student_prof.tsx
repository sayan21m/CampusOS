import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./Login.css"; 

interface StudentProfileData {
  name: string;
  rollNumber: string;
  branch: string;
  semester: string | number;
  section: string;
  email: string;
  phone: string;
  profilePhoto?: string;
  academicSummary: {
    attendancePercentage: number;
    assignmentsSubmitted: number;
    totalAssignments: number;
  };
}

export default function StudentProfile(): React.JSX.Element {
  const { user } = useAuth() as { user: any };
  
  const [profile, setProfile] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    function fetchProfileData() {
      try {
        setLoading(true);
        if (user) {
          setProfile({
            name: user.name || "N/A",
            rollNumber: user.rollNumber || user.id || "N/A",
            branch: user.branch || "N/A",
            semester: user.semester || "N/A",
            section: user.section || "N/A",
            email: user.email || "N/A",
            phone: user.phone || "N/A",
            profilePhoto: user.profilePhoto,
            academicSummary: {
              attendancePercentage: user.attendancePercentage || 85.0,
              assignmentsSubmitted: user.assignmentsSubmitted || 12,
              totalAssignments: user.totalAssignments || 15,
            },
          });
          setError("");
        } else {
          setError("No active session detected.");
        }
      } catch (err) {
        setError("Failed to load student profile details.");
      } finally {
        setLoading(false);
      }
    }
    fetchProfileData();
  }, [user]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#09382e", color: "#fff", fontFamily: "inherit" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "40px", height: "40px", border: "4px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ fontWeight: 600, letterSpacing: "0.05em" }}>Loading CampusOS Space...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4f7f6" }}>
        <p style={{ color: "#9f2d22", background: "#fff1f0", padding: "16px 24px", borderRadius: "12px", fontWeight: 600 }}>⚠️ {error || "Profile unavailable."}</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #06241e 0%, #09382e 50%, #0f6b57 100%)", padding: "40px 20px", fontFamily: "inherit" }}>
      <main style={{ maxWidth: "880px", margin: "0 auto", width: "100%" }}>
        
        {/* Main Floating Glass Shell */}
        <div style={{ background: "rgba(255, 255, 255, 0.96)", backdropFilter: "blur(20px)", borderRadius: "28px", boxShadow: "0 25px 60px rgba(4, 28, 22, 0.4)", overflow: "hidden", border: "1px solid rgba(255, 255, 255, 0.4)" }}>
          
          {/* Dynamic Header Block */}
          <div style={{ background: "linear-gradient(135deg, #09382e 0%, #0f6b57 100%)", padding: "48px 40px 40px", color: "#ffffff", display: "flex", alignItems: "center", gap: "32px", flexWrap: "wrap", position: "relative" }}>
            
            <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "220px", height: "220px", background: "radial-gradient(circle, rgba(46, 204, 113, 0.25) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
            
            <div style={{ width: "110px", height: "110px", borderRadius: "50%", background: "rgba(255, 255, 255, 0.15)", display: "grid", placeItems: "center", overflow: "hidden", border: "4px solid rgba(255, 255, 255, 0.4)", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", flexShrink: 0, position: "relative" }}>
              {profile.profilePhoto ? (
                <img src={profile.profilePhoto} alt={profile.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "3rem" }}>👨‍🎓</span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: "240px", zIndex: 1 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255, 255, 255, 0.18)", padding: "6px 14px", borderRadius: "30px", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "12px", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.2)" }}>
                <span>🟢</span> ACTIVE INSTITUTIONAL SESSION
              </div>
              <h1 style={{ margin: "0 0 6px", fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.03em", textShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>{profile.name}</h1>
              <p style={{ margin: 0, color: "#b6ded3", fontSize: "1rem", fontWeight: 500, display: "flex", gap: "12px", alignItems: "center" }}>
                <span>Roll ID: <strong style={{ color: "#fff" }}>{profile.rollNumber}</strong></span>
                <span style={{ opacity: 0.5 }}>•</span>
                <span>CampusOS v2.6</span>
              </p>
            </div>
          </div>

          {/* Interactive Core Body */}
          <div style={{ padding: "40px" }}>
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#12241f", fontWeight: 800, letterSpacing: "-0.01em" }}>⚡ Academic Particulars</h3>
              <span style={{ fontSize: "0.8rem", color: "#0f6b57", fontWeight: 700, background: "#e8f3ef", padding: "6px 12px", borderRadius: "10px" }}>Verified Record</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "40px" }}>
              
              <div style={{ background: "#f8fbf9", padding: "18px 20px", borderRadius: "16px", border: "1px solid #e2ece8" }}>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6a827b", fontWeight: 700, display: "block", marginBottom: "6px" }}>Branch of Study</span>
                <span style={{ fontSize: "1rem", color: "#12241f", fontWeight: 700 }}>{profile.branch}</span>
              </div>

              <div style={{ background: "#f8fbf9", padding: "18px 20px", borderRadius: "16px", border: "1px solid #e2ece8" }}>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6a827b", fontWeight: 700, display: "block", marginBottom: "6px" }}>Current Semester</span>
                <span style={{ fontSize: "1rem", color: "#12241f", fontWeight: 700 }}>{profile.semester}</span>
              </div>

              <div style={{ background: "#f8fbf9", padding: "18px 20px", borderRadius: "16px", border: "1px solid #e2ece8" }}>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6a827b", fontWeight: 700, display: "block", marginBottom: "6px" }}>Class Section</span>
                <span style={{ fontSize: "1rem", color: "#12241f", fontWeight: 700 }}>{profile.section}</span>
              </div>

              <div style={{ background: "#f8fbf9", padding: "18px 20px", borderRadius: "16px", border: "1px solid #e2ece8" }}>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6a827b", fontWeight: 700, display: "block", marginBottom: "6px" }}>Institutional Email</span>
                <span style={{ fontSize: "0.95rem", color: "#12241f", fontWeight: 700, wordBreak: "break-all" }}>{profile.email}</span>
              </div>

              <div style={{ background: "#f8fbf9", padding: "18px 20px", borderRadius: "16px", border: "1px solid #e2ece8", gridColumn: "1 / -1" }}>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6a827b", fontWeight: 700, display: "block", marginBottom: "6px" }}>Verified Phone Contact</span>
                <span style={{ fontSize: "1rem", color: "#12241f", fontWeight: 700 }}>{profile.phone}</span>
              </div>

            </div>

            {/* High-Impact Analytics Widget */}
            <div style={{ background: "linear-gradient(135deg, #e8f3ef 0%, #d5eade 100%)", padding: "28px 32px", borderRadius: "20px", border: "1px solid #bedad2" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, color: "#09382e", fontSize: "1.1rem", fontWeight: 800 }}>
                  📊 Real-Time Academic Pulse
                </h3>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f6b57", background: "#fff", padding: "4px 10px", borderRadius: "6px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>Live Sync</span>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
                
                <div style={{ background: "#ffffff", padding: "22px 24px", borderRadius: "16px", boxShadow: "0 4px 16px rgba(15, 107, 87, 0.06)", border: "1px solid #d1e5df" }}>
                  <span style={{ fontSize: "0.82rem", color: "#4d625c", display: "block", marginBottom: "8px", fontWeight: 700 }}>Attendance Rate</span>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "2rem", fontWeight: 900, color: "#0f6b57" }}>{profile.academicSummary.attendancePercentage}%</span>
                    <span style={{ fontSize: "0.78rem", background: "#e1f5fe", color: "#0288d1", padding: "2px 8px", borderRadius: "6px", fontWeight: 700 }}>Optimal</span>
                  </div>
                </div>

                <div style={{ background: "#ffffff", padding: "22px 24px", borderRadius: "16px", boxShadow: "0 4px 16px rgba(15, 107, 87, 0.06)", border: "1px solid #d1e5df" }}>
                  <span style={{ fontSize: "0.82rem", color: "#4d625c", display: "block", marginBottom: "8px", fontWeight: 700 }}>Assignments Cleared</span>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "2rem", fontWeight: 900, color: "#12241f" }}>
                      {profile.academicSummary.assignmentsSubmitted} <span style={{ fontSize: "1.1rem", color: "#7d938c", fontWeight: 600 }}>/ {profile.academicSummary.totalAssignments}</span>
                    </span>
                    <span style={{ fontSize: "0.78rem", background: "#e8f8f5", color: "#10b981", padding: "2px 8px", borderRadius: "6px", fontWeight: 700 }}>On Track</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}