import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/forgotpass";
import ResetPassword from "./pages/ResetPassword";
import StudentProfile from "./pages/student_prof";
import StudentDashboard from "./pages/StudentDashboard";

// Inline placeholder component for Phase 1 modules to ensure seamless same-tab rendering
function ModulePlaceholder({ title }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f4f7f6", padding: "40px", fontFamily: "inherit", boxSizing: "border-box" }}>
      <div style={{ background: "#ffffff", padding: "32px", borderRadius: "16px", border: "1px solid #d7e0dc", maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={{ color: "#12241f", fontSize: "1.8rem", marginBottom: "12px" }}>{title} Module</h2>
        <p style={{ color: "#4d625c", fontSize: "1rem", marginBottom: "24px" }}>
          This Phase 1 module is successfully rendering in the same tab. You can replace this component with your actual module page file whenever you are ready.
        </p>
        <a 
          href="/dashboard" 
          style={{ background: "#0f6b57", color: "#ffffff", padding: "10px 20px", borderRadius: "10px", textDecoration: "none", fontWeight: 600, display: "inline-block" }}
        >
          ← Back to Student Dashboard
        </a>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      {/* Public Auth & Testing Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Main Dashboard Route */}
      <Route path="/dashboard" element={<StudentDashboard />} />

      {/* Phase 1 Modules & Profile (All open in the same tab) */}
      <Route path="/student_prof" element={<StudentProfile />} />
      <Route path="/timetable" element={<ModulePlaceholder title="Timetable" />} />
      <Route path="/assignments" element={<ModulePlaceholder title="Assignments" />} />
      <Route path="/notes" element={<ModulePlaceholder title="Notes & LMS" />} />
      <Route path="/notices" element={<ModulePlaceholder title="Notices" />} />
      <Route path="/attendance" element={<ModulePlaceholder title="Attendance" />} />
      <Route path="/calendar" element={<ModulePlaceholder title="Calendar" />} />
      <Route path="/notifications" element={<ModulePlaceholder title="Notifications" />} />
      <Route path="/search" element={<ModulePlaceholder title="Campus Search" />} />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;