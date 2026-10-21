import React, { useEffect, useState } from "react";
import {
  fetchActivityLog,
  fetchEmailPreferences,
  updateEmailPreferences,
  uploadProfilePhoto,
} from "../../services/campus";

const CATEGORY_LABELS: Record<string, string> = {
  ASSIGNMENTS: "Assignments",
  DEADLINES: "Deadline reminders",
  NOTICES: "Notices",
  NOTES: "Study materials",
  ATTENDANCE: "Attendance warnings",
};

type Preference = { category: string; email_enabled: boolean };
type ActivityItem = { activity_id: number; action: string; detail?: string | null; created_at: string };

function apiMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
  );
}

function actionLabel(action: string) {
  switch (action) {
    case "LOGIN":
      return "Signed in";
    case "PHOTO_UPLOAD":
      return "Updated profile photo";
    case "NOTES_DOWNLOAD":
      return "Downloaded study material";
    case "NOTICE_ATTACHMENT_DOWNLOAD":
      return "Downloaded notice attachment";
    case "PREFERENCE_UPDATE":
      return "Updated email preferences";
    default:
      return action.replace(/_/g, " ");
  }
}

interface ProfileSettingsProps {
  onPhotoUpdated?: () => void;
}

export default function ProfileSettings({ onPhotoUpdated }: ProfileSettingsProps): React.JSX.Element {
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    const [prefs, rows] = await Promise.all([
      fetchEmailPreferences(),
      fetchActivityLog().catch(() => []),
    ]);
    setPreferences(prefs);
    setActivity(rows);
  }

  useEffect(() => {
    refresh().catch((err) => {
      setError(apiMessage(err, "Unable to load profile settings."));
    });
  }, []);

  async function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      setUploading(true);
      setError("");
      setNotice("");
      await uploadProfilePhoto(file);
      setNotice("Profile photo updated.");
      onPhotoUpdated?.();
      await refresh().catch(() => undefined);
    } catch (err) {
      setError(apiMessage(err, "Could not upload photo."));
    } finally {
      setUploading(false);
    }
  }

  async function togglePreference(category: string, email_enabled: boolean) {
    const next = preferences.map((item) =>
      item.category === category ? { ...item, email_enabled } : item
    );
    setPreferences(next);

    try {
      setSaving(true);
      setError("");
      setNotice("");
      const saved = await updateEmailPreferences([{ category, email_enabled }]);
      setPreferences(saved);
      setNotice("Email preferences saved.");
      const rows = await fetchActivityLog().catch(() => activity);
      setActivity(rows);
    } catch (err) {
      setError(apiMessage(err, "Could not update email preferences."));
      await refresh().catch(() => undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      {error && (
        <div style={{ padding: "12px 16px", background: "#fff1f0", color: "#9f2d22", borderRadius: "12px", fontWeight: 600 }}>
          {error}
        </div>
      )}
      {notice && (
        <div style={{ padding: "12px 16px", background: "#edf7ed", color: "#1f6b3a", borderRadius: "12px", fontWeight: 600 }}>
          {notice}
        </div>
      )}

      <section style={card}>
        <h2 style={heading}>Profile photo</h2>
        <p style={copy}>Upload a JPG, PNG, or WEBP image up to 5 MB.</p>
        <label style={uploadBtn}>
          {uploading ? "Uploading..." : "Choose photo"}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} hidden disabled={uploading} />
        </label>
      </section>

      <section style={card}>
        <h2 style={heading}>Email notifications</h2>
        <p style={copy}>Choose which CampusOS emails you want to receive.</p>
        <div style={{ display: "grid", gap: "10px" }}>
          {preferences.map((item) => (
            <label
              key={item.category}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                alignItems: "center",
                borderTop: "1px solid #e2ece8",
                paddingTop: "10px",
              }}
            >
              <span style={{ color: "#12241f", fontWeight: 600 }}>
                {CATEGORY_LABELS[item.category] || item.category}
              </span>
              <input
                type="checkbox"
                checked={item.email_enabled}
                disabled={saving}
                onChange={(event) => togglePreference(item.category, event.target.checked)}
              />
            </label>
          ))}
        </div>
      </section>

      <section style={card}>
        <h2 style={heading}>Activity log</h2>
        <p style={copy}>Recent sign-ins, downloads, and preference changes.</p>
        {activity.length === 0 ? (
          <p style={{ margin: 0, color: "#6a827b" }}>No activity recorded yet.</p>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {activity.map((item) => (
              <div
                key={item.activity_id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                  borderTop: "1px solid #e2ece8",
                  paddingTop: "10px",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "#12241f" }}>{actionLabel(item.action)}</div>
                  {item.detail ? <div style={{ color: "#6a827b", fontSize: "0.85rem" }}>{item.detail}</div> : null}
                </div>
                <div style={{ color: "#4d625c", fontSize: "0.82rem" }}>
                  {new Date(item.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #d7e0dc",
  borderRadius: "16px",
  padding: "16px 18px",
};

const heading: React.CSSProperties = {
  margin: "0 0 6px",
  fontSize: "1.05rem",
  color: "#12241f",
};

const copy: React.CSSProperties = {
  margin: "0 0 14px",
  color: "#4d625c",
  fontSize: "0.88rem",
};

const uploadBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  background: "#0f6b57",
  color: "#fff",
  borderRadius: "10px",
  padding: "8px 14px",
  fontWeight: 700,
  cursor: "pointer",
};
