import { useEffect, useState, useContext, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import refreshFn from "../utils/refreshFn";
import { getAvatarSrc } from "../utils/avatarUtils";
import styles from "../styles/FriendsCountryLogs.module.css";
import Tooltip from "../components/Tooltip";
import {
  getVisitCountTextColor,
  formatVisitCount,
} from "../utils/visitCountColors";

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
  cityId: string | null;
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
  cityId: (raw.city_id as string) || null,
});

export default function FriendsCountryLogs({
  countryName,
  tripLocation,
  onItemAdded,
}: {
  countryName: string;
  tripLocation?: string;
  onItemAdded: () => void;
}) {
  const { tripId } = useParams<{ tripId: string }>();
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const login = auth?.login;
  const logout = auth?.logout;
  const refreshInFlightRef = auth?.refreshInFlightRef;
  const loggingOutRef = auth?.loggingOutRef;

  const tripCity = tripLocation
    ? tripLocation.split(",")[0].trim().toLowerCase()
    : "";

  const [friendLogs, setFriendLogs] = useState<FriendCountryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriendIndex, setSelectedFriendIndex] = useState<number | null>(
    null,
  );
  const [friendPlaces, setFriendPlaces] = useState<CountryPlace[]>([]);
  const [friendDetailLoading, setFriendDetailLoading] = useState(false);
  const [friendCityFilter, setFriendCityFilter] = useState<string>("all");
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
          const sorted = [...data.friends];
          if (tripCity) {
            sorted.sort((a, b) => {
              const aMatch = a.cities?.some(
                (c: string) => c.toLowerCase() === tripCity,
              )
                ? 1
                : 0;
              const bMatch = b.cities?.some(
                (c: string) => c.toLowerCase() === tripCity,
              )
                ? 1
                : 0;
              return bMatch - aMatch;
            });
          }
          setFriendLogs(sorted);
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
      setFriendDetailLoading(false);
      return;
    }

    const friend = friendLogs[selectedFriendIndex];
    if (!friend) return;

    setFriendDetailLoading(true);
    setFriendPlaces([]);
    const fetchDetail = async () => {
      try {
        const res = await authFetch(
          `${apiUrl}/travel-log/${friend.userCountryId}/detail`,
        );
        if (res.ok) {
          const data = await res.json();
          const mappedPlaces = (data.places as Record<string, unknown>[]).map(
            mapPlace,
          );
          setFriendPlaces(mappedPlaces);

          if (tripCity) {
            const matchingCity = mappedPlaces.find(
              (p) => p.category === "city" && p.name.toLowerCase() === tripCity,
            );
            setFriendCityFilter(matchingCity ? matchingCity.id : "all");
          } else {
            setFriendCityFilter("all");
          }
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

  // Group places by category for detail view, filtered by city
  const friendCities = friendPlaces.filter((p) => p.category === "city");
  const grouped: Record<string, CountryPlace[]> = {};
  for (const p of friendPlaces) {
    if (
      p.category !== "city" &&
      friendCityFilter !== "all" &&
      p.cityId !== friendCityFilter
    ) {
      continue;
    }
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
                      <span
                        style={{
                          color: getVisitCountTextColor(
                            friend.timesVisited,
                            friend.isNative,
                          ),
                          marginLeft: "6px",
                          fontWeight: 600,
                        }}
                      >
                        (
                        {formatVisitCount(friend.timesVisited, friend.isNative)}
                        )
                      </span>
                    )}
                  </span>
                  {tripCity &&
                    friend.cities?.some(
                      (c: string) =>
                        c.toLowerCase().includes(tripCity) ||
                        tripCity.includes(c.toLowerCase()),
                    ) && (
                      <span className={styles.cityBadge}>
                        (
                        {friend.cities.find(
                          (c: string) =>
                            c.toLowerCase().includes(tripCity) ||
                            tripCity.includes(c.toLowerCase()),
                        )}
                        )
                      </span>
                    )}
                  <div className={styles.meta}>
                    <div className={styles.groupCardRow}>
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
                          {" "}
                          {friend.numDays} day{friend.numDays !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <span className={styles.placesCount}>
                      {friend.placesCount} item
                      {friend.placesCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : friendDetailLoading || friendPlaces.length === 0 ? (
        <div className={styles.loading}>Loading...</div>
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
            <Link
              to={`/user/${selectedFriend.userId}`}
              className={styles.detailHeader}
            >
              <img
                src={getAvatarSrc(selectedFriend.avatar)}
                alt={selectedFriend.username}
                className={styles.detailAvatar}
              />
              <span className={styles.detailName}>
                {selectedFriend.firstName} {selectedFriend.lastName}
              </span>
            </Link>
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
          <div className={styles.detailTopBar}>
            <button
              className={styles.backButton}
              onClick={() => setSelectedFriendIndex(null)}
            >
              Back to Friends
            </button>
            {friendCities.length > 0 && (
              <select
                className={styles.cityFilterSelect}
                value={friendCityFilter}
                onChange={(e) => setFriendCityFilter(e.target.value)}
              >
                <option value="all">All</option>
                {friendCities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

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
        </div>
      )}
    </div>
  );
}
