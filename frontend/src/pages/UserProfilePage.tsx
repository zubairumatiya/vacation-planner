import { useEffect, useState, useContext, useRef } from "react";
import { useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import refreshFn from "../utils/refreshFn";
import profileIcon from "../assets/profile.svg";
import styles from "../styles/UserProfilePage.module.css";

const apiUrl = import.meta.env.VITE_API_URL;

interface UserPublicTrip {
  trip_name: string;
  location: string;
  start_date: string;
  num_days: number;
  is_open_invite: boolean;
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  is_friend: boolean;
  is_pending: boolean;
  friends_count?: number;
  upcoming_trips?: UserPublicTrip[];
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-us", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const login = auth?.login;
  const logout = auth?.logout;
  const refreshInFlightRef = auth?.refreshInFlightRef;
  const loggingOutRef = auth?.loggingOutRef;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestSent, setRequestSent] = useState(false);
  const [unfriended, setUnfriended] = useState(false);
  const [friendBtnHovered, setFriendBtnHovered] = useState(false);

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

  useEffect(() => {
    if (loggingOutRef?.current || !userId) return;
    const loadProfile = async () => {
      try {
        const res = await authFetch(`${apiUrl}/users/${userId}/profile`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch {
        // handled by authFetch
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [userId, token]);

  const handleAddFriend = async () => {
    try {
      const res = await authFetch(`${apiUrl}/follow/${userId}`, {
        method: "POST",
      });
      if (res.ok || res.status === 409) {
        setRequestSent(true);
      }
    } catch {
      // handled
    }
  };

  const handleUnfriend = async () => {
    try {
      const res = await authFetch(`${apiUrl}/follow/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUnfriended(true);
      }
    } catch {
      // handled
    }
  };

  if (loading || !profile) {
    return null;
  }

  const fullName = `${profile.first_name} ${profile.last_name}`;
  const isPending = profile.is_pending || requestSent;

  // Non-friend view (or just unfriended): centered pic, name, add friend button
  if (!profile.is_friend || unfriended) {
    return (
      <div className={styles.container}>
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>
            <img src={profileIcon} alt="Profile" />
          </div>
          <div className={styles.name}>{fullName}</div>
          <div className={styles.profileUsername}>@{profile.username}</div>
          {isPending ? (
            <button type="button" className={styles.pendingBtn} disabled>
              Pending...
            </button>
          ) : (
            <button
              type="button"
              className={styles.befriendBtn}
              onClick={handleAddFriend}
            >
              Befriend
            </button>
          )}
        </div>
      </div>
    );
  }

  // Friend view: pic + name top center, trips left, stats right
  return (
    <div className={styles.container}>
      <div className={styles.profileHeader}>
        <div className={styles.avatar}>
          <img src={profileIcon} alt="Profile" />
        </div>
        <div className={styles.name}>{fullName}</div>
        <div className={styles.profileUsername}>@{profile.username}</div>
        <button
          type="button"
          className={friendBtnHovered ? styles.friendBtnHover : styles.friendBtn}
          onMouseEnter={() => setFriendBtnHovered(true)}
          onMouseLeave={() => setFriendBtnHovered(false)}
          onClick={handleUnfriend}
        >
          {friendBtnHovered ? (
            <><span className={styles.xMark}>&#x2715;</span> Unfriend</>
          ) : (
            <><span className={styles.checkMark}>&#x2713;</span> Friends</>
          )}
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.leftColumn}>
          <div className={styles.sectionTitle}>Upcoming Trips</div>
          {!profile.upcoming_trips || profile.upcoming_trips.length === 0 ? (
            <p className={styles.emptyText}>No public trips</p>
          ) : (
            profile.upcoming_trips.map((trip, i) => (
              <div key={i} className={styles.tripCard}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div className={styles.tripName}>{trip.trip_name}</div>
                  {trip.is_open_invite && (
                    <span
                      style={{
                        backgroundColor: "#16a34a",
                        color: "#fff",
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        padding: "1px 8px",
                        borderRadius: "9999px",
                        whiteSpace: "nowrap",
                        lineHeight: "1.4",
                      }}
                    >
                      Open Invite
                    </span>
                  )}
                </div>
                <div className={styles.tripDetail}>{trip.location}</div>
                <div className={styles.tripDetail}>
                  {formatDate(trip.start_date)} &middot; {trip.num_days} day
                  {trip.num_days !== 1 ? "s" : ""}
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.sectionTitle}>Stats</div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {profile.friends_count ?? 0}
            </div>
            <div className={styles.statLabel}>Fellow Travelers</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
