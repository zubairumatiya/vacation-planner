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

const mapFollowUser = (raw: Record<string, unknown>): FollowUser => ({
  id: raw.id as string,
  firstName: raw.first_name as string,
  lastName: raw.last_name as string,
  username: raw.username as string,
  followId: raw.follow_id as string,
});

const mapUserSearchResult = (raw: Record<string, unknown>): UserSearchResult => ({
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
        setFirstName(data.first_name as string || "");
        setLastName(data.last_name as string || "");
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
        setFriends((data.friends as Record<string, unknown>[]).map(mapFollowUser));
      }
    } catch {
      // handled
    }
  };

  useEffect(() => {
    if (loggingOutRef?.current) return;
    loadProfile();
    loadFriends();
  }, [token]);

  // Click outside to hide friend suggestions
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (friendSearchRef.current && !friendSearchRef.current.contains(e.target as Node)) {
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
          setSuggestions((data.users as Record<string, unknown>[]).map(mapUserSearchResult));
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
          <TravelLog authFetch={authFetch} userId={auth?.userId ?? undefined} />
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
                      <span className={styles.userUsername}> @{user.username}</span>
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
                      <span className={styles.userUsername}>@{user.username}</span>
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
