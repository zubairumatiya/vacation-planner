import { useState, useEffect, useContext, useCallback } from "react";
import { AuthContext } from "../context/AuthContext";
import type { GeminiRecommendedPlace } from "../types/gemini";
import styles from "../styles/SuggestionsSidebar.module.css";

const apiURL = import.meta.env.VITE_API_URL;

type SuggestionsSidebarProps = {
  tripId: string;
  refreshKey: number;
  onAddToSchedule: (place: GeminiRecommendedPlace) => Promise<void>;
};

const SuggestionsSidebar = ({
  tripId,
  refreshKey,
  onAddToSchedule,
}: SuggestionsSidebarProps) => {
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const [open, setOpen] = useState(false);
  const [places, setPlaces] = useState<GeminiRecommendedPlace[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);

  const fetchPlaces = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiURL}/gemini/recommended-places/${tripId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlaces(data.places ?? []);
      }
    } catch {
      // silent
    }
  }, [token, tripId]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces, refreshKey]);

  const handleAdd = async (place: GeminiRecommendedPlace) => {
    setAddingId(place.id);
    try {
      await onAddToSchedule(place);
      // Mark as added locally
      setPlaces((prev) =>
        prev.map((p) =>
          p.id === place.id ? { ...p, added_to_schedule: true } : p
        )
      );
      // Also mark on backend
      await fetch(`${apiURL}/gemini/recommended-places/${place.id}/added`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    } finally {
      setAddingId(null);
    }
  };

  if (places.length === 0) return null;

  return (
    <>
      <button
        type="button"
        className={`${styles.sidebarTab} ${open ? styles.sidebarTabOpen : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Close suggestions sidebar" : "Open suggestions sidebar"}
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
      {open && (
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>Past Suggestions</span>
          </div>
          <div className={styles.sidebarList}>
            {places.map((place) => (
              <div
                key={place.id}
                className={`${styles.sidebarItem} ${place.added_to_schedule ? styles.sidebarItemAdded : ""}`}
              >
                <div className={styles.sidebarItemInfo}>
                  <span className={styles.sidebarItemName}>
                    {place.place_name}
                  </span>
                  {place.place_category && (
                    <span className={styles.sidebarItemCategory}>
                      {place.place_category}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className={styles.sidebarAddButton}
                  onClick={() => handleAdd(place)}
                  disabled={place.added_to_schedule || addingId === place.id}
                  title={place.added_to_schedule ? "Already added" : "Add to schedule"}
                >
                  {place.added_to_schedule ? "✓" : addingId === place.id ? "..." : "+"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default SuggestionsSidebar;
