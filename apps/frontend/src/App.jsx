import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/forgotpass";
import ResetPassword from "./pages/ResetPassword";
import FacultyProfile from "./pages/faculty_profile";
import StudentProfile from "./pages/student_prof";
import StudentDashboard from "./pages/StudentDashboard";
import FacultyDashboard from "./pages/faculty_dashboard";
import AdminProfile from "./pages/admin-profile";
import StudentAssignments from "./pages/StudentAssignments";
import NoticesPage from "./pages/NoticesPage";
import TimetablePage from "./pages/TimetablePage";

function ModulePlaceholder({ title }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f4f7f6", padding: "40px", fontFamily: "inherit", boxSizing: "border-box" }}>
      <div style={{ background: "#ffffff", padding: "32px", borderRadius: "16px", border: "1px solid #d7e0dc", maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={{ color: "#12241f", fontSize: "1.8rem", marginBottom: "12px" }}>{title} Module</h2>
        <p style={{ color: "#4d625c", fontSize: "1rem", marginBottom: "24px" }}>
          This module does not have a dedicated frontend wired to the API yet. Backend support may already exist for related data.
        </p>
        <a
          href="/dashboard"
          style={{ background: "#0f6b57", color: "#ffffff", padding: "10px 20px", borderRadius: "10px", textDecoration: "none", fontWeight: 600, display: "inline-block" }}
        >
          ← Back to Dashboard
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

function RoleDashboard() {
  const { user } = useAuth();

  if (user?.role === "STUDENT") {
    return <StudentDashboard />;
  }

  if (user?.role === "FACULTY") {
    return <FacultyDashboard />;
  }

  if (user?.role === "ADMIN") {
    return <AdminProfile />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <RoleDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student-profile"
        element={
          <ProtectedRoute>
            <StudentProfile />
          </ProtectedRoute>
        }
      />
      <Route path="/student_prof" element={<Navigate to="/student-profile" replace />} />
      <Route
        path="/faculty-profile"
        element={
          <ProtectedRoute>
            <FacultyProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty-dashboard"
        element={
          <ProtectedRoute>
            <FacultyDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-profile"
        element={
          <ProtectedRoute>
            <AdminProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assignments"
        element={
          <ProtectedRoute>
            <StudentAssignments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/timetable"
        element={
          <ProtectedRoute>
            <TimetablePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notices"
        element={
          <ProtectedRoute>
            <NoticesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notes"
        element={
          <ProtectedRoute>
            <ModulePlaceholder title="Notes & LMS" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <ModulePlaceholder title="Attendance" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <ModulePlaceholder title="Calendar" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <ModulePlaceholder title="Notifications" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <ModulePlaceholder title="Campus Search" />
          </ProtectedRoute>
        }
      />
      <Route path="/faculty_profile" element={<Navigate to="/faculty-profile" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
