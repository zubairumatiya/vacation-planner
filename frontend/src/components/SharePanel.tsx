import { useEffect, useState, useContext, useCallback } from "react";
import { AuthContext } from "../context/AuthContext";
import refreshFn from "../utils/refreshFn";
import styles from "../styles/SharePanel.module.css";

const apiUrl = import.meta.env.VITE_API_URL;

interface Friend {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
}

interface TripShare {
  user_id: string;
  first_name: string;
  last_name: string;
  username: string;
  role: string;
}

interface SharePanelProps {
  tripId: string;
  onClose: () => void;
}

const SharePanel = ({ tripId, onClose }: SharePanelProps) => {
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const login = auth?.login;
  const logout = auth?.logout;
  const refreshInFlightRef = auth?.refreshInFlightRef;
  const loggingOutRef = auth?.loggingOutRef;

  const [friends, setFriends] = useState<Friend[]>([]);
  const [existingShares, setExistingShares] = useState<TripShare[]>([]);
  const [pendingUsers, setPendingUsers] = useState<Set<string>>(new Set());
  const [selectedUsers, setSelectedUsers] = useState<
    Map<string, "reader" | "editor">
  >(new Map());
  const [pendingInvites, setPendingInvites] = useState<Set<string>>(new Set());
  const [hoveredCircleId, setHoveredCircleId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

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
    const load = async () => {
      try {
        const [friendsRes, sharesRes] = await Promise.all([
          authFetch(`${apiUrl}/friends`),
          authFetch(`${apiUrl}/trip-shares/${tripId}`),
        ]);

        let friendsList: Friend[] = [];
        let sharesList: TripShare[] = [];
        let pendingList: TripShare[] = [];

        if (friendsRes.ok) {
          const data = await friendsRes.json();
          friendsList = data.friends;
          setFriends(friendsList);
        }
        if (sharesRes.ok) {
          const data = await sharesRes.json();
          sharesList = data.shares;
          pendingList = data.pendingInvitations ?? [];
          setExistingShares(sharesList);
          setPendingUsers(new Set(pendingList.map((p) => p.user_id)));
        }

        // Pre-populate selections from existing shares
        const initial = new Map<string, "reader" | "editor">();
        for (const share of sharesList) {
          initial.set(
            share.user_id,
            share.role === "editor" ? "editor" : "reader",
          );
        }
        setSelectedUsers(initial);
      } catch {
        // handled
      }
    };
    load();
  }, [tripId, authFetch]);

  const handleFriendClick = (friendId: string) => {
    // Pending and already-selected users can't be toggled via row click
    if (pendingUsers.has(friendId) || selectedUsers.has(friendId)) return;

    // Select
    const isExisting = existingShares.some((s) => s.user_id === friendId);
    setSelectedUsers((prev) => new Map(prev).set(friendId, "reader"));
    if (!isExisting) {
      setPendingInvites((prev) => new Set(prev).add(friendId));
    }
  };

  const handleCircleClick = (e: React.MouseEvent, friendId: string) => {
    e.stopPropagation();

    // Pending users: cancel invitation
    if (pendingUsers.has(friendId)) {
      handleCancelInvitation(friendId);
      return;
    }

    // Selected users: deselect (uninvite)
    if (selectedUsers.has(friendId)) {
      const isExisting = existingShares.some((s) => s.user_id === friendId);
      setSelectedUsers((prev) => {
        const next = new Map(prev);
        next.delete(friendId);
        return next;
      });
      if (!isExisting) {
        setPendingInvites((prev) => {
          const next = new Set(prev);
          next.delete(friendId);
          return next;
        });
      }
    }
  };

  const handleCancelInvitation = async (friendId: string) => {
    try {
      const res = await authFetch(
        `${apiUrl}/cancel-invitation/${tripId}/${friendId}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        setPendingUsers((prev) => {
          const next = new Set(prev);
          next.delete(friendId);
          return next;
        });
      }
    } catch {
      // handled
    }
  };

  const handleRoleToggle = async (
    e: React.MouseEvent,
    friendId: string,
    role: "reader" | "editor",
  ) => {
    e.stopPropagation();
    setSelectedUsers((prev) => new Map(prev).set(friendId, role));

    const isExisting = existingShares.some((s) => s.user_id === friendId);
    if (isExisting) {
      try {
        await authFetch(`${apiUrl}/share-trip/${tripId}/${friendId}`, {
          method: "PATCH",
          body: JSON.stringify({ role }),
        });
      } catch {
        // handled
      }
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      // Send new invitations
      const newShares = Array.from(pendingInvites).map((userId) => ({
        userId,
        role: selectedUsers.get(userId) || ("reader" as "reader" | "editor"),
      }));
      if (newShares.length > 0) {
        await authFetch(`${apiUrl}/share-trip/${tripId}`, {
          method: "POST",
          body: JSON.stringify({ shares: newShares }),
        });
      }

      // Remove access for deselected existing shares
      for (const share of existingShares) {
        if (!selectedUsers.has(share.user_id)) {
          await authFetch(`${apiUrl}/share-trip/${tripId}/${share.user_id}`, {
            method: "DELETE",
          });
        }
      }

      onClose();
    } catch {
      // handled
    } finally {
      setSending(false);
    }
  };

  // Determine if any changes have been made
  const hasChanges = (() => {
    // New invites pending
    if (pendingInvites.size > 0) return true;
    // Existing shares removed
    for (const share of existingShares) {
      if (!selectedUsers.has(share.user_id)) return true;
    }
    // Existing shares with changed roles
    for (const share of existingShares) {
      const currentRole = selectedUsers.get(share.user_id);
      const originalRole = share.role === "editor" ? "editor" : "reader";
      if (currentRole && currentRole !== originalRole) return true;
    }
    return false;
  })();

  const getInitials = (firstName: string, lastName: string) => {
    return `${(firstName?.[0] || "").toUpperCase()}${(lastName?.[0] || "").toUpperCase()}`;
  };

  return (
    <div className={styles.container} onClick={(e) => e.stopPropagation()}>
      <div className={styles.header}>
        <span className={styles.title}>Share Trip</span>
        <button
          type="button"
          className={`${styles.sendBtn} ${!hasChanges || sending ? styles.sendBtnDisabled : ""}`}
          onClick={handleSend}
          disabled={!hasChanges || sending}
          title="Send/update invitations"
        >
          &#10132;
        </button>
      </div>
      {friends.length === 0 ? (
        <p className={styles.emptyText}>No friends to share with</p>
      ) : (
        <div>
          {friends.map((friend) => {
            const isPending = pendingUsers.has(friend.id);
            const isSelected = selectedUsers.has(friend.id);
            const isCircleHovered = hoveredCircleId === friend.id;
            const role = selectedUsers.get(friend.id);

            return (
              <div
                key={friend.id}
                className={`${styles.friendRow} ${isPending ? styles.friendRowPending : ""}`}
                onClick={() => handleFriendClick(friend.id)}
              >
                <div
                  className={`${styles.initialsCircle} ${
                    (isPending || isSelected) && isCircleHovered
                      ? styles.initialsCircleRemove
                      : isPending
                        ? styles.initialsCirclePending
                        : isSelected
                          ? styles.initialsCircleSelected
                          : ""
                  }`}
                  onClick={(e) => handleCircleClick(e, friend.id)}
                  onMouseEnter={() => setHoveredCircleId(friend.id)}
                  onMouseLeave={() => setHoveredCircleId(null)}
                >
                  {isPending && isCircleHovered
                    ? "✕"
                    : isPending
                      ? "?"
                      : isSelected && isCircleHovered
                        ? "✕"
                        : isSelected
                          ? "✓"
                          : getInitials(friend.first_name, friend.last_name)}
                </div>
                <div className={styles.nameBlock}>
                  <div
                    className={`${styles.name} ${isPending ? styles.namePending : ""}`}
                  >
                    {friend.first_name} {friend.last_name}
                  </div>
                  <div className={styles.username}>
                    {isPending ? "Pending" : `@${friend.username}`}
                  </div>
                </div>
                {isSelected && !isPending && (
                  <div className={styles.roleToggle}>
                    <button
                      type="button"
                      className={`${styles.roleBtn} ${role === "reader" ? styles.roleBtnActive : ""}`}
                      onClick={(e) => handleRoleToggle(e, friend.id, "reader")}
                    >
                      Viewer
                    </button>
                    <button
                      type="button"
                      className={`${styles.roleBtn} ${role === "editor" ? styles.roleBtnActive : ""}`}
                      onClick={(e) => handleRoleToggle(e, friend.id, "editor")}
                    >
                      Editor
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SharePanel;
