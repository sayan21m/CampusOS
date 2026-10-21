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
import FacultyAssignments from "./pages/FacultyAssignments";
import NoticesPage from "./pages/NoticesPage";
import TimetablePage from "./pages/TimetablePage";
import NotesPage from "./pages/NotesPage";
import AttendancePage from "./pages/AttendancePage";
import CalendarPage from "./pages/CalendarPage";
import NotificationsPage from "./pages/NotificationsPage";
import SearchPage from "./pages/SearchPage";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AssignmentsPage() {
  const { user } = useAuth();

  if (user?.role === "FACULTY") {
    return <FacultyAssignments />;
  }

  return <StudentAssignments />;
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
            <AssignmentsPage />
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
            <NotesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <AttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        }
      />
      <Route path="/faculty_profile" element={<Navigate to="/faculty-profile" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
