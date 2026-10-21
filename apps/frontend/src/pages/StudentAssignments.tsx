import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMyAssignments, submitAssignmentFile } from "../services/campus";
import "../pages/Login.css";

interface Assignment {
  id: string;
  title: string;
  subject: string;
  code: string;
  dueDate: string;
  status: "Pending" | "Submitted" | "Late" | "Graded" | string;
  grade?: string;
  feedback?: string;
  submittedFile?: string;
}

export default function StudentAssignments(): React.JSX.Element {
  const [filter, setFilter] = useState<string>("All");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ [key: string]: File | null }>({});

  async function loadAssignments() {
    try {
      setLoading(true);
      setError("");
      const rows = await fetchMyAssignments();
      setAssignments(rows);
    } catch (err) {
      setAssignments([]);
      setError("Unable to load assignments from the CampusOS API.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssignments();
  }, []);

  function handleFileChange(assignmentId: string, e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile({ ...selectedFile, [assignmentId]: e.target.files[0] });
    }
  }

  async function handleUploadOrReplace(assignmentId: string) {
    const file = selectedFile[assignmentId];
    if (!file) {
      setError("Please select a file to upload first.");
      return;
    }

    try {
      setUploadingId(assignmentId);
      setError("");
      await submitAssignmentFile(assignmentId, file);
      setSelectedFile((prev) => ({ ...prev, [assignmentId]: null }));
      await loadAssignments();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setUploadingId(null);
    }
  }

  const filteredAssignments = assignments.filter((item) => {
    if (filter === "All") return true;
    return item.status === filter;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7f6", padding: "0", fontFamily: "inherit", boxSizing: "border-box", width: "100%" }}>
      <main style={{ width: "100%", margin: "0", boxSizing: "border-box" }}>
        <div style={{ background: "linear-gradient(135deg, #09382e 0%, #0f6b57 100%)", padding: "40px", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255, 255, 255, 0.18)", padding: "5px 12px", borderRadius: "30px", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "8px", backdropFilter: "blur(6px)" }}>
              <span>📝</span> ASSIGNMENT MODULE
            </div>
            <h1 style={{ margin: 0, fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
              Student Submissions Portal
            </h1>
            <p style={{ margin: "4px 0 0", color: "#b6ded3", fontSize: "0.95rem" }}>
              Track deadlines, upload solutions, and view faculty evaluation scores.
            </p>
          </div>

          <div>
            <Link
              to="/dashboard"
              style={{ background: "rgba(255, 255, 255, 0.15)", border: "1px solid rgba(255, 255, 255, 0.3)", color: "#ffffff", padding: "10px 18px", borderRadius: "12px", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none", backdropFilter: "blur(4px)" }}
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto", boxSizing: "border-box" }}>
          {error && (
            <div style={{ marginBottom: "20px", padding: "14px 18px", background: "#fff1f0", color: "#9f2d22", borderRadius: "12px", fontSize: "0.9rem", fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginBottom: "30px", flexWrap: "wrap" }}>
            {["All", "Pending", "Submitted", "Late", "Graded"].map((statusTab) => (
              <button
                key={statusTab}
                onClick={() => setFilter(statusTab)}
                style={{
                  background: filter === statusTab ? "#0f6b57" : "#ffffff",
                  color: filter === statusTab ? "#ffffff" : "#12241f",
                  border: "1px solid #d7e0dc",
                  padding: "10px 18px",
                  borderRadius: "12px",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: filter === statusTab ? "0 4px 12px rgba(15, 107, 87, 0.2)" : "none",
                }}
              >
                {statusTab}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gap: "20px" }}>
            {loading ? (
              <div style={{ padding: "40px", textAlign: "center", background: "#ffffff", borderRadius: "16px", border: "1px solid #d7e0dc", color: "#6a827b" }}>
                Loading assignments from CampusOS API...
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", background: "#ffffff", borderRadius: "16px", border: "1px solid #d7e0dc", color: "#6a827b" }}>
                No assignments found matching the selected filter.
              </div>
            ) : (
              filteredAssignments.map((asg) => {
                const isOverdue = new Date(asg.dueDate) < new Date() && asg.status === "Pending";
                return (
                  <div key={asg.id} style={{ background: "#ffffff", padding: "24px", borderRadius: "16px", border: "1px solid #d7e0dc", display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                      <div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "#e8f3ef", color: "#0f6b57", padding: "3px 10px", borderRadius: "6px" }}>
                            {asg.code} • {asg.subject}
                          </span>
                          <span style={{ fontSize: "0.8rem", color: "#6a827b" }}>
                            Due: {new Date(asg.dueDate).toLocaleString()}
                          </span>
                        </div>
                        <h3 style={{ margin: 0, color: "#12241f", fontSize: "1.2rem", fontWeight: 700 }}>
                          {asg.title}
                        </h3>
                      </div>

                      <div>
                        <span
                          style={{
                            fontSize: "0.8rem",
                            padding: "6px 14px",
                            borderRadius: "8px",
                            fontWeight: 700,
                            background:
                              asg.status === "Graded"
                                ? "#edf7ed"
                                : asg.status === "Submitted"
                                  ? "#e1f5fe"
                                  : asg.status === "Late"
                                    ? "#fff9c4"
                                    : isOverdue
                                      ? "#fde8e8"
                                      : "#f1f3f4",
                            color:
                              asg.status === "Graded"
                                ? "#2e7d32"
                                : asg.status === "Submitted"
                                  ? "#0288d1"
                                  : asg.status === "Late"
                                    ? "#f57c00"
                                    : isOverdue
                                      ? "#9f2d22"
                                      : "#5f6368",
                          }}
                        >
                          {isOverdue && asg.status === "Pending" ? "Overdue" : asg.status}
                        </span>
                      </div>
                    </div>

                    {asg.status === "Graded" && (
                      <div style={{ background: "#edf7ed", padding: "12px 16px", borderRadius: "10px", border: "1px solid #c8e6c9", fontSize: "0.9rem", color: "#2e7d32" }}>
                        <strong>Score: {asg.grade}</strong>
                        {asg.feedback ? ` — ${asg.feedback}` : ""}
                      </div>
                    )}

                    <div style={{ background: "#f8fbf9", padding: "16px", borderRadius: "12px", border: "1px solid #e2ece8", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
                      <div>
                        <p style={{ margin: "0 0 4px", fontSize: "0.85rem", color: "#4d625c", fontWeight: 600 }}>
                          {asg.submittedFile ? `Current Submission: ${asg.submittedFile}` : "No file submitted yet."}
                        </p>
                        <span style={{ fontSize: "0.78rem", color: "#6a827b" }}>Supported formats: .pdf, .zip, .docx (Max size: 25MB)</span>
                      </div>

                      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                        <input
                          type="file"
                          onChange={(e) => handleFileChange(asg.id, e)}
                          style={{ fontSize: "0.85rem", maxWidth: "220px" }}
                        />
                        <button
                          onClick={() => handleUploadOrReplace(asg.id)}
                          disabled={uploadingId === asg.id}
                          style={{
                            background: "#0f6b57",
                            color: "#ffffff",
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: "8px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            cursor: uploadingId === asg.id ? "wait" : "pointer",
                            opacity: uploadingId === asg.id ? 0.7 : 1,
                          }}
                        >
                          {uploadingId === asg.id
                            ? "Uploading..."
                            : asg.submittedFile
                              ? "Replace File"
                              : "Submit File"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
