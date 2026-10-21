import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchCampusSearch, fetchRecentSearches } from "../services/campus";

type SearchHit = {
  id: string | number;
  type: string;
  title: string;
  detail: string;
  href?: string;
  to?: string;
};

const TYPE_LABELS: Record<string, string> = {
  NOTICE: "Notice",
  NOTES: "Notes",
  ASSIGNMENT: "Assignment",
  USER: "User",
  SUBJECT: "Subject",
  EVENT: "Event",
};

export default function SearchPage() {
  const { user } = useAuth() as { user: { role?: string } | null };
  const canSearchUsers = user?.role === "ADMIN" || user?.role === "FACULTY";

  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [recent, setRecent] = useState<{ query: string }[]>([]);

  const typeFilters = useMemo(() => {
    const filters = [
      { id: "", label: "All" },
      { id: "NOTICE", label: "Notices" },
      { id: "NOTES", label: "Notes" },
      { id: "ASSIGNMENT", label: "Assignments" },
      { id: "SUBJECT", label: "Subjects" },
      { id: "EVENT", label: "Events" },
    ];

    if (canSearchUsers) {
      filters.splice(4, 0, { id: "USER", label: "Users" });
    }

    return filters;
  }, [canSearchUsers]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecent() {
      try {
        const rows = await fetchRecentSearches();
        if (!cancelled) {
          setRecent(rows);
        }
      } catch {
        if (!cancelled) {
          setRecent([]);
        }
      }
    }

    loadRecent();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setHits([]);
      setError("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        const payload = await fetchCampusSearch({
          q,
          ...(type ? { type } : {}),
        });
        const nextHits = payload.groups.flatMap((group: { items?: SearchHit[] }) =>
          Array.isArray(group.items) ? group.items : []
        );
        if (!cancelled) {
          setHits(nextHits);
        }
      } catch {
        if (!cancelled) {
          setHits([]);
          setError("Unable to search campus resources from the CampusOS API.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, type]);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7f6", padding: "40px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, color: "#12241f" }}>Campus Search</h1>
            <p style={{ margin: "6px 0 0", color: "#4d625c" }}>
              Search notices, assignments, notes, subjects, events{canSearchUsers ? ", and users" : ""} within your role.
            </p>
          </div>
          <Link to="/dashboard" style={{ color: "#0f6b57", fontWeight: 700, textDecoration: "none", alignSelf: "center" }}>
            ← Back to Dashboard
          </Link>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search campus resources..."
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "14px 16px",
            borderRadius: "14px",
            border: "1px solid #c5d4ce",
            marginBottom: "16px",
            fontSize: "1rem",
          }}
        />

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          {typeFilters.map((filter) => (
            <button
              key={filter.id || "all"}
              type="button"
              onClick={() => setType(filter.id)}
              style={{
                border: "1px solid #c5d4ce",
                background: type === filter.id ? "#0f6b57" : "#fff",
                color: type === filter.id ? "#fff" : "#4d625c",
                borderRadius: "999px",
                padding: "6px 12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {!query.trim() && recent.length > 0 && (
          <div style={{ ...card, marginBottom: "16px" }}>
            <div style={{ fontWeight: 700, color: "#12241f", marginBottom: "8px" }}>Recent searches</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {recent.map((item) => (
                <button
                  key={item.query}
                  type="button"
                  onClick={() => setQuery(item.query)}
                  style={{
                    border: "1px solid #c5d4ce",
                    background: "#e8f3ef",
                    color: "#0f6b57",
                    borderRadius: "999px",
                    padding: "6px 12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {item.query}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginBottom: "16px", padding: "12px 16px", background: "#fff1f0", color: "#9f2d22", borderRadius: "12px", fontWeight: 600 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={card}>Searching campus resources...</div>
        ) : !query.trim() ? (
          <div style={card}>Type a query to search notices, notes, assignments, and more.</div>
        ) : hits.length === 0 ? (
          <div style={card}>No matches for “{query}”.</div>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {hits.map((hit) => (
              <Link
                key={`${hit.type}-${hit.id}`}
                to={hit.href || hit.to || "/dashboard"}
                style={{ ...card, textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "#e8f3ef", color: "#0f6b57", padding: "2px 8px", borderRadius: "4px" }}>
                    {TYPE_LABELS[hit.type] || hit.type}
                  </span>
                </div>
                <h2 style={{ margin: "0 0 4px", fontSize: "1.02rem", color: "#12241f" }}>{hit.title}</h2>
                <p style={{ margin: 0, color: "#6a827b", fontSize: "0.88rem" }}>{hit.detail}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const card = {
  background: "#fff",
  border: "1px solid #d7e0dc",
  borderRadius: "16px",
  padding: "16px 18px",
  color: "#6a827b",
};
