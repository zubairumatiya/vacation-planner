import { useEffect, useState, useContext, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import refreshFn from "../utils/refreshFn";
import { getAvatarSrc } from "../utils/avatarUtils";
import styles from "../styles/FriendsCountryLogs.module.css";
import Tooltip from "../components/Tooltip";
import { getVisitCountTextColor, formatVisitCount } from "../utils/visitCountColors";

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

const CATEGORIES = [
  { key: "city" as const, label: "Cities" },
  { key: "eat" as const, label: "Places to Eat" },
  { key: "stay" as const, label: "Places to Stay" },
  { key: "excursion" as const, label: "Excursions" },
];

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

export default function FriendsCountryLogs({
  countryName,
  onItemAdded,
}: {
  countryName: string;
  onItemAdded: () => void;
}) {
  const { tripId } = useParams<{ tripId: string }>();
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const login = auth?.login;
  const logout = auth?.logout;
  const refreshInFlightRef = auth?.refreshInFlightRef;
  const loggingOutRef = auth?.loggingOutRef;

  const [friendLogs, setFriendLogs] = useState<FriendCountryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriendIndex, setSelectedFriendIndex] = useState<number | null>(
    null,
  );
  const [friendPlaces, setFriendPlaces] = useState<CountryPlace[]>([]);
  const [friendDetailLoading, setFriendDetailLoading] = useState(false);
  const [addedPlaces, setAddedPlaces] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("addedPlaces");
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    return new Set();
  });

  useEffect(() => {
    localStorage.setItem(
      "addedPlaces",
      JSON.stringify(Array.from(addedPlaces)),
    );
  }, [addedPlaces]);

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

  // Fetch friend logs for this country
  useEffect(() => {
    if (!countryName || !token) return;

    const fetchFriendLogs = async () => {
      setLoading(true);
      try {
        const res = await authFetch(
          `${apiUrl}/friends/country-logs/${encodeURIComponent(countryName)}`,
        );
        if (res.ok) {
          const data = (await res.json()) as { friends: FriendCountryLog[] };
          setFriendLogs(data.friends);
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };

    fetchFriendLogs();
  }, [countryName, token]);

  // Fetch friend detail when selected
  useEffect(() => {
    if (selectedFriendIndex === null) {
      setFriendPlaces([]);
      return;
    }

    const friend = friendLogs[selectedFriendIndex];
    if (!friend) return;

    const fetchDetail = async () => {
      setFriendDetailLoading(true);
      try {
        const res = await authFetch(
          `${apiUrl}/travel-log/${friend.userCountryId}/detail`,
        );
        if (res.ok) {
          const data = await res.json();
          setFriendPlaces(
            (data.places as Record<string, unknown>[]).map(mapPlace),
          );
        }
      } catch {
        // silent fail
      } finally {
        setFriendDetailLoading(false);
      }
    };

    fetchDetail();
  }, [selectedFriendIndex, friendLogs]);

  const handleAddToWishList = async (place: CountryPlace) => {
    if (!tripId) return;
    try {
      const res = await authFetch(`${apiUrl}/list/${tripId}`, {
        method: "POST",
        body: JSON.stringify({
          value: place.name,
          details: place.note || null,
        }),
      });
      if (res.ok) {
        setAddedPlaces((prev) => {
          const newSet = new Set(prev);
          newSet.add(place.id);
          return newSet;
        });
        onItemAdded();
      }
    } catch {
      // silent fail
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!countryName) {
    return (
      <div className={styles.empty}>No country detected for this trip.</div>
    );
  }

  if (friendLogs.length === 0) {
    return (
      <div className={styles.empty}>
        None of your friends have travel logs for {countryName} yet.
      </div>
    );
  }

  // Group places by category for detail view
  const grouped: Record<string, CountryPlace[]> = {};
  for (const p of friendPlaces) {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  }

  const selectedFriend =
    selectedFriendIndex !== null ? friendLogs[selectedFriendIndex] : null;

  return (
    <div className={styles.container}>
      {selectedFriend === null ? (
        <>
          <h2 className={styles.sectionTitle}>
            Friends who&apos;ve been to {countryName}
          </h2>
          <div className={styles.grid}>
            {friendLogs.map((friend, idx) => (
              <div
                key={friend.userCountryId}
                className={styles.card}
                onClick={() => setSelectedFriendIndex(idx)}
              >
                <Link
                  to={`/user/${friend.userId}`}
                  className={styles.avatarLink}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={getAvatarSrc(friend.avatar)}
                    alt={friend.username}
                    className={styles.avatar}
                  />
                </Link>
                <div className={styles.cardInfo}>
                  <span className={styles.username}>
                    {friend.username}
                    {(friend.isNative || friend.timesVisited > 1) && (
                      <span style={{ color: getVisitCountTextColor(friend.timesVisited, friend.isNative), marginLeft: "6px", fontWeight: 600 }}>
                        ({formatVisitCount(friend.timesVisited, friend.isNative)})
                      </span>
                    )}
                  </span>
                  <div className={styles.meta}>
                    {friend.visitDate && (
                      <span>
                        {new Date(friend.visitDate).toLocaleDateString(
                          "en-US",
                          { month: "short", year: "numeric" },
                        )}
                      </span>
                    )}
                    {friend.numDays && (
                      <span>
                        {friend.numDays} day{friend.numDays !== 1 ? "s" : ""}
                      </span>
                    )}
                    <span>
                      {friend.placesCount} item
                      {friend.placesCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.detailView}>
          <div className={styles.detailNav}>
            <Tooltip label="Previous Friend">
            <button
              className={styles.navButton}
              disabled={selectedFriendIndex === 0}
              onClick={() =>
                setSelectedFriendIndex((selectedFriendIndex ?? 0) - 1)
              }
            >
              <svg
                viewBox="1 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: "20px", height: "20px" }}
              >
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            </Tooltip>
            <div className={styles.detailHeader}>
              <Link
                to={`/user/${selectedFriend.userId}`}
                className={styles.detailAvatarLink}
              >
                <img
                  src={getAvatarSrc(selectedFriend.avatar)}
                  alt={selectedFriend.username}
                  className={styles.detailAvatar}
                />
              </Link>
              <span className={styles.detailName}>
                {selectedFriend.firstName} {selectedFriend.lastName}
              </span>
            </div>
            <Tooltip label="Next Friend">
            <button
              className={styles.navButton}
              disabled={selectedFriendIndex === friendLogs.length - 1}
              onClick={() =>
                setSelectedFriendIndex((selectedFriendIndex ?? 0) + 1)
              }
            >
              <svg
                viewBox="0 0 22 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: "20px", height: "20px" }}
              >
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            </Tooltip>
          </div>
          <button
            className={styles.backButton}
            onClick={() => setSelectedFriendIndex(null)}
          >
            Back to Friends
          </button>

          {friendDetailLoading ? (
            <div className={styles.loading}>Loading details...</div>
          ) : (
            <div className={styles.detailBody}>
              {CATEGORIES.map(({ key, label }) => {
                const items = grouped[key] || [];
                return (
                  <div key={key} className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.sectionLabel}>{label}</span>
                    </div>

                    {items.length === 0 && (
                      <p className={styles.emptyText}>None yet</p>
                    )}

                    <ul className={styles.placeList}>
                      {items.map((place) => (
                        <li key={place.id} className={styles.placeItem}>
                          {addedPlaces.has(place.id) && (
                            <div className={styles.addedBadge}>
                              <button
                                type="button"
                                className={styles.addedBadgeBtn}
                                onClick={() => {
                                  setAddedPlaces((prev) => {
                                    const next = new Set(prev);
                                    next.delete(place.id);
                                    return next;
                                  });
                                }}
                              >
                                <span className={styles.addedBadgeCheck}>
                                  &#10003; added
                                </span>
                                <span className={styles.addedBadgeDismiss}>
                                  &#10007; dismiss
                                </span>
                              </button>
                            </div>
                          )}
                          <div className={styles.placeRow}>
                            <span className={styles.placeName}>
                              {place.name}
                            </span>
                            {place.note && (
                              <div className={styles.noteDisplay}>
                                {place.note}
                              </div>
                            )}
                          </div>
                          <div className={styles.placeActions}>
                            {!addedPlaces.has(place.id) && (
                              <button
                                type="button"
                                className={styles.addToTripBtn}
                                onClick={() => handleAddToWishList(place)}
                                aria-label="Add to wish list"
                              >
                                +
                              </button>
                            )}
                            {place.isFavorite && (
                              <span className={styles.starActive}>
                                {"\u2605"}
                              </span>
                            )}
                            {place.isPuke && <span>🤮</span>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
