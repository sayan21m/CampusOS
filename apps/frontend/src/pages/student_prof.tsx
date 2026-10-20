import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  GraduationCap,
  Hash,
  LayoutDashboard,
  Layers,
  Mail,
  Megaphone,
  Percent,
  Phone,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import ProfileLayout from "../components/profile/ProfileLayout";
import type { ProfileNavItem } from "../components/profile/ProfileLayout";
import {
  ProfileError,
  ProfileHero,
  ProfileSection,
  ProfileSkeleton,
} from "../components/profile/ProfileBlocks";
import type { ProfileFact, ProfileField } from "../components/profile/ProfileBlocks";

interface StudentProfileData {
  name: string;
  rollNumber: string;
  department: string;
  departmentCode: string;
  semester: string | number | null;
  section: string;
  admissionYear: string | number | null;
  email: string;
  phone: string;
  profilePhoto?: string | null;
  accountStatus: boolean;
}

const NAV_ITEMS: ProfileNavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { label: "Profile", icon: UserRound, to: "/student-profile", active: true },
];

const UPCOMING_ITEMS: ProfileNavItem[] = [
  { label: "Attendance", icon: Percent },
  { label: "Timetable", icon: CalendarDays },
  { label: "Study materials", icon: BookOpen },
  { label: "Notices", icon: Megaphone },
];

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== "";
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
            name: data.full_name || user.name || "Student",
            rollNumber: data.roll_number || "",
            department: data.department?.dept_name || "",
            departmentCode: data.department?.dept_code || "",
            semester: data.semester ?? null,
            section: data.section || "",
            admissionYear: data.admission_year ?? null,
            email: data.email || "",
            phone: data.phone || "",
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

  const displayName = profile?.name || user?.name || "Student";

  function renderContent(): React.ReactNode {
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
              Back to dashboard
            </button>
          }
        />
      );
    }

    const departmentLabel = profile.departmentCode
      ? `${profile.department} (${profile.departmentCode})`
      : profile.department;

    const facts: ProfileFact[] = [
      { label: "Roll number", value: profile.rollNumber },
      { label: "Department", value: profile.department },
      { label: "Semester", value: profile.semester },
      { label: "Section", value: profile.section },
    ].filter((fact) => hasValue(fact.value));

    const academicFields: ProfileField[] = [
      { label: "Roll number", value: profile.rollNumber, icon: Hash },
      { label: "Department", value: departmentLabel, icon: GraduationCap },
      { label: "Semester", value: profile.semester, icon: Layers },
      { label: "Section", value: profile.section, icon: Users },
      { label: "Admission year", value: profile.admissionYear, icon: CalendarRange },
    ].filter((field) => hasValue(field.value));

    const personalFieldCandidates: Array<ProfileField | null> = [
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
    ];
    const personalFields = personalFieldCandidates.filter(
      (field): field is ProfileField => field !== null
    );

    return (
      <>
        <ProfileHero
          name={profile.name}
          roleLabel="Student"
          photoUrl={profile.profilePhoto || null}
          isActive={profile.accountStatus}
          facts={facts}
          actions={
            <button
              type="button"
              className="pf-btn pf-btn-secondary"
              onClick={() => navigate("/dashboard")}
            >
              <LayoutDashboard size={16} strokeWidth={2} aria-hidden="true" />
              Dashboard
            </button>
          }
        />

        <div className="pf-grid">
          <ProfileSection
            id="pf-academic"
            title="Academic information"
            description="Your enrollment details on record with the institution."
            icon={GraduationCap}
            fields={academicFields}
          />
          <ProfileSection
            id="pf-personal"
            title="Personal information"
            description="Contact details linked to your CampusOS account."
            icon={UserRound}
            fields={personalFields}
          />
        </div>
      </>
    );
  }

  return (
    <ProfileLayout
      portalLabel="Student Portal"
      name={displayName}
      subtitle={profile?.rollNumber ? `Roll ${profile.rollNumber}` : "Student"}
      photoUrl={profile?.profilePhoto || null}
      navItems={NAV_ITEMS}
      upcomingItems={UPCOMING_ITEMS}
      onLogout={logout}
    >
      {renderContent()}
    </ProfileLayout>
  );
}
