import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <main className="dashboard-page">
      <section className="dashboard-card">
        <p className="dashboard-brand">CampusOS</p>
        <h1>Welcome, {user?.name}</h1>
        <p className="dashboard-role">
          Signed in as <strong>{user?.role}</strong>
        </p>
        <button type="button" onClick={logout}>
          Log out
        </button>
      </section>
    </main>
  );
}

export default Dashboard;
