import { useState, useEffect, useContext, useCallback } from "react";
import HotkeyTooltip from "./HotkeyTooltip";
import { AuthContext } from "../context/AuthContext";
import refreshFn from "../utils/refreshFn";
import type { AiRecommendedPlace, AiListPlace } from "../types/ai";
import styles from "../styles/SuggestionsSidebar.module.css";

const apiURL = import.meta.env.VITE_API_URL;

const GREEN = "#2fe782";
const INDIGO = "#6366f1";

type SuggestionsSidebarProps = {
  tripId: string;
  refreshKey: number;
  onAddToSchedule: (place: AiRecommendedPlace) => Promise<void>;
  onAddToList: (placeName: string, details: string | null) => Promise<void>;
};

type UnifiedPlace = {
  id: string;
  place_name: string;
  place_category: string | null;
  details: string | null;
  start_time?: string | null;
  end_time?: string | null;
  cost?: number;
  added_to_schedule: boolean;
  recommended_at: string;
  source: "schedule" | "list";
};

const formatDateBucket = (dateStr: string): string => {
  const d = new Date(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${mm}/${dd} - ${dayNames[d.getDay()]}`;
};

const toSingular = (s: string) => s.toLowerCase().trim().replace(/s$/, "");

const CATEGORY_HEADERS: Record<string, string> = {
  museum: "Museums",
  nature: "Nature",
  shopping: "Shopping",
  "current event": "Current Events",
  history: "History",
  nightlife: "Nightlife",
  food: "Food",
  accommodation: "Accommodations",
  art: "Art",
  attraction: "Attractions",
};

const SuggestionsSidebar = ({
  tripId,
  refreshKey,
  onAddToSchedule,
  onAddToList,
}: SuggestionsSidebarProps) => {
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const login = auth?.login;
  const logout = auth?.logout;
  const refreshInFlightRef = auth?.refreshInFlightRef;
  const loggingOutRef = auth?.loggingOutRef;
  const [open, setOpen] = useState(false);
  const [schedulePlaces, setSchedulePlaces] = useState<AiRecommendedPlace[]>([]);
  const [listPlaces, setListPlaces] = useState<AiListPlace[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [choiceId, setChoiceId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = {
        ...(options.headers as Record<string, string>),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      let res = await fetch(url, { ...options, headers });
      if (res.status === 401) {
        const body = await res.json().catch(() => ({}));
        if (body.error === "JwtError") {
          await logout?.();
          throw new Error("Invalid token");
        }
        if (loggingOutRef?.current) throw new Error("Logging out");
        const result = await refreshFn(apiURL, refreshInFlightRef!);
        if (result.err || !result.token) {
          await logout?.();
          throw new Error("Refresh failed");
        }
        login?.(result.token);
        headers.Authorization = `Bearer ${result.token}`;
        res = await fetch(url, { ...options, headers });
      }
      return res;
    },
    [token, login, logout, refreshInFlightRef, loggingOutRef],
  );

  const fetchPlaces = useCallback(async () => {
    if (!token) return;
    try {
      const [schedRes, listRes] = await Promise.all([
        authFetch(`${apiURL}/ai/recommended-places/${tripId}`),
        authFetch(`${apiURL}/ai/list-places/${tripId}`),
      ]);
      if (schedRes.ok) {
        const data = await schedRes.json();
        setSchedulePlaces(data.places ?? []);
      }
      if (listRes.ok) {
        const data = await listRes.json();
        setListPlaces(data.places ?? []);
      }
    } catch {
      // silent
    }
  }, [token, tripId, authFetch]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces, refreshKey]);

  const totalCount = schedulePlaces.length + listPlaces.length;

  // Reset open state when suggestions are cleared so the sidebar
  // doesn't auto-open when new suggestions arrive later.
  useEffect(() => {
    if (totalCount === 0) {
      setOpen(false);
    }
  }, [totalCount]);

  useEffect(() => {
    const handleHotkey = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && !e.altKey && !e.ctrlKey && e.key.toLowerCase() === "s") {
        if (totalCount === 0) return;
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleHotkey);
    return () => document.removeEventListener("keydown", handleHotkey);
  }, [totalCount]);

  // Group schedule places by date bucket, list places separate
  const scheduleBuckets: Record<string, UnifiedPlace[]> = {};
  const listItems: UnifiedPlace[] = [];

  for (const p of schedulePlaces) {
    const unified: UnifiedPlace = { ...p, source: "schedule" as const };
    if (p.start_time) {
      const bucket = formatDateBucket(p.start_time);
      if (!scheduleBuckets[bucket]) scheduleBuckets[bucket] = [];
      scheduleBuckets[bucket].push(unified);
    } else {
      // No date — put in "Unscheduled" bucket
      if (!scheduleBuckets["Unscheduled"]) scheduleBuckets["Unscheduled"] = [];
      scheduleBuckets["Unscheduled"].push(unified);
    }
  }

  // Sort items within each bucket by start_time
  for (const key of Object.keys(scheduleBuckets)) {
    scheduleBuckets[key].sort((a, b) => {
      if (!a.start_time || !b.start_time) return 0;
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });
  }

  for (const p of listPlaces) {
    listItems.push({ ...p, source: "list" as const });
  }

  // Sort bucket keys chronologically
  const sortedBucketKeys = Object.keys(scheduleBuckets).sort((a, b) => {
    if (a === "Unscheduled") return 1;
    if (b === "Unscheduled") return -1;
    return a.localeCompare(b);
  });

  const handleAddAsSchedule = async (place: UnifiedPlace) => {
    setAddingId(place.id);
    setChoiceId(null);
    try {
      const schedPlace = schedulePlaces.find((p) => p.id === place.id);
      if (schedPlace) {
        await onAddToSchedule(schedPlace);
        setSchedulePlaces((prev) =>
          prev.map((p) =>
            p.id === place.id ? { ...p, added_to_schedule: true } : p,
          ),
        );
        await authFetch(`${apiURL}/ai/recommended-places/${place.id}/added`, {
          method: "PATCH",
        });
      }
    } finally {
      setAddingId(null);
    }
  };

  const handleAddAsList = async (place: UnifiedPlace) => {
    if (!token || !tripId) return;
    setAddingId(place.id);
    setChoiceId(null);
    try {
      await onAddToList(place.place_name, place.details ?? null);

      if (place.source === "list") {
        setListPlaces((prev) =>
          prev.map((p) =>
            p.id === place.id ? { ...p, added_to_schedule: true } : p,
          ),
        );
        await authFetch(`${apiURL}/ai/list-places/${place.id}/added`, {
          method: "PATCH",
        });
      } else {
        setSchedulePlaces((prev) =>
          prev.map((p) =>
            p.id === place.id ? { ...p, added_to_schedule: true } : p,
          ),
        );
        await authFetch(`${apiURL}/ai/recommended-places/${place.id}/added`, {
          method: "PATCH",
        });
      }
    } finally {
      setAddingId(null);
    }
  };

  const handleUnmark = async (place: UnifiedPlace) => {
    if (!token) return;
    const endpoint =
      place.source === "schedule"
        ? `${apiURL}/ai/recommended-places/${place.id}/added`
        : `${apiURL}/ai/list-places/${place.id}/added`;
    try {
      await authFetch(endpoint, {
        method: "PATCH",
        body: JSON.stringify({ added: false }),
      });
      if (place.source === "schedule") {
        setSchedulePlaces((prev) =>
          prev.map((p) =>
            p.id === place.id ? { ...p, added_to_schedule: false } : p,
          ),
        );
      } else {
        setListPlaces((prev) =>
          prev.map((p) =>
            p.id === place.id ? { ...p, added_to_schedule: false } : p,
          ),
        );
      }
    } catch {
      // silent
    }
  };

  const handleAddClick = (place: UnifiedPlace) => {
    if (place.added_to_schedule) {
      handleUnmark(place);
      return;
    }
    if (place.source === "list") {
      handleAddAsList(place);
    } else {
      setChoiceId(choiceId === place.id ? null : place.id);
    }
  };

  const handleClear = async () => {
    if (!token || !tripId) return;
    setClearing(true);
    try {
      await Promise.all([
        authFetch(`${apiURL}/ai/recommended-places/${tripId}`, {
          method: "DELETE",
        }),
        authFetch(`${apiURL}/ai/list-places/${tripId}`, {
          method: "DELETE",
        }),
      ]);
      setSchedulePlaces([]);
      setListPlaces([]);
    } finally {
      setClearing(false);
    }
  };

  if (totalCount === 0) return null;

  const accentColor = (source: "schedule" | "list") =>
    source === "schedule" ? GREEN : INDIGO;

  const renderPlace = (place: UnifiedPlace) => (
    <div
      key={`${place.source}-${place.id}`}
      className={`${styles.sidebarItem} ${place.added_to_schedule ? styles.sidebarItemAdded : ""}`}
      style={{
        borderLeft: `3px solid ${accentColor(place.source)}`,
      }}
    >
      <div className={styles.sidebarItemInfo}>
        <span className={styles.sidebarItemName}>
          {place.place_name}
        </span>
        {place.source === "schedule" &&
          place.start_time &&
          place.end_time && (
            <span style={{ fontSize: "0.7rem", color: GREEN }}>
              {new Date(place.start_time).toLocaleTimeString(
                "en-US",
                { hour: "numeric", minute: "2-digit" },
              )}
              {" – "}
              {new Date(place.end_time).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
        {place.place_category && (
          <span
            style={{
              fontSize: "0.7rem",
              color: accentColor(place.source),
              textTransform: "capitalize",
            }}
          >
            {toSingular(place.place_category)}
          </span>
        )}
        {place.details && (
          <span
            style={{
              fontSize: "0.7rem",
              color: "#999",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {place.details}
          </span>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.2rem",
          position: "relative",
        }}
      >
        <button
          type="button"
          className={styles.sidebarAddButton}
          onClick={() => handleAddClick(place)}
          disabled={addingId === place.id}
          title={
            place.added_to_schedule
              ? "Click to unmark"
              : place.source === "list"
                ? "Add to list"
                : "Add"
          }
        >
          {place.added_to_schedule
            ? "✓"
            : addingId === place.id
              ? "..."
              : "+"}
        </button>
        {choiceId === place.id && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: "0.2rem",
              background: "#2a2a2c",
              border: "1px solid #555",
              borderRadius: "6px",
              zIndex: 10,
              overflow: "hidden",
              minWidth: "110px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            }}
          >
            <button
              type="button"
              onClick={() => handleAddAsSchedule(place)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                width: "100%",
                padding: "0.4rem 0.6rem",
                background: "transparent",
                border: "none",
                color: GREEN,
                fontSize: "0.75rem",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#333")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: GREEN,
                }}
              />
              Schedule
            </button>
            <button
              type="button"
              onClick={() => handleAddAsList(place)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                width: "100%",
                padding: "0.4rem 0.6rem",
                background: "transparent",
                border: "none",
                color: INDIGO,
                fontSize: "0.75rem",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#333")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: INDIGO,
                }}
              />
              List
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <HotkeyTooltip label="Toggle Sidebar" shortcut="⌘⇧S" position="top">
        <button
          type="button"
          className={`${styles.sidebarTab} ${open ? styles.sidebarTabOpen : ""}`}
          onClick={() => setOpen((prev) => !prev)}
          aria-label={
            open
              ? "Close recommendations sidebar"
              : "Open recommendations sidebar"
          }
        >
        {!open ? (
          <svg
            fill="#2fe782"
            width="1.2rem"
            height="1.2rem"
            viewBox="0 0 15 15"
            xmlns="http://www.w3.org/2000/svg"
            transform="matrix(-1,0,0,1,0,0)"
          >
            <path d="M8.29289 2.29289C8.68342 1.90237 9.31658 1.90237 9.70711 2.29289L14.2071 6.79289C14.5976 7.18342 14.5976 7.81658 14.2071 8.20711L9.70711 12.7071C9.31658 13.0976 8.68342 13.0976 8.29289 12.7071C7.90237 12.3166 7.90237 11.6834 8.29289 11.2929L11 8.5H1.5C0.947715 8.5 0.5 8.05228 0.5 7.5C0.5 6.94772 0.947715 6.5 1.5 6.5H11L8.29289 3.70711C7.90237 3.31658 7.90237 2.68342 8.29289 2.29289Z" />
          </svg>
        ) : (
          <svg
            fill="#2fe782"
            width="1.2rem"
            height="1.2rem"
            viewBox="0 0 15 15"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M8.29289 2.29289C8.68342 1.90237 9.31658 1.90237 9.70711 2.29289L14.2071 6.79289C14.5976 7.18342 14.5976 7.81658 14.2071 8.20711L9.70711 12.7071C9.31658 13.0976 8.68342 13.0976 8.29289 12.7071C7.90237 12.3166 7.90237 11.6834 8.29289 11.2929L11 8.5H1.5C0.947715 8.5 0.5 8.05228 0.5 7.5C0.5 6.94772 0.947715 6.5 1.5 6.5H11L8.29289 3.70711C7.90237 3.31658 7.90237 2.68342 8.29289 2.29289Z" />
          </svg>
        )}
        </button>
      </HotkeyTooltip>
      {open && (
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>Recommendations</span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.15rem",
                  fontSize: "0.65rem",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: GREEN,
                      display: "inline-block",
                    }}
                  />
                  <span style={{ color: "#aaa" }}>Schedule</span>
                </span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: INDIGO,
                      display: "inline-block",
                    }}
                  />
                  <span style={{ color: "#aaa" }}>List</span>
                </span>
              </div>
              <button
                type="button"
                onClick={handleClear}
                disabled={clearing}
                style={{
                  background: "transparent",
                  border: "1px solid #555",
                  borderRadius: "4px",
                  color: "#888",
                  fontSize: "0.65rem",
                  padding: "0.2rem 0.4rem",
                  cursor: "pointer",
                  transition: "color 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#ef4444";
                  e.currentTarget.style.borderColor = "#ef4444";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#888";
                  e.currentTarget.style.borderColor = "#555";
                }}
                title="Clear all recommendations"
              >
                {clearing ? "..." : "Clear"}
              </button>
            </div>
          </div>
          <div className={styles.sidebarList}>
            {/* Schedule items grouped by date */}
            {sortedBucketKeys.map((bucket) => (
              <div key={bucket}>
                <div
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: GREEN,
                    padding: "0.4rem 0.25rem 0.2rem",
                    borderBottom: "1px solid #333",
                    marginBottom: "0.25rem",
                  }}
                >
                  {bucket}
                </div>
                {scheduleBuckets[bucket].map(renderPlace)}
              </div>
            ))}
            {/* List items grouped by category */}
            {(() => {
              const listByCategory: Record<string, UnifiedPlace[]> = {};
              for (const place of listItems) {
                const cat = (place.place_category || "Other").toLowerCase().trim().replace(/s$/, "");
                if (!listByCategory[cat]) listByCategory[cat] = [];
                listByCategory[cat].push(place);
              }
              const sortedCats = Object.keys(listByCategory).sort((a, b) => {
                if (a === "Other") return 1;
                if (b === "Other") return -1;
                return a.localeCompare(b);
              });
              return sortedCats.map((cat) => (
                <div key={cat}>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      color: INDIGO,
                      padding: "0.4rem 0.25rem 0.2rem",
                      borderBottom: "1px solid #333",
                      marginBottom: "0.25rem",
                      textTransform: "capitalize",
                    }}
                  >
                    {CATEGORY_HEADERS[cat] ?? cat}
                  </div>
                  {listByCategory[cat].map(renderPlace)}
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </>
  );
};

export default SuggestionsSidebar;
