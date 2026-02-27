import { useEffect, useState, useContext, useRef } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import refreshFn from "../utils/refreshFn";
import profileIcon from "../assets/profile.svg";
import styles from "../styles/ProfilePage.module.css";
import TravelLog from "../components/TravelLog";

const apiUrl = import.meta.env.VITE_API_URL;

interface FollowUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  followId: string;
}

interface UserSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
}

interface UserCountry {
  id: string;
  countryId: number;
  countryName: string;
  continent: string;
  visibility: "public" | "friends" | "private";
  visitDate: string | null;
  numDays: number | null;
}

const mapUserCountry = (raw: Record<string, unknown>): UserCountry => ({
  id: raw.id as string,
  countryId: raw.country_id as number,
  countryName: raw.country_name as string,
  continent: raw.continent as string,
  visibility: raw.visibility as "public" | "friends" | "private",
  visitDate: (raw.visit_date as string) || null,
  numDays: (raw.num_days as number) ?? null,
});

const mapFollowUser = (raw: Record<string, unknown>): FollowUser => ({
  id: raw.id as string,
  firstName: raw.first_name as string,
  lastName: raw.last_name as string,
  username: raw.username as string,
  followId: raw.follow_id as string,
});

const mapUserSearchResult = (
  raw: Record<string, unknown>,
): UserSearchResult => ({
  id: raw.id as string,
  firstName: raw.first_name as string,
  lastName: raw.last_name as string,
  username: raw.username as string,
});

const ProfilePage = () => {
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const login = auth?.login;
  const logout = auth?.logout;
  const refreshInFlightRef = auth?.refreshInFlightRef;
  const loggingOutRef = auth?.loggingOutRef;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profileUsername, setProfileUsername] = useState("");
  const [friends, setFriends] = useState<FollowUser[]>([]);
  const [travelLog, setTravelLog] = useState<UserCountry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<UserSearchResult[]>([]);
  const [pendingFollows, setPendingFollows] = useState<Set<string>>(new Set());
  const [showFriendSuggestions, setShowFriendSuggestions] = useState(true);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const friendSearchRef = useRef<HTMLDivElement>(null);

  const authFetch = async (url: string, options: RequestInit = {}) => {
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
  };

  const loadProfile = async () => {
    try {
      const res = await authFetch(`${apiUrl}/profile`);
      if (res.ok) {
        const data = await res.json();
        setFirstName((data.first_name as string) || "");
        setLastName((data.last_name as string) || "");
        setProfileUsername(data.username || "");
      }
    } catch {
      // handled by authFetch
    }
  };

  const loadFriends = async () => {
    try {
      const res = await authFetch(`${apiUrl}/friends`);
      if (res.ok) {
        const data = await res.json();
        setFriends(
          (data.friends as Record<string, unknown>[]).map(mapFollowUser),
        );
      }
    } catch {
      // handled
    }
  };

  const loadTravelLog = async () => {
    try {
      const res = await authFetch(`${apiUrl}/travel-log`);
      if (res.ok) {
        const data = await res.json();
        setTravelLog(
          (data.countries as Record<string, unknown>[]).map(mapUserCountry),
        );
      }
    } catch {
      // handled
    }
  };

  useEffect(() => {
    if (loggingOutRef?.current) return;
    loadProfile();
    loadFriends();
    loadTravelLog();
  }, [token]);

  // Click outside to hide friend suggestions
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        friendSearchRef.current &&
        !friendSearchRef.current.contains(e.target as Node)
      ) {
        setShowFriendSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await authFetch(
          `${apiUrl}/users/search?q=${encodeURIComponent(value)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(
            (data.users as Record<string, unknown>[]).map(mapUserSearchResult),
          );
        }
      } catch {
        // handled
      }
    }, 300);
  };

  const handleFollow = async (userId: string) => {
    try {
      const res = await authFetch(`${apiUrl}/follow/${userId}`, {
        method: "POST",
      });
      if (res.ok || res.status === 409) {
        setPendingFollows((prev) => new Set(prev).add(userId));
      }
    } catch {
      // handled
    }
  };

  const handleRemoveFriend = async (userId: string) => {
    try {
      const res = await authFetch(`${apiUrl}/follow/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFriends((prev) => prev.filter((f) => f.id !== userId));
      }
    } catch {
      // handled
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete your account? This cannot be undone.",
      )
    ) {
      return;
    }
    try {
      const res = await authFetch(`${apiUrl}/profile`, { method: "DELETE" });
      if (res.ok) {
        await logout?.();
      }
    } catch {
      // handled
    }
  };

  const isFriend = (userId: string) => friends.some((f) => f.id === userId);

  const isPending = (userId: string) => pendingFollows.has(userId);

  return (
    <div className={styles.container}>
      <div className={styles.profileHeader}>
        <div className={styles.avatar}>
          <img src={profileIcon} alt="Profile" />
        </div>
        {(firstName || lastName) && (
          <div className={styles.name}>
            {firstName} {lastName}
          </div>
        )}
        <div className={styles.username}>@{profileUsername}</div>
        <button
          type="button"
          className={styles.deleteBtn}
          onClick={handleDelete}
        >
          Delete Account
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.leftColumn}>
          <TravelLog
            authFetch={authFetch}
            userId={auth?.userId ?? undefined}
            countries={travelLog}
          />
        </div>
        <div
          className={styles.countryFractions}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            margin: "1rem 0",
          }}
        >
          <div
            style={{
              color: "#aaa",
              fontSize: "0.9rem",
              fontWeight: "800",
              marginBottom: "0.5rem",
            }}
          >
            {travelLog.length} / 195 Countries Visited
          </div>
          <Link
            to={`/world-map/${auth?.userId}`}
            style={{
              backgroundColor: "transparent",
              border: "2px solid #2fe782",
              color: "#2fe782",
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              cursor: "pointer",
              transition: "all 0.2s",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#2fe782";
              e.currentTarget.style.color = "#222";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#2fe782";
            }}
          >
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 120 120"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                id="curve"
                d="M 5.5 59.88 A 28.8 27.2 90 0 0 110.5 50.76"
                fill="none"
              />
              <text
                fill="currentColor"
                style={{
                  fontSize: "20px",
                  fontWeight: "1000",
                  letterSpacing: "5px",
                }}
                fontWeight="bold"
              >
                <textPath href="#curve" startOffset="50%" textAnchor="middle">
                  World Map
                </textPath>
              </text>
              <g transform="translate(44, 25)">
                <path
                  d="M 45.0513 25.648 c 0 -14.6897 -11.5379 -26.7356 -26.0444 -27.5945 c -0.2989 -0.0329 -0.5978 -0.0553 -0.9037 -0.0553 c -0.0899 0 -0.1798 0.0086 -0.2695 0.0121 c -0.1607 -0.0035 -0.3214 -0.0121 -0.4855 -0.0121 c -15.2755 0 -27.7033 12.4036 -27.7033 27.6497 s 12.4278 27.6497 27.7033 27.6497 c 0.1625 0 0.3248 -0.0103 0.4855 -0.0138 c 0.0899 0.0035 0.1798 0.0138 0.2695 0.0138 c 0.3041 0 0.6031 -0.0208 0.9037 -0.0553 c 14.5066 -0.8588 26.0444 -12.9047 26.0444 -27.5945 z M 39.8967 34.5489 c -0.9521 -0.2765 -3.3437 -0.8761 -7.5635 -1.3721 c 0.3491 -2.3863 0.5408 -4.9075 0.5408 -7.5289 c 0 -2.0666 -0.1193 -4.0678 -0.3404 -5.9945 c 5.3465 -0.6394 7.6896 -1.4429 7.8451 -1.4982 l -0.6428 -1.8144 c 1.201 2.8668 1.8662 6.01 1.8662 9.307 c 0 3.1415 -0.6083 6.143 -1.7056 8.9009 z M 5.1154 25.648 c 0 -1.9337 0.1279 -3.8224 0.3629 -5.6384 c 2.801 0.2195 6.1534 0.3836 10.0898 0.4199 v 11.9906 c -3.8345 0.0362 -7.109 0.1918 -9.8652 0.4044 c -0.3802 -2.2793 -0.5875 -4.6915 -0.5875 -7.1782 z M 19.019 1.6841 c 4.2371 1.2286 7.8659 7.1107 9.4902 14.9092 c -2.6128 0.2074 -5.7577 0.3612 -9.4902 0.3958 v -15.3049 z M 15.5698 1.7255 v 15.2617 c -3.691 -0.0362 -6.8515 -0.1884 -9.5075 -0.3905 c 1.6589 -7.7017 5.3153 -13.5406 9.5075 -14.8711 z M 15.5698 35.8656 l 0 13.7014 c -3.9104 -1.2407 -7.3543 -6.4022 -9.1463 -13.3385 c 2.5782 -0.1901 5.6212 -0.3266 9.1446 -0.3629 z M 19.019 49.6119 l 0 -13.7462 c 3.5614 0.0346 6.5906 0.1763 9.1376 0.375 c -1.7609 7.0278 -5.184 12.2273 -9.1376 13.3712 z M 19.019 32.4218 l 0 -11.9906 c 3.9588 -0.0362 7.2887 -0.2039 10.0535 -0.432 c 0.2263 1.8196 0.3508 3.71 0.3508 5.6471 c 0 2.4918 -0.2004 4.9075 -0.5686 7.1885 c -2.7216 -0.2212 -5.9824 -0.3785 -9.8358 -0.4147 z M 39.1 14.9517 c -0.5219 0.1625 -2.7026 0.7828 -7.0745 1.2977 c -0.9746 -5.1805 -2.7372 -9.6094 -5.0285 -12.808 c 5.2669 2.2896 9.5645 6.3884 12.1046 11.5102 z M 9.076 2.8919 c -2.8201 3.2365 -5.12 7.8935 -6.378 13.399 c -3.9139 -0.4234 -6.2605 -0.9228 -7.1988 -1.1491 c 2.7389 -5.6506 7.6153 -10.0846 13.5751 -12.248 z M -5.783 18.368 c 0.6653 0.1798 3.1812 0.807 7.8607 1.3236 c -0.2678 1.9129 -0.4147 3.9053 -0.4147 5.9564 c 0 2.6076 0.235 5.1149 0.6618 7.4892 c -4.0176 0.4337 -6.4886 0.9539 -7.5962 1.2199 c -1.0489 -2.706 -1.6313 -5.6402 -1.6313 -8.7108 c 0 -2.535 0.394 -4.9818 1.1215 -7.28 z M -3.7612 37.547 c 1.2563 -0.2662 3.5062 -0.6739 6.8359 -1.0212 c 1.3116 4.8436 3.4439 8.9424 6.0013 11.8783 c -5.4605 -1.9837 -10.0051 -5.8717 -12.8374 -10.8553 v 0 z M 26.9954 47.8511 c 2.065 -2.8771 3.6979 -6.7513 4.714 -11.2752 c 3.4249 0.3923 5.5745 0.8537 6.658 1.1267 c -2.592 4.4858 -6.5802 8.0681 -11.3719 10.1485 z"
                  fill="currentColor"
                />
              </g>
            </svg>
          </Link>
        </div>
        <div className={styles.rightColumn}>
          <div className={styles.addFriendSection} ref={friendSearchRef}>
            <div className={styles.sectionTitle}>Add Friend</div>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by name or username..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setShowFriendSuggestions(true)}
            />
            {showFriendSuggestions && suggestions.length > 0 && (
              <ul className={styles.suggestions}>
                {suggestions.map((user) => (
                  <li key={user.id} className={styles.suggestionItem}>
                    <div>
                      <Link to={`/user/${user.id}`} className={styles.userName}>
                        {user.firstName} {user.lastName}
                      </Link>
                      <span className={styles.userUsername}>
                        {" "}
                        @{user.username}
                      </span>
                    </div>
                    {isFriend(user.id) ? (
                      <span className={styles.pendingText}>Friends</span>
                    ) : isPending(user.id) ? (
                      <span className={styles.pendingText}>Pending</span>
                    ) : (
                      <button
                        type="button"
                        className={styles.followBtn}
                        onClick={() => handleFollow(user.id)}
                      >
                        Add Friend
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              Fellow Travelers ({friends.length})
            </div>
            {friends.length === 0 ? (
              <p className={styles.emptyText}>No fellow travelers yet</p>
            ) : (
              <ul className={styles.userList}>
                {friends.map((user) => (
                  <li key={user.id} className={styles.userItem}>
                    <Link to={`/user/${user.id}`} className={styles.userLink}>
                      <span className={styles.userName}>
                        {user.firstName} {user.lastName}
                      </span>
                      <span className={styles.userUsername}>
                        @{user.username}
                      </span>
                    </Link>
                    <button
                      type="button"
                      className={styles.unfollowBtn}
                      onClick={() => handleRemoveFriend(user.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
