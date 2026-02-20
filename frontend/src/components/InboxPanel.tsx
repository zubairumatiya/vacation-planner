import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import refreshFn from "../utils/refreshFn";
import styles from "../styles/InboxPanel.module.css";

const apiUrl = import.meta.env.VITE_API_URL;

interface Notification {
  id: string;
  from_email: string;
  from_first_name: string;
  from_last_name: string;
  type: string;
  status: string;
  is_read: boolean;
  created_at: string;
  trip_name?: string;
}

interface InboxPanelProps {
  onBack: () => void;
  onUnreadCountChange: (count: number) => void;
}

const InboxPanel = ({ onBack, onUnreadCountChange }: InboxPanelProps) => {
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
        setNotifications(data.notifications);
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
      const res = await authFetch(`${apiUrl}/notifications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, status: action } : n))
        );
      }
    } catch {
      // handled
    }
  };

  const getNotificationText = (n: Notification) => {
    const name = n.from_first_name
      ? `${n.from_first_name} ${n.from_last_name}`
      : n.from_email;
    if (n.type === "follow_request") {
      return (
        <>
          <span className={styles.itemEmail}>{name}</span> wants to follow you
        </>
      );
    }
    if (n.type === "trip_invitation") {
      return (
        <>
          <span className={styles.itemEmail}>{name}</span> invited you to{" "}
          {n.trip_name || "a trip"}
        </>
      );
    }
    return <>{name} sent you a notification</>;
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
                  <button
                    type="button"
                    className={styles.acceptBtn}
                    onClick={() => handleAction(n.id, "accepted")}
                    title="Accept"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    className={styles.declineBtn}
                    onClick={() => handleAction(n.id, "declined")}
                    title="Decline"
                  >
                    ✕
                  </button>
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
