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
        "SELECT id, email, first_name, last_name FROM users WHERE id = $1",
        [userId],
      );
      if (userResult.rows.length === 0) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      const user = userResult.rows[0];

      const followerCount = await db.query(
        "SELECT COUNT(*) FROM follows WHERE following_id = $1 AND status = 'accepted'",
        [userId],
      );
      const followingCount = await db.query(
        "SELECT COUNT(*) FROM follows WHERE follower_id = $1 AND status = 'accepted'",
        [userId],
      );

      res.status(200).json({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        follower_count: parseInt(followerCount.rows[0].count),
        following_count: parseInt(followingCount.rows[0].count),
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

// GET /users/search?email=... - search users by email prefix
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
      const email = req.query.email;
      if (!email || email.length < 2) {
        res.status(200).json({ users: [] });
        return;
      }
      const result: QueryResult<UserSearchResult> = await db.query(
        "SELECT id, email, first_name, last_name FROM users WHERE email ILIKE $1 AND id != $2 LIMIT 5",
        [`${email}%`, userId],
      );
      res.status(200).json({ users: result.rows });
    } catch (err) {
      next(err);
    }
  },
);

// POST /follow/:userId - send follow request
router.post(
  "/follow/:userId",
  ensureLoggedIn,
  async (
    req: TypedRequest<unknown, unknown, UserIdParam>,
    res: TypedResponse<MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const followerId = req.user.id;
      const followingId = req.params.userId;

      if (followerId === followingId) {
        res.status(400).json({ message: "Cannot follow yourself" });
        return;
      }

      // Check if already following or pending
      const existing = await db.query(
        "SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2",
        [followerId, followingId],
      );
      if (existing.rows.length > 0) {
        const status = existing.rows[0].status;
        if (status === "pending") {
          res.status(409).json({ message: "Follow request already pending" });
          return;
        }
        if (status === "accepted") {
          res.status(409).json({ message: "Already following this user" });
          return;
        }
        // If declined, allow re-requesting
        if (status === "declined") {
          const client = await db.connect();
          try {
            await client.query("BEGIN");
            await client.query(
              "UPDATE follows SET status = 'pending', created_at = now() WHERE follower_id = $1 AND following_id = $2",
              [followerId, followingId],
            );
            await client.query(
              "INSERT INTO notifications (user_id, from_user_id, type, reference_id) VALUES ($1, $2, 'follow_request', (SELECT id FROM follows WHERE follower_id = $2 AND following_id = $1))",
              [followingId, followerId],
            );
            await client.query("COMMIT");
          } catch (err) {
            await client.query("ROLLBACK");
            throw err;
          } finally {
            client.release();
          }
          res.status(200).json({ message: "Follow request sent" });
          return;
        }
      }

      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const followResult = await client.query(
          "INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) RETURNING id",
          [followerId, followingId],
        );
        await client.query(
          "INSERT INTO notifications (user_id, from_user_id, type, reference_id) VALUES ($1, $2, 'follow_request', $3)",
          [followingId, followerId, followResult.rows[0].id],
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
      res.status(201).json({ message: "Follow request sent" });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /follow/:userId - unfollow
router.delete(
  "/follow/:userId",
  ensureLoggedIn,
  async (
    req: TypedRequest<unknown, unknown, UserIdParam>,
    res: TypedResponse<MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const followerId = req.user.id;
      const followingId = req.params.userId;
      await db.query(
        "DELETE FROM follows WHERE follower_id = $1 AND following_id = $2",
        [followerId, followingId],
      );
      res.status(200).json({ message: "Unfollowed" });
    } catch (err) {
      next(err);
    }
  },
);

// GET /followers - get my followers (accepted)
router.get(
  "/followers",
  ensureLoggedIn,
  async (
    req: TypedRequest,
    res: TypedResponse<{ followers: FollowUser[] }>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.id;
      const result: QueryResult<FollowUser> = await db.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, f.id as follow_id, f.created_at
         FROM follows f JOIN users u ON f.follower_id = u.id
         WHERE f.following_id = $1 AND f.status = 'accepted'
         ORDER BY f.created_at DESC`,
        [userId],
      );
      res.status(200).json({ followers: result.rows });
    } catch (err) {
      next(err);
    }
  },
);

// GET /following - get who I follow (accepted)
router.get(
  "/following",
  ensureLoggedIn,
  async (
    req: TypedRequest,
    res: TypedResponse<{ following: FollowUser[] }>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.id;
      const result: QueryResult<FollowUser> = await db.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, f.id as follow_id, f.created_at
         FROM follows f JOIN users u ON f.following_id = u.id
         WHERE f.follower_id = $1 AND f.status = 'accepted'
         ORDER BY f.created_at DESC`,
        [userId],
      );
      res.status(200).json({ following: result.rows });
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
        `SELECT n.*, u.email as from_email, u.first_name as from_first_name, u.last_name as from_last_name,
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

export default router;
