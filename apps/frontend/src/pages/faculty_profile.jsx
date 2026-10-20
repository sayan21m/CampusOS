import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  ClipboardList,
  IdCard,
  KeyRound,
  LayoutDashboard,
  Mail,
  Megaphone,
  PencilLine,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import ProfileLayout from "../components/profile/ProfileLayout";
import {
  ProfileError,
  ProfileHero,
  ProfileSection,
  ProfileSkeleton,
} from "../components/profile/ProfileBlocks";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { label: "Profile", icon: UserRound, to: "/faculty-profile", active: true },
];

const UPCOMING_ITEMS = [
  { label: "Assignments", icon: ClipboardList },
  { label: "Attendance", icon: CalendarCheck },
  { label: "Notices", icon: Megaphone },
];

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function formatRole(role) {
  if (!role) {
    return "Faculty";
  }

  return role.charAt(0) + role.slice(1).toLowerCase();
}

const FacultyProfile = () => {
  const { user, logout } = useAuth();
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
            name: data.full_name || user.name || "Faculty",
            employeeId: data.employeeId || "",
            designation: data.designation || "",
            email: data.email || "",
            phone: data.phone || "",
            department: data.department?.dept_name || "",
            departmentCode: data.department?.dept_code || "",
            role: data.role || user.role || "FACULTY",
            profilePhoto: data.photo_url || null,
            accountStatus: Boolean(data.accountStatus),
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

  const displayName = profile?.name || user?.name || "Faculty";

  function renderContent() {
    if (loading) {
      return <ProfileSkeleton />;
    }

    if (error || !profile) {
      return (
        <ProfileError
          message={error || "Profile unavailable."}
          action={
            <button
              type="button"
              className="pf-btn pf-btn-primary"
              onClick={() => navigate("/dashboard")}
            >
              <LayoutDashboard size={16} strokeWidth={2} aria-hidden="true" />
              Back to Dashboard
            </button>
          }
        />
      );
    }

    const departmentLabel = profile.departmentCode
      ? `${profile.department} (${profile.departmentCode})`
      : profile.department;

    const facts = [
      { label: "Employee ID", value: profile.employeeId },
      { label: "Department", value: profile.department },
      { label: "Designation", value: profile.designation },
    ].filter((fact) => hasValue(fact.value));

    const professionalFields = [
      { label: "Employee ID", value: profile.employeeId, icon: IdCard },
      { label: "Department", value: departmentLabel, icon: Building2 },
      { label: "Designation", value: profile.designation, icon: BriefcaseBusiness },
      { label: "Role", value: formatRole(profile.role), icon: ShieldCheck },
    ].filter((field) => hasValue(field.value));

    const contactFields = [
      { label: "Full name", value: profile.name, icon: UserRound },
      hasValue(profile.email)
        ? {
            label: "Email",
            value: <a href={`mailto:${profile.email}`}>{profile.email}</a>,
            icon: Mail,
            wrap: true,
          }
        : null,
      hasValue(profile.phone)
        ? {
            label: "Phone",
            value: <a href={`tel:${profile.phone}`}>{profile.phone}</a>,
            icon: Phone,
          }
        : null,
    ].filter(Boolean);

    return (
      <>
        <ProfileHero
          name={profile.name}
          roleLabel={formatRole(profile.role)}
          photoUrl={profile.profilePhoto}
          isActive={profile.accountStatus}
          facts={facts}
          actions={
            <>
              <button
                type="button"
                className="pf-btn pf-btn-secondary"
                onClick={() => navigate("/reset-password")}
              >
                <KeyRound size={16} strokeWidth={2} aria-hidden="true" />
                Change Password
              </button>
              <button
                type="button"
                className="pf-btn pf-btn-secondary"
                disabled
                title="Profile editing is coming soon"
              >
                <PencilLine size={16} strokeWidth={2} aria-hidden="true" />
                Edit Profile
              </button>
            </>
          }
        />

        <div className="pf-grid">
          <ProfileSection
            id="pf-professional"
            title="Professional information"
            description="Your appointment details on record with the institution."
            icon={BriefcaseBusiness}
            fields={professionalFields}
          />
          <ProfileSection
            id="pf-contact"
            title="Contact information"
            description="How students and staff can reach you."
            icon={Mail}
            fields={contactFields}
          />
        </div>
      </>
    );
  }

  return (
    <ProfileLayout
      portalLabel="Faculty Portal"
      name={displayName}
      subtitle={profile?.designation || "Faculty"}
      photoUrl={profile?.profilePhoto || null}
      navItems={NAV_ITEMS}
      upcomingItems={UPCOMING_ITEMS}
      onLogout={logout}
    >
      {renderContent()}
    </ProfileLayout>
  );
};

export default FacultyProfile;
