import express, { NextFunction } from "express";
const router = express.Router();
import db from "../db/db.js";
import ensureLoggedIn from "../middleware/ensureLoggedIn.js";
import { QueryResult } from "pg";
import {
  TypedRequest,
  TypedResponse,
  MessageResponse,
  ProfileResponse,
  UserSearchResult,
  FollowUser,
  Notification,
  NotificationActionBody,
  UserIdParam,
  NotificationIdParam,
  SearchQuery,
  User,
  AuthResponse,
  UserProfileResponse,
  UserPublicTrip,
  TripIdParam,
  ShareTripBody,
  UpdateShareBody,
  TripShare,
} from "../types/express.js";

// GET /profile - get current user's profile
router.get(
  "/profile",
  ensureLoggedIn,
  async (
    req: TypedRequest,
    res: TypedResponse<ProfileResponse | MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.id;
      const userResult: QueryResult<User> = await db.query(
        "SELECT id, email, first_name, last_name, username FROM users WHERE id = $1",
        [userId],
      );
      if (userResult.rows.length === 0) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      const user = userResult.rows[0];

      const friendsCount = await db.query(
        "SELECT COUNT(*) FROM follows WHERE (requester_id = $1 OR receiver_id = $1) AND status = 'accepted'",
        [userId],
      );

      res.status(200).json({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        friends_count: parseInt(friendsCount.rows[0].count),
      });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /profile - delete account
router.delete(
  "/profile",
  ensureLoggedIn,
  async (
    req: TypedRequest,
    res: TypedResponse<MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.id;
      await db.query("DELETE FROM users WHERE id = $1", [userId]);
      res.status(200).json({ message: "Account deleted" });
    } catch (err) {
      next(err);
    }
  },
);

// GET /users/search?q=... - search users by name or username
router.get(
  "/users/search",
  ensureLoggedIn,
  async (
    req: TypedRequest<unknown, SearchQuery>,
    res: TypedResponse<{ users: UserSearchResult[] }>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.id;
      const q = req.query.q;
      if (!q || q.length < 2) {
        res.status(200).json({ users: [] });
        return;
      }
      const result: QueryResult<UserSearchResult> = await db.query(
        `SELECT id, first_name, last_name, username FROM users
         WHERE (username ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1
                OR (first_name || ' ' || last_name) ILIKE $1)
           AND id != $2
         LIMIT 5`,
        [`${q}%`, userId],
      );
      res.status(200).json({ users: result.rows });
    } catch (err) {
      next(err);
    }
  },
);

// POST /follow/:userId - send friend request
router.post(
  "/follow/:userId",
  ensureLoggedIn,
  async (
    req: TypedRequest<unknown, unknown, UserIdParam>,
    res: TypedResponse<MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const requesterId = req.user.id;
      const receiverId = req.params.userId;

      if (requesterId === receiverId) {
        res.status(400).json({ message: "Cannot send friend request to yourself" });
        return;
      }

      // Check if friendship already exists in either direction
      const existing = await db.query(
        "SELECT * FROM follows WHERE (requester_id = $1 AND receiver_id = $2) OR (requester_id = $2 AND receiver_id = $1)",
        [requesterId, receiverId],
      );
      if (existing.rows.length > 0) {
        const status = existing.rows[0].status;
        if (status === "pending") {
          res.status(409).json({ message: "Friend request already pending" });
          return;
        }
        if (status === "accepted") {
          res.status(409).json({ message: "Already friends with this user" });
          return;
        }
        // If declined, allow re-requesting
        if (status === "declined") {
          const client = await db.connect();
          try {
            await client.query("BEGIN");
            await client.query(
              "UPDATE follows SET requester_id = $1, receiver_id = $2, status = 'pending', created_at = now() WHERE id = $3",
              [requesterId, receiverId, existing.rows[0].id],
            );
            await client.query(
              "INSERT INTO notifications (user_id, from_user_id, type, reference_id) VALUES ($1, $2, 'follow_request', $3)",
              [receiverId, requesterId, existing.rows[0].id],
            );
            await client.query("COMMIT");
          } catch (err) {
            await client.query("ROLLBACK");
            throw err;
          } finally {
            client.release();
          }
          res.status(200).json({ message: "Friend request sent" });
          return;
        }
      }

      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const followResult = await client.query(
          "INSERT INTO follows (requester_id, receiver_id) VALUES ($1, $2) RETURNING id",
          [requesterId, receiverId],
        );
        await client.query(
          "INSERT INTO notifications (user_id, from_user_id, type, reference_id) VALUES ($1, $2, 'follow_request', $3)",
          [receiverId, requesterId, followResult.rows[0].id],
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
      res.status(201).json({ message: "Friend request sent" });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /follow/:userId - remove friend
router.delete(
  "/follow/:userId",
  ensureLoggedIn,
  async (
    req: TypedRequest<unknown, unknown, UserIdParam>,
    res: TypedResponse<MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.id;
      const friendId = req.params.userId;
      await db.query(
        "DELETE FROM follows WHERE (requester_id = $1 AND receiver_id = $2) OR (requester_id = $2 AND receiver_id = $1)",
        [userId, friendId],
      );
      res.status(200).json({ message: "Friend removed" });
    } catch (err) {
      next(err);
    }
  },
);

// GET /friends - get all friends (accepted)
router.get(
  "/friends",
  ensureLoggedIn,
  async (
    req: TypedRequest,
    res: TypedResponse<{ friends: FollowUser[] }>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.id;
      const result: QueryResult<FollowUser> = await db.query(
        `SELECT u.id, u.first_name, u.last_name, u.username, f.id as follow_id, f.created_at
         FROM follows f
         JOIN users u ON (CASE WHEN f.requester_id = $1 THEN f.receiver_id ELSE f.requester_id END) = u.id
         WHERE (f.requester_id = $1 OR f.receiver_id = $1) AND f.status = 'accepted'
         ORDER BY f.created_at DESC`,
        [userId],
      );
      res.status(200).json({ friends: result.rows });
    } catch (err) {
      next(err);
    }
  },
);

// GET /notifications - get all notifications
router.get(
  "/notifications",
  ensureLoggedIn,
  async (
    req: TypedRequest,
    res: TypedResponse<{ notifications: Notification[] }>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.id;
      const result: QueryResult<Notification> = await db.query(
        `SELECT n.*, u.first_name as from_first_name, u.last_name as from_last_name, u.username as from_username,
                t.trip_name
         FROM notifications n
         JOIN users u ON n.from_user_id = u.id
         LEFT JOIN trips t ON n.type = 'trip_invitation' AND n.reference_id = t.id
         WHERE n.user_id = $1
         ORDER BY n.created_at DESC`,
        [userId],
      );
      res.status(200).json({ notifications: result.rows });
    } catch (err) {
      next(err);
    }
  },
);

// GET /notifications/unread-count
router.get(
  "/notifications/unread-count",
  ensureLoggedIn,
  async (
    req: TypedRequest,
    res: TypedResponse<{ count: number }>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.id;
      const result = await db.query(
        "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false",
        [userId],
      );
      res.status(200).json({ count: parseInt(result.rows[0].count) });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /notifications/mark-read - mark all as read
router.patch(
  "/notifications/mark-read",
  ensureLoggedIn,
  async (
    req: TypedRequest,
    res: TypedResponse<MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.id;
      await db.query(
        "UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false",
        [userId],
      );
      res.status(200).json({ message: "Marked as read" });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /notifications/:id - accept or decline
router.patch(
  "/notifications/:id",
  ensureLoggedIn,
  async (
    req: TypedRequest<NotificationActionBody, unknown, NotificationIdParam>,
    res: TypedResponse<MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.id;
      const notificationId = req.params.id;
      const { action } = req.body;

      if (!action || !["accepted", "declined"].includes(action)) {
        res.status(400).json({ message: "Invalid action" });
        return;
      }

      // Verify notification belongs to user
      const notif = await db.query(
        "SELECT * FROM notifications WHERE id = $1 AND user_id = $2",
        [notificationId, userId],
      );
      if (notif.rows.length === 0) {
        res.status(404).json({ message: "Notification not found" });
        return;
      }

      const notification = notif.rows[0];

      const client = await db.connect();
      try {
        await client.query("BEGIN");

        // Update notification
        await client.query(
          "UPDATE notifications SET status = $1, is_read = true WHERE id = $2",
          [action, notificationId],
        );

        // If follow request, update follows table
        if (notification.type === "follow_request" && notification.reference_id) {
          await client.query(
            "UPDATE follows SET status = $1 WHERE id = $2",
            [action, notification.reference_id],
          );
        }

        // If trip invitation and accepted, add user to trip
        if (notification.type === "trip_invitation" && action === "accepted" && notification.reference_id) {
          await client.query(
            "INSERT INTO user_trips (user_id, trip_id, role) VALUES ($1, $2, 'reader') ON CONFLICT DO NOTHING",
            [userId, notification.reference_id],
          );
        }

        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }

      res.status(200).json({ message: `Notification ${action}` });
    } catch (err) {
      next(err);
    }
  },
);

// GET /users/:userId/profile - view another user's profile (privacy-aware)
router.get(
  "/users/:userId/profile",
  ensureLoggedIn,
  async (
    req: TypedRequest<unknown, unknown, UserIdParam>,
    res: TypedResponse<UserProfileResponse | MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const viewerId = req.user.id;
      const targetId = req.params.userId;

      // Get basic user info
      const userResult = await db.query(
        "SELECT id, first_name, last_name, username FROM users WHERE id = $1",
        [targetId],
      );
      if (userResult.rows.length === 0) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      const user = userResult.rows[0];

      // Check friendship status
      const friendResult = await db.query(
        "SELECT status FROM follows WHERE (requester_id = $1 AND receiver_id = $2) OR (requester_id = $2 AND receiver_id = $1)",
        [viewerId, targetId],
      );

      const followRow = friendResult.rows[0];
      const isFriend = followRow?.status === "accepted";
      const isPending = followRow?.status === "pending";

      // Non-friend: limited response
      if (!isFriend) {
        res.status(200).json({
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          is_friend: false,
          is_pending: isPending,
        });
        return;
      }

      // Friend: full response with public trips and friend count
      const [tripsResult, friendsCountResult] = await Promise.all([
        db.query<UserPublicTrip>(
          `SELECT t.trip_name, t.location, t.start_date,
                  (t.end_date - t.start_date) AS num_days
           FROM user_trips ut
           JOIN trips t ON t.id = ut.trip_id
           WHERE ut.user_id = $1 AND ut.role = 'owner'
             AND t.is_public = true AND t.end_date >= CURRENT_DATE
           ORDER BY t.start_date ASC`,
          [targetId],
        ),
        db.query(
          "SELECT COUNT(*) FROM follows WHERE (requester_id = $1 OR receiver_id = $1) AND status = 'accepted'",
          [targetId],
        ),
      ]);

      res.status(200).json({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        is_friend: true,
        is_pending: false,
        friends_count: parseInt(friendsCountResult.rows[0].count),
        upcoming_trips: tripsResult.rows,
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /trip-shares/:tripId - get existing shares and pending invitations (owner only)
router.get(
  "/trip-shares/:tripId",
  ensureLoggedIn,
  async (
    req: TypedRequest<unknown, unknown, TripIdParam>,
    res: TypedResponse<{ shares: TripShare[]; pendingInvitations: TripShare[] } | MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const ownerCheck = await db.query(
        "SELECT role FROM user_trips WHERE trip_id = $1 AND user_id = $2 AND role = 'owner'",
        [req.params.tripId, req.user.id],
      );
      if (ownerCheck.rows.length === 0) {
        res.sendStatus(403);
        return;
      }
      const [sharesResult, pendingResult] = await Promise.all([
        db.query<TripShare>(
          `SELECT u.id as user_id, u.first_name, u.last_name, u.username, ut.role
           FROM user_trips ut
           JOIN users u ON u.id = ut.user_id
           WHERE ut.trip_id = $1 AND ut.role != 'owner'`,
          [req.params.tripId],
        ),
        db.query<TripShare>(
          `SELECT u.id as user_id, u.first_name, u.last_name, u.username, 'pending' as role
           FROM notifications n
           JOIN users u ON u.id = n.user_id
           WHERE n.from_user_id = $1 AND n.type = 'trip_invitation'
             AND n.reference_id = $2 AND n.status = 'pending'`,
          [req.user.id, req.params.tripId],
        ),
      ]);
      res.status(200).json({
        shares: sharesResult.rows,
        pendingInvitations: pendingResult.rows,
      });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /cancel-invitation/:tripId/:userId - cancel a pending trip invitation (owner only)
router.delete(
  "/cancel-invitation/:tripId/:userId",
  ensureLoggedIn,
  async (
    req: TypedRequest<unknown, unknown, TripIdParam & UserIdParam>,
    res: TypedResponse<MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const ownerCheck = await db.query(
        "SELECT role FROM user_trips WHERE trip_id = $1 AND user_id = $2 AND role = 'owner'",
        [req.params.tripId, req.user.id],
      );
      if (ownerCheck.rows.length === 0) {
        res.sendStatus(403);
        return;
      }

      await db.query(
        `DELETE FROM notifications
         WHERE user_id = $1 AND from_user_id = $2
           AND type = 'trip_invitation' AND reference_id = $3
           AND status = 'pending'`,
        [req.params.userId, req.user.id, req.params.tripId],
      );
      res.status(200).json({ message: "Invitation cancelled" });
    } catch (err) {
      next(err);
    }
  },
);

// POST /share-trip/:tripId - send share invitations (owner only)
router.post(
  "/share-trip/:tripId",
  ensureLoggedIn,
  async (
    req: TypedRequest<ShareTripBody, unknown, TripIdParam>,
    res: TypedResponse<MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const ownerCheck = await db.query(
        "SELECT role FROM user_trips WHERE trip_id = $1 AND user_id = $2 AND role = 'owner'",
        [req.params.tripId, req.user.id],
      );
      if (ownerCheck.rows.length === 0) {
        res.sendStatus(403);
        return;
      }

      const client = await db.connect();
      try {
        await client.query("BEGIN");
        for (const share of req.body.shares) {
          const existing = await client.query(
            "SELECT role FROM user_trips WHERE trip_id = $1 AND user_id = $2",
            [req.params.tripId, share.userId],
          );
          if (existing.rows.length > 0) continue;

          const pendingNotif = await client.query(
            `SELECT id FROM notifications
             WHERE user_id = $1 AND from_user_id = $2
               AND type = 'trip_invitation' AND reference_id = $3
               AND status = 'pending'`,
            [share.userId, req.user.id, req.params.tripId],
          );
          if (pendingNotif.rows.length > 0) continue;

          await client.query(
            "INSERT INTO notifications (user_id, from_user_id, type, reference_id) VALUES ($1, $2, 'trip_invitation', $3)",
            [share.userId, req.user.id, req.params.tripId],
          );
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
      res.status(200).json({ message: "Invitations sent" });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /share-trip/:tripId/:userId - update share permission (owner only)
router.patch(
  "/share-trip/:tripId/:userId",
  ensureLoggedIn,
  async (
    req: TypedRequest<UpdateShareBody, unknown, TripIdParam & UserIdParam>,
    res: TypedResponse<MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const ownerCheck = await db.query(
        "SELECT role FROM user_trips WHERE trip_id = $1 AND user_id = $2 AND role = 'owner'",
        [req.params.tripId, req.user.id],
      );
      if (ownerCheck.rows.length === 0) {
        res.sendStatus(403);
        return;
      }

      const result = await db.query(
        "UPDATE user_trips SET role = $1 WHERE trip_id = $2 AND user_id = $3 AND role != 'owner' RETURNING *",
        [req.body.role, req.params.tripId, req.params.userId],
      );
      if (result.rowCount === 0) {
        res.sendStatus(404);
        return;
      }
      res.status(200).json({ message: "Permission updated" });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /share-trip/:tripId/:userId - remove user's access (owner only)
router.delete(
  "/share-trip/:tripId/:userId",
  ensureLoggedIn,
  async (
    req: TypedRequest<unknown, unknown, TripIdParam & UserIdParam>,
    res: TypedResponse<MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const ownerCheck = await db.query(
        "SELECT role FROM user_trips WHERE trip_id = $1 AND user_id = $2 AND role = 'owner'",
        [req.params.tripId, req.user.id],
      );
      if (ownerCheck.rows.length === 0) {
        res.sendStatus(403);
        return;
      }

      await db.query(
        "DELETE FROM user_trips WHERE trip_id = $1 AND user_id = $2 AND role != 'owner'",
        [req.params.tripId, req.params.userId],
      );
      res.status(200).json({ message: "Access removed" });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
