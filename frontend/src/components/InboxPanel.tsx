import { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import refreshFn from "../utils/refreshFn";
import styles from "../styles/InboxPanel.module.css";
import Tooltip from "./Tooltip";

const apiUrl = import.meta.env.VITE_API_URL;

interface Notification {
  id: string;
  fromUserId: string;
  fromFirstName: string;
  fromLastName: string;
  fromUsername: string;
  type: string;
  status: string;
  isRead: boolean;
  createdAt: string;
  tripName?: string;
}

const mapNotification = (raw: Record<string, unknown>): Notification => ({
  id: raw.id as string,
  fromUserId: raw.from_user_id as string,
  fromFirstName: raw.from_first_name as string,
  fromLastName: raw.from_last_name as string,
  fromUsername: raw.from_username as string,
  type: raw.type as string,
  status: raw.status as string,
  isRead: raw.is_read as boolean,
  createdAt: raw.created_at as string,
  tripName: raw.trip_name as string | undefined,
});

interface InboxPanelProps {
  onBack: () => void;
  onUnreadCountChange: (count: number) => void;
  onTripAccepted?: () => void;
}

const InboxPanel = ({ onBack, onUnreadCountChange, onTripAccepted }: InboxPanelProps) => {
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const login = auth?.login;
  const logout = auth?.logout;
  const refreshInFlightRef = auth?.refreshInFlightRef;
  const loggingOutRef = auth?.loggingOutRef;

  const [notifications, setNotifications] = useState<Notification[]>([]);

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

  const loadNotifications = async () => {
    try {
      const res = await authFetch(`${apiUrl}/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifications((data.notifications as Record<string, unknown>[]).map(mapNotification));
      }
    } catch {
      // handled
    }
  };

  const markAllRead = async () => {
    try {
      await authFetch(`${apiUrl}/notifications/mark-read`, {
        method: "PATCH",
      });
      onUnreadCountChange(0);
    } catch {
      // handled
    }
  };

  useEffect(() => {
    loadNotifications();
    markAllRead();
  }, []);

  const handleAction = async (id: string, action: "accepted" | "declined") => {
    try {
      const notification = notifications.find((n) => n.id === id);
      const res = await authFetch(`${apiUrl}/notifications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, status: action } : n))
        );
        if (action === "accepted" && notification?.type === "trip_invitation") {
          onTripAccepted?.();
        }
      }
    } catch {
      // handled
    }
  };

  const getNotificationText = (n: Notification) => {
    const displayName = n.fromFirstName
      ? `${n.fromFirstName} ${n.fromLastName}`
      : n.fromUsername ? `@${n.fromUsername}` : "Someone";
    const nameLink = (
      <Link to={`/user/${n.fromUserId}`} className={styles.itemEmail}>
        {displayName}
      </Link>
    );
    if (n.type === "follow_request") {
      return (
        <>
          {nameLink} sent you a friend request
        </>
      );
    }
    if (n.type === "trip_invitation") {
      return (
        <>
          {nameLink} invited you to{" "}
          {n.tripName || "a trip"}
        </>
      );
    }
    return <>{nameLink} sent you a notification</>;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Inbox</span>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          Back
        </button>
      </div>
      {notifications.length === 0 ? (
        <p className={styles.emptyText}>No notifications</p>
      ) : (
        <ul className={styles.list}>
          {notifications.map((n) => (
            <li key={n.id} className={styles.item}>
              <span className={styles.itemText}>
                {getNotificationText(n)}
              </span>
              {n.status === "pending" ? (
                <span className={styles.actions}>
                  <Tooltip label="Accept">
                  <button
                    type="button"
                    className={styles.acceptBtn}
                    onClick={() => handleAction(n.id, "accepted")}
                  >
                    ✓
                  </button>
                  </Tooltip>
                  <Tooltip label="Decline">
                  <button
                    type="button"
                    className={styles.declineBtn}
                    onClick={() => handleAction(n.id, "declined")}
                  >
                    ✕
                  </button>
                  </Tooltip>
                </span>
              ) : (
                <span className={styles.resolvedText}>
                  {n.status === "accepted" ? "Accepted" : "Declined"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default InboxPanel;
