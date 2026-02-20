import { useEffect, useState, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import refreshFn from "../utils/refreshFn";
import profileIcon from "../assets/profile.svg";
import styles from "../styles/ProfilePage.module.css";

const apiUrl = import.meta.env.VITE_API_URL;

interface FollowUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  follow_id: string;
}

interface UserSearchResult {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface PendingFollow {
  following_id: string;
}

const ProfilePage = () => {
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const login = auth?.login;
  const logout = auth?.logout;
  const refreshInFlightRef = auth?.refreshInFlightRef;
  const loggingOutRef = auth?.loggingOutRef;

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<UserSearchResult[]>([]);
  const [pendingFollows, setPendingFollows] = useState<Set<string>>(new Set());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers as Record<string, string>,
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
        setEmail(data.email);
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
      }
    } catch {
      // handled by authFetch
    }
  };

  const loadFollowers = async () => {
    try {
      const res = await authFetch(`${apiUrl}/followers`);
      if (res.ok) {
        const data = await res.json();
        setFollowers(data.followers);
      }
    } catch {
      // handled
    }
  };

  const loadFollowing = async () => {
    try {
      const res = await authFetch(`${apiUrl}/following`);
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
      }
    } catch {
      // handled
    }
  };

  useEffect(() => {
    if (loggingOutRef?.current) return;
    loadProfile();
    loadFollowers();
    loadFollowing();
  }, [token]);

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
          `${apiUrl}/users/search?email=${encodeURIComponent(value)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.users);
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

  const handleUnfollow = async (userId: string) => {
    try {
      const res = await authFetch(`${apiUrl}/follow/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFollowing((prev) => prev.filter((f) => f.id !== userId));
      }
    } catch {
      // handled
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This cannot be undone.")) {
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

  const isFollowing = (userId: string) =>
    following.some((f) => f.id === userId);

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
        <div className={styles.email}>{email}</div>
        <button
          type="button"
          className={styles.deleteBtn}
          onClick={handleDelete}
        >
          Delete Account
        </button>
      </div>

      <div className={styles.addFriendSection}>
        <div className={styles.sectionTitle}>Add Friend</div>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search by email..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {suggestions.length > 0 && (
          <ul className={styles.suggestions}>
            {suggestions.map((user) => (
              <li key={user.id} className={styles.suggestionItem}>
                <div>
                  <span className={styles.userName}>
                    {user.first_name} {user.last_name}
                  </span>
                  <span className={styles.userEmail}> {user.email}</span>
                </div>
                {isFollowing(user.id) ? (
                  <span className={styles.pendingText}>Following</span>
                ) : isPending(user.id) ? (
                  <span className={styles.pendingText}>Pending</span>
                ) : (
                  <button
                    type="button"
                    className={styles.followBtn}
                    onClick={() => handleFollow(user.id)}
                  >
                    Follow
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          Fellow Travelers ({following.length})
        </div>
        {following.length === 0 ? (
          <p className={styles.emptyText}>Not following anyone yet</p>
        ) : (
          <ul className={styles.userList}>
            {following.map((user) => (
              <li key={user.id} className={styles.userItem}>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>
                    {user.first_name} {user.last_name}
                  </span>
                  <span className={styles.userEmail}>{user.email}</span>
                </div>
                <button
                  type="button"
                  className={styles.unfollowBtn}
                  onClick={() => handleUnfollow(user.id)}
                >
                  Unfollow
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          Followers ({followers.length})
        </div>
        {followers.length === 0 ? (
          <p className={styles.emptyText}>No followers yet</p>
        ) : (
          <ul className={styles.userList}>
            {followers.map((user) => (
              <li key={user.id} className={styles.userItem}>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>
                    {user.first_name} {user.last_name}
                  </span>
                  <span className={styles.userEmail}>{user.email}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
