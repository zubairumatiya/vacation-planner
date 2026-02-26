import { useEffect, useState, useContext, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import refreshFn from "../utils/refreshFn";
import styles from "../styles/CountryDetailPage.module.css";

const apiUrl = import.meta.env.VITE_API_URL;

interface CountryPlace {
  id: string;
  userCountryId: string;
  category: "city" | "eat" | "stay" | "excursion";
  name: string;
  isFavorite: boolean;
  isPuke: boolean;
  note: string | null;
  sortIndex: number;
}

interface UserCountryDetail {
  id: string;
  userId: string;
  countryId: number;
  countryName: string;
  continent: string;
  visibility: string;
  firstName: string;
  lastName: string;
}

const mapPlace = (raw: Record<string, unknown>): CountryPlace => ({
  id: raw.id as string,
  userCountryId: raw.user_country_id as string,
  category: raw.category as CountryPlace["category"],
  name: raw.name as string,
  isFavorite: raw.is_favorite as boolean,
  isPuke: raw.is_puke as boolean,
  note: (raw.note as string) || null,
  sortIndex: raw.sort_index as number,
});

const mapUserCountry = (raw: Record<string, unknown>): UserCountryDetail => ({
  id: raw.id as string,
  userId: raw.user_id as string,
  countryId: raw.country_id as number,
  countryName: raw.country_name as string,
  continent: raw.continent as string,
  visibility: raw.visibility as string,
  firstName: raw.first_name as string,
  lastName: raw.last_name as string,
});

const CATEGORIES = [
  { key: "city" as const, label: "Cities" },
  { key: "eat" as const, label: "Places to Eat" },
  { key: "stay" as const, label: "Places to Stay" },
  { key: "excursion" as const, label: "Excursions" },
];

const CountryDetailPage = () => {
  const { userId, userCountryId } = useParams<{
    userId: string;
    userCountryId: string;
  }>();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const login = auth?.login;
  const logout = auth?.logout;
  const refreshInFlightRef = auth?.refreshInFlightRef;
  const loggingOutRef = auth?.loggingOutRef;

  const [country, setCountry] = useState<UserCountryDetail | null>(null);
  const [places, setPlaces] = useState<CountryPlace[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [addName, setAddName] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [layout, setLayout] = useState<"rows" | "columns">("rows");

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
        const result = await refreshFn(apiUrl, refreshInFlightRef!);
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

  useEffect(() => {
    if (loggingOutRef?.current || !userCountryId) return;
    const load = async () => {
      try {
        const res = await authFetch(
          `${apiUrl}/travel-log/${userCountryId}/detail`,
        );
        if (res.ok) {
          const data = await res.json();
          setCountry(
            mapUserCountry(data.userCountry as Record<string, unknown>),
          );
          setPlaces((data.places as Record<string, unknown>[]).map(mapPlace));
          setIsOwner(data.isOwner as boolean);
        } else {
          navigate(-1);
        }
      } catch {
        // handled
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userCountryId, token]);

  const handleDeleteCountry = async () => {
    try {
      const res = await authFetch(`${apiUrl}/travel-log/${country?.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        navigate(-1);
      }
    } catch {
      // handled
    }
  };

  const handleAddPlace = async (category: string) => {
    if (!addName.trim()) return;
    try {
      const res = await authFetch(
        `${apiUrl}/travel-log/${userCountryId}/places`,
        {
          method: "POST",
          body: JSON.stringify({ category, name: addName.trim() }),
        },
      );
      if (res.ok || res.status === 201) {
        const data = await res.json();
        const newPlace = mapPlace(data.place as Record<string, unknown>);
        setPlaces((prev) => [...prev, newPlace]);
        setAddName("");
        setAddingCategory(null);
      }
    } catch {
      // handled
    }
  };

  const handleToggleFavorite = async (place: CountryPlace) => {
    const newFav = !place.isFavorite;
    const body: Record<string, boolean> = { isFavorite: newFav };
    if (newFav && place.isPuke) body.isPuke = false;
    try {
      const res = await authFetch(`${apiUrl}/travel-log/places/${place.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setPlaces((prev) =>
          prev.map((p) =>
            p.id === place.id
              ? {
                  ...p,
                  isFavorite: newFav,
                  ...(newFav && p.isPuke ? { isPuke: false } : {}),
                }
              : p,
          ),
        );
      }
    } catch {
      // handled
    }
  };

  const handleTogglePuke = async (place: CountryPlace) => {
    const newPuke = !place.isPuke;
    const body: Record<string, boolean> = { isPuke: newPuke };
    if (newPuke && place.isFavorite) body.isFavorite = false;
    try {
      const res = await authFetch(`${apiUrl}/travel-log/places/${place.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setPlaces((prev) =>
          prev.map((p) =>
            p.id === place.id
              ? {
                  ...p,
                  isPuke: newPuke,
                  ...(newPuke && p.isFavorite ? { isFavorite: false } : {}),
                }
              : p,
          ),
        );
      }
    } catch {
      // handled
    }
  };

  const handleSaveNote = async (placeId: string) => {
    try {
      const res = await authFetch(`${apiUrl}/travel-log/places/${placeId}`, {
        method: "PATCH",
        body: JSON.stringify({ note: noteText || null }),
      });
      if (res.ok) {
        setPlaces((prev) =>
          prev.map((p) =>
            p.id === placeId ? { ...p, note: noteText || null } : p,
          ),
        );
        setEditingNoteId(null);
        setNoteText("");
      }
    } catch {
      // handled
    }
  };

  const handleDeletePlace = async (placeId: string) => {
    try {
      const res = await authFetch(`${apiUrl}/travel-log/places/${placeId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPlaces((prev) => prev.filter((p) => p.id !== placeId));
      }
    } catch {
      // handled
    }
  };

  if (loading || !country) return null;

  const fullName = `${country.firstName} ${country.lastName}`;
  const grouped: Record<string, CountryPlace[]> = {};
  for (const p of places) {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to={`/user/${userId}`} className={styles.breadcrumb}>
          {fullName}
        </Link>
        <span className={styles.separator}>&gt;</span>
        <span className={styles.countryTitle}>{country.countryName} Log</span>
        <div className={styles.headerRight}>
          <button
            type="button"
            className={`${styles.layoutBtn} ${layout === "rows" ? styles.layoutBtnActive : ""}`}
            onClick={() => setLayout("rows")}
            aria-label="Horizontal layout"
            title="Horizontal layout"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <line x1="1" y1="3" x2="15" y2="3" />
              <line x1="1" y1="8" x2="15" y2="8" />
              <line x1="1" y1="13" x2="15" y2="13" />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.layoutBtn} ${layout === "columns" ? styles.layoutBtnActive : ""}`}
            onClick={() => setLayout("columns")}
            aria-label="Column layout"
            title="Column layout"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <line x1="3" y1="1" x2="3" y2="15" />
              <line x1="8" y1="1" x2="8" y2="15" />
              <line x1="13" y1="1" x2="13" y2="15" />
            </svg>
          </button>
          {isOwner && (
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={() => setShowDeleteModal(true)}
              aria-label="Delete country"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {showDeleteModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowDeleteModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>Delete Country</div>
            <div className={styles.modalText}>
              Are you sure you want to remove {country.countryName} from your
              travel log? This will also delete all places and notes.
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalDeleteBtn}
                onClick={handleDeleteCountry}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={
          layout === "columns" ? styles.columnsLayout : styles.rowsLayout
        }
      >
        {CATEGORIES.map(({ key, label }) => {
          const items = grouped[key] || [];
          return (
            <div key={key} className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>{label}</span>
                {isOwner && (
                  <button
                    type="button"
                    className={styles.addItemBtn}
                    onClick={() => {
                      setAddingCategory(addingCategory === key ? null : key);
                      setAddName("");
                    }}
                    aria-label={`Add ${label}`}
                  >
                    +
                  </button>
                )}
              </div>

              {addingCategory === key && (
                <div className={styles.addForm}>
                  <input
                    type="text"
                    className={styles.addInput}
                    placeholder={`Add a ${key === "eat" ? "place to eat" : key === "stay" ? "place to stay" : key}...`}
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddPlace(key);
                      if (e.key === "Escape") {
                        setAddingCategory(null);
                        setAddName("");
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className={styles.addConfirmBtn}
                    onClick={() => handleAddPlace(key)}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className={styles.addCancelBtn}
                    onClick={() => {
                      setAddingCategory(null);
                      setAddName("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {items.length === 0 && addingCategory !== key && (
                <p className={styles.emptyText}>None yet</p>
              )}

              <ul className={styles.placeList}>
                {items.map((place) => (
                  <li key={place.id} className={styles.placeItem}>
                    <div className={styles.placeRow}>
                      <span className={styles.placeName}>{place.name}</span>
                      {place.note && editingNoteId !== place.id && (
                        <div className={styles.noteDisplay}>{place.note}</div>
                      )}
                    </div>
                    <div className={styles.placeActions}>
                      <button
                        type="button"
                        className={
                          place.isFavorite
                            ? styles.starBtnActive
                            : styles.starBtn
                        }
                        onClick={() => isOwner && handleToggleFavorite(place)}
                        aria-label="Favorite"
                        style={!isOwner ? { cursor: "default" } : undefined}
                      >
                        {place.isFavorite ? "\u2605" : "\u2606"}
                      </button>
                      <button
                        type="button"
                        className={
                          place.isPuke ? styles.pukeBtnActive : styles.pukeBtn
                        }
                        onClick={() => isOwner && handleTogglePuke(place)}
                        aria-label="Not recommended"
                        style={!isOwner ? { cursor: "default" } : undefined}
                      >
                        🤮
                      </button>
                      {isOwner && (
                        <button
                          type="button"
                          className={styles.addNoteBtn}
                          onClick={() => {
                            setEditingNoteId(
                              editingNoteId === place.id ? null : place.id,
                            );
                            setNoteText(place.note || "");
                          }}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          {place.note ? "Edit note" : "Add note"}
                        </button>
                      )}
                      {isOwner && (
                        <button
                          type="button"
                          className={styles.placeDeleteBtn}
                          onClick={() => handleDeletePlace(place.id)}
                          aria-label="Delete place"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {editingNoteId === place.id && (
                      <div className={styles.noteArea}>
                        <textarea
                          className={styles.noteInput}
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveNote(place.id);
                            }
                            if (e.key === "Escape") {
                              setEditingNoteId(null);
                              setNoteText("");
                            }
                          }}
                          placeholder="Write a note..."
                          autoFocus
                        />
                        <button
                          type="button"
                          className={styles.noteSaveBtn}
                          onClick={() => handleSaveNote(place.id)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className={styles.noteCancelBtn}
                          onClick={() => {
                            setEditingNoteId(null);
                            setNoteText("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CountryDetailPage;
