import { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import refreshFn from "../utils/refreshFn";
import profileIcon from "../assets/profile.svg";
import styles from "../styles/UserProfilePage.module.css";
import TravelLog from "../components/TravelLog";

const apiUrl = import.meta.env.VITE_API_URL;

interface UserCountry {
  id: string;
  countryId: number;
  countryName: string;
  continent: string;
  visibility: "public" | "friends" | "private";
  visitDate: string | null;
  numDays: number | null;
}

interface UserPublicTrip {
  tripName: string;
  location: string;
  startDate: string;
  numDays: number;
  isOpenInvite: boolean;
}

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  isFriend: boolean;
  isPending: boolean;
  upcomingTrips?: UserPublicTrip[];
  travelLog?: UserCountry[];
}

const mapUserPublicTrip = (raw: Record<string, unknown>): UserPublicTrip => ({
  tripName: raw.trip_name as string,
  location: raw.location as string,
  startDate: raw.start_date as string,
  numDays: raw.num_days as number,
  isOpenInvite: raw.is_open_invite as boolean,
});

const mapUserCountry = (raw: Record<string, unknown>): UserCountry => ({
  id: raw.id as string,
  countryId: raw.country_id as number,
  countryName: raw.country_name as string,
  continent: raw.continent as string,
  visibility: raw.visibility as "public" | "friends" | "private",
  visitDate: (raw.visit_date as string) || null,
  numDays: (raw.num_days as number) ?? null,
});

const mapUserProfile = (raw: Record<string, unknown>): UserProfile => ({
  id: raw.id as string,
  firstName: raw.first_name as string,
  lastName: raw.last_name as string,
  username: raw.username as string,
  isFriend: raw.is_friend as boolean,
  isPending: raw.is_pending as boolean,
  upcomingTrips: raw.upcoming_trips
    ? (raw.upcoming_trips as Record<string, unknown>[]).map(mapUserPublicTrip)
    : undefined,
  travelLog: raw.travel_log
    ? (raw.travel_log as Record<string, unknown>[]).map(mapUserCountry)
    : undefined,
});

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
          setProfile(mapUserProfile(data));
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

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const isPending = profile.isPending || requestSent;

  // Non-friend view (or just unfriended): centered pic, name, add friend button
  if (!profile.isFriend || unfriended) {
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

  // Friend view: pic + name top center, trips left, travel log right
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
          {!profile.upcomingTrips || profile.upcomingTrips.length === 0 ? (
            <p className={styles.emptyText}>No public trips</p>
          ) : (
            profile.upcomingTrips.map((trip, i) => (
              <div key={i} className={styles.tripCard}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div className={styles.tripName}>{trip.tripName}</div>
                  {trip.isOpenInvite && (
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
                  {formatDate(trip.startDate)} &middot; {trip.numDays} day
                  {trip.numDays !== 1 ? "s" : ""}
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.rightColumn}>
          <TravelLog
            authFetch={authFetch}
            readOnly
            countries={profile.travelLog}
          />
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
