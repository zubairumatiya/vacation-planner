import express, { NextFunction } from "express";
const router = express.Router();
import db from "../db/db.js";
import ensureLoggedIn from "../middleware/ensureLoggedIn.js";
import { QueryResult } from "pg";
import { snakeToCamel } from "../helpers/snakeToCamel.js";
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
  Country,
  UserCountry,
  TravelLogResponse,
  AddCountryBody,
  UpdateVisibilityBody,
  CountryIdParam,
  UserCountryIdParam,
  PlaceIdParam,
  CountryPlace,
  AddPlaceBody,
  UpdatePlaceBody,
  CountryDetailResponse,
  FeedTrip,
  FeedTravelLog,
  FriendsFeedResponse,
  FriendCountryLog,
  FriendCountryLogsResponse,
  CountryNameParam,
} from "../types/app-types.js";

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
        "SELECT id, email, first_name, last_name, username, avatar FROM users WHERE id = $1",
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
        avatar: user.avatar,
        friends_count: parseInt(friendsCount.rows[0].count),
      });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /profile/avatar - update avatar
router.patch(
  "/profile/avatar",
  ensureLoggedIn,
  async (
    req: TypedRequest<{ avatar: string | null }>,
    res: TypedResponse<MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.id;
      const { avatar } = req.body;
      await db.query("UPDATE users SET avatar = $1 WHERE id = $2", [
        avatar || null,
        userId,
      ]);
      res.status(200).json({ message: "Avatar updated" });
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
        `SELECT id, first_name, last_name, username, avatar FROM users
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
        `SELECT u.id, u.first_name, u.last_name, u.username, u.avatar, f.id as follow_id, f.created_at
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

// GET /friends/feed - get upcoming public trips and recent travel logs from friends
router.get(
  "/friends/feed",
  ensureLoggedIn,
  async (
    req: TypedRequest,
    res: TypedResponse<FriendsFeedResponse>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.id;

      const tripsQuery = await db.query<FeedTrip>(
        `SELECT DISTINCT ON (t.start_date, t.id)
                t.id, t.trip_name, t.location, t.start_date, t.end_date, t.is_public, t.is_open_invite,
                u.id as owner_id, u.first_name as owner_first_name, u.last_name as owner_last_name,
                u.username as owner_username,
                u.avatar as owner_avatar,
                ut_me.role as my_role
         FROM trips t
         JOIN user_trips ut_owner ON ut_owner.trip_id = t.id AND ut_owner.role = 'owner'
         JOIN users u ON u.id = ut_owner.user_id
         LEFT JOIN follows f ON ((f.requester_id = $1 AND f.receiver_id = u.id) OR (f.receiver_id = $1 AND f.requester_id = u.id)) AND f.status = 'accepted'
         LEFT JOIN user_trips ut_me ON ut_me.trip_id = t.id AND ut_me.user_id = $1
         WHERE (
            (t.is_public = true AND f.id IS NOT NULL)
            OR
            (ut_me.user_id = $1 AND ut_me.role IN ('editor', 'reader'))
         )
         AND t.end_date >= CURRENT_DATE
         AND ut_owner.user_id != $1
         ORDER BY t.start_date ASC, t.id ASC`,
        [userId],
      );

      const travelLogsQuery = await db.query<FeedTravelLog>(
        `SELECT uc.id, c.name as country_name, uc.created_at, uc.visibility,
                u.id as user_id, u.first_name as user_first_name, u.last_name as user_last_name,
                u.username as user_username,
                u.avatar as user_avatar,
                EXTRACT(DAY FROM CURRENT_TIMESTAMP - uc.created_at)::int as days_ago
         FROM user_countries uc
         JOIN countries c ON c.id = uc.country_id
         JOIN users u ON u.id = uc.user_id
         JOIN follows f ON ((f.requester_id = $1 AND f.receiver_id = u.id) OR (f.receiver_id = $1 AND f.requester_id = u.id)) AND f.status = 'accepted'
         WHERE uc.visibility IN ('public', 'friends')
         AND uc.user_id != $1
         ORDER BY uc.created_at DESC`,
        [userId],
      );

      const trips = tripsQuery.rows;
      const travelLogs = travelLogsQuery.rows;

      snakeToCamel(trips);
      snakeToCamel(travelLogs);

      res.status(200).json({
        trips,
        travelLogs,
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /friends/country-logs/:countryName - get friends' travel logs for a specific country
router.get(
  "/friends/country-logs/:countryName",
  ensureLoggedIn,
  async (
    req: TypedRequest<unknown, unknown, CountryNameParam>,
    res: TypedResponse<FriendCountryLogsResponse>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.id;
      const countryName = decodeURIComponent(req.params.countryName);

      const result: QueryResult<FriendCountryLog> = await db.query(
        `SELECT
          uc.id AS user_country_id,
          uc.visit_date,
          uc.num_days,
          u.id AS user_id,
          u.username,
          u.first_name,
          u.last_name,
          u.avatar,
          COUNT(cp.id)::int AS places_count
        FROM user_countries uc
        JOIN countries c ON c.id = uc.country_id
        JOIN users u ON u.id = uc.user_id
        JOIN follows f ON (
          (f.requester_id = $1 AND f.receiver_id = u.id)
          OR (f.receiver_id = $1 AND f.requester_id = u.id)
        ) AND f.status = 'accepted'
        LEFT JOIN country_places cp ON cp.user_country_id = uc.id
        WHERE LOWER(c.name) = LOWER($2)
          AND uc.visibility IN ('public', 'friends')
          AND uc.user_id != $1
        GROUP BY uc.id, u.id
        ORDER BY uc.visit_date DESC NULLS LAST, uc.created_at DESC`,
        [userId, countryName],
      );

      const friends = result.rows;
      snakeToCamel(friends);

      res.status(200).json({ friends });
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

        // If trip invitation and accepted, add user to trip with the role stored in metadata
        if (notification.type === "trip_invitation" && action === "accepted" && notification.reference_id) {
          const invitedRole = notification.metadata?.role === "editor" ? "editor" : "reader";
          await client.query(
            "INSERT INTO user_trips (user_id, trip_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
            [userId, notification.reference_id, invitedRole],
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
        "SELECT id, first_name, last_name, username, avatar FROM users WHERE id = $1",
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
          avatar: user.avatar,
          is_friend: false,
          is_pending: isPending,
        });
        return;
      }

      // Friend: full response with public trips and travel log
      const [tripsResult, travelLogResult] = await Promise.all([
        db.query<UserPublicTrip>(
          `SELECT t.trip_name, t.location, t.start_date,
                  (t.end_date - t.start_date) AS num_days,
                  t.is_open_invite
           FROM user_trips ut
           JOIN trips t ON t.id = ut.trip_id
           WHERE ut.user_id = $1 AND ut.role = 'owner'
             AND t.is_public = true AND t.end_date >= CURRENT_DATE
           ORDER BY t.start_date ASC`,
          [targetId],
        ),
        db.query<UserCountry>(
          `SELECT uc.id, uc.country_id, c.name AS country_name, c.continent, uc.visibility, uc.visit_date, uc.num_days
           FROM user_countries uc
           JOIN countries c ON c.id = uc.country_id
           WHERE uc.user_id = $1 AND uc.visibility IN ('public', 'friends')
           ORDER BY c.continent, c.name`,
          [targetId],
        ),
      ]);

      res.status(200).json({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        avatar: user.avatar,
        is_friend: true,
        is_pending: false,
        upcoming_trips: tripsResult.rows,
        travel_log: travelLogResult.rows,
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

          const intendedRole = share.role === "editor" ? "editor" : "reader";
          await client.query(
            "INSERT INTO notifications (user_id, from_user_id, type, reference_id, metadata) VALUES ($1, $2, 'trip_invitation', $3, $4)",
            [share.userId, req.user.id, req.params.tripId, JSON.stringify({ role: intendedRole })],
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

// GET /countries/search?q=... - search countries for autocomplete
router.get(
  "/countries/search",
  ensureLoggedIn,
  async (
    req: TypedRequest<unknown, SearchQuery>,
    res: TypedResponse<{ countries: Country[] }>,
    next: NextFunction,
  ) => {
    try {
      const q = req.query.q;
      if (!q || q.length < 1) {
        res.status(200).json({ countries: [] });
        return;
      }
      const result: QueryResult<Country> = await db.query(
        "SELECT id, name, continent FROM countries WHERE name ILIKE $1 ORDER BY name LIMIT 10",
        [`${q}%`],
      );
      res.status(200).json({ countries: result.rows });
    } catch (err) {
      next(err);
    }
  },
);

// GET /travel-log - get current user's travel log
router.get(
  "/travel-log",
  ensureLoggedIn,
  async (
    req: TypedRequest,
    res: TypedResponse<TravelLogResponse>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.id;
      const result: QueryResult<UserCountry> = await db.query(
        `SELECT uc.id, uc.country_id, c.name AS country_name, c.continent, uc.visibility, uc.visit_date, uc.num_days
         FROM user_countries uc
         JOIN countries c ON c.id = uc.country_id
         WHERE uc.user_id = $1
         ORDER BY c.continent, c.name`,
        [userId],
      );
      res.status(200).json({ countries: result.rows });
    } catch (err) {
      next(err);
    }
  },
);

// GET /travel-log/:userId - get another user's travel log (filtered by visibility)
router.get(
  "/travel-log/:userId",
  ensureLoggedIn,
  async (
    req: TypedRequest<unknown, unknown, UserIdParam>,
    res: TypedResponse<TravelLogResponse>,
    next: NextFunction,
  ) => {
    try {
      const viewerId = req.user.id;
      const targetId = req.params.userId;

      // Check if friends
      const friendResult = await db.query(
        "SELECT status FROM follows WHERE (requester_id = $1 AND receiver_id = $2) OR (requester_id = $2 AND receiver_id = $1)",
        [viewerId, targetId],
      );
      const isFriend = friendResult.rows[0]?.status === "accepted";

      let result: QueryResult<UserCountry>;
      if (isFriend) {
        // Friends can see public and friends-only countries
        result = await db.query(
          `SELECT uc.id, uc.country_id, c.name AS country_name, c.continent, uc.visibility, uc.visit_date, uc.num_days
           FROM user_countries uc
           JOIN countries c ON c.id = uc.country_id
           WHERE uc.user_id = $1 AND uc.visibility IN ('public', 'friends')
           ORDER BY c.continent, c.name`,
          [targetId],
        );
      } else {
        // Non-friends see nothing
        result = { rows: [] } as unknown as QueryResult<UserCountry>;
      }
      res.status(200).json({ countries: result.rows });
    } catch (err) {
      next(err);
    }
  },
);

// POST /travel-log - add a country to travel log
router.post(
  "/travel-log",
  ensureLoggedIn,
  async (
    req: TypedRequest<AddCountryBody>,
    res: TypedResponse<{ country: UserCountry } | MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.id;
      const { countryId, visitDate, numDays } = req.body;

      // Normalize month-only date (YYYY-MM) to first of month
      const normalizedDate = visitDate
        ? visitDate.length === 7 ? `${visitDate}-01` : visitDate
        : null;

      // Verify country exists
      const countryCheck = await db.query(
        "SELECT id, name, continent FROM countries WHERE id = $1",
        [countryId],
      );
      if (countryCheck.rows.length === 0) {
        res.status(400).json({ message: "Invalid country" });
        return;
      }

      const result = await db.query(
        `INSERT INTO user_countries (user_id, country_id, visit_date, num_days)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, country_id) DO NOTHING
         RETURNING id, country_id, visibility, visit_date, num_days`,
        [userId, countryId, normalizedDate, numDays || null],
      );

      if (result.rows.length === 0) {
        res.status(409).json({ message: "Country already in travel log" });
        return;
      }

      const country = countryCheck.rows[0];
      res.status(201).json({
        country: {
          id: result.rows[0].id,
          country_id: country.id,
          country_name: country.name,
          continent: country.continent,
          visibility: result.rows[0].visibility,
          visit_date: result.rows[0].visit_date,
          num_days: result.rows[0].num_days,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /travel-log/:countryId - update visibility, visit date, or num days
router.patch(
  "/travel-log/:countryId",
  ensureLoggedIn,
  async (
    req: TypedRequest<UpdateVisibilityBody, unknown, CountryIdParam>,
    res: TypedResponse<MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.id;
      const { visibility, visitDate, numDays } = req.body;

      const sets: string[] = [];
      const vals: unknown[] = [];
      let idx = 1;

      if (visibility !== undefined) {
        if (!["public", "friends", "private"].includes(visibility)) {
          res.status(400).json({ message: "Invalid visibility" });
          return;
        }
        sets.push(`visibility = $${idx++}`);
        vals.push(visibility);
      }

      if (visitDate !== undefined) {
        sets.push(`visit_date = $${idx++}`);
        const normalizedDate = visitDate
          ? visitDate.length === 7 ? `${visitDate}-01` : visitDate
          : null;
        vals.push(normalizedDate);
      }

      if (numDays !== undefined) {
        sets.push(`num_days = $${idx++}`);
        vals.push(numDays);
      }

      if (sets.length === 0) {
        res.status(400).json({ message: "No fields to update" });
        return;
      }

      vals.push(req.params.countryId, userId);
      const result = await db.query(
        `UPDATE user_countries SET ${sets.join(", ")} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
        vals,
      );
      if (result.rowCount === 0) {
        res.sendStatus(404);
        return;
      }
      res.status(200).json({ message: "Updated" });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /travel-log/:countryId - remove country from travel log
router.delete(
  "/travel-log/:countryId",
  ensureLoggedIn,
  async (
    req: TypedRequest<unknown, unknown, CountryIdParam>,
    res: TypedResponse<MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.id;
      await db.query(
        "DELETE FROM user_countries WHERE id = $1 AND user_id = $2",
        [req.params.countryId, userId],
      );
      res.status(200).json({ message: "Country removed" });
    } catch (err) {
      next(err);
    }
  },
);

// GET /travel-log/:userCountryId/detail - get country detail with places (privacy-aware)
router.get(
  "/travel-log/:userCountryId/detail",
  ensureLoggedIn,
  async (
    req: TypedRequest<unknown, unknown, UserCountryIdParam>,
    res: TypedResponse<CountryDetailResponse | MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const viewerId = req.user.id;
      const userCountryId = req.params.userCountryId;

      // Get the user_country with user info and country name
      const ucResult = await db.query(
        `SELECT uc.id, uc.user_id, uc.country_id, c.name AS country_name, c.continent,
                uc.visibility, uc.visit_date, uc.num_days,
                u.first_name, u.last_name
         FROM user_countries uc
         JOIN countries c ON c.id = uc.country_id
         JOIN users u ON u.id = uc.user_id
         WHERE uc.id = $1`,
        [userCountryId],
      );

      if (ucResult.rows.length === 0) {
        res.status(404).json({ message: "Country not found" });
        return;
      }

      const uc = ucResult.rows[0];
      const isOwner = uc.user_id === viewerId;

      // If not owner, check friendship and visibility
      if (!isOwner) {
        if (uc.visibility === "private") {
          res.status(403).json({ message: "Access denied" });
          return;
        }
        const friendCheck = await db.query(
          "SELECT status FROM follows WHERE (requester_id = $1 AND receiver_id = $2) OR (requester_id = $2 AND receiver_id = $1)",
          [viewerId, uc.user_id],
        );
        if (friendCheck.rows[0]?.status !== "accepted") {
          res.status(403).json({ message: "Access denied" });
          return;
        }
      }

      // Get places
      const placesResult: QueryResult<CountryPlace> = await db.query(
        `SELECT * FROM country_places WHERE user_country_id = $1 ORDER BY category, sort_index, created_at`,
        [userCountryId],
      );

      res.status(200).json({
        userCountry: uc,
        places: placesResult.rows,
        isOwner,
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /travel-log/:userCountryId/places - add a place (owner only)
router.post(
  "/travel-log/:userCountryId/places",
  ensureLoggedIn,
  async (
    req: TypedRequest<AddPlaceBody, unknown, UserCountryIdParam>,
    res: TypedResponse<{ place: CountryPlace } | MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.id;
      const { category, name } = req.body;

      if (!category || !name || !["city", "eat", "stay", "excursion"].includes(category)) {
        res.status(400).json({ message: "Invalid category or name" });
        return;
      }

      // Verify ownership
      const ucCheck = await db.query(
        "SELECT id FROM user_countries WHERE id = $1 AND user_id = $2",
        [req.params.userCountryId, userId],
      );
      if (ucCheck.rows.length === 0) {
        res.status(403).json({ message: "Not authorized" });
        return;
      }

      const result: QueryResult<CountryPlace> = await db.query(
        `INSERT INTO country_places (user_country_id, category, name)
         VALUES ($1, $2, $3) RETURNING *`,
        [req.params.userCountryId, category, name.trim()],
      );

      res.status(201).json({ place: result.rows[0] });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /travel-log/places/:placeId - update a place (owner only)
router.patch(
  "/travel-log/places/:placeId",
  ensureLoggedIn,
  async (
    req: TypedRequest<UpdatePlaceBody, unknown, PlaceIdParam>,
    res: TypedResponse<{ place: CountryPlace } | MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.id;

      // Verify ownership through join
      const ownerCheck = await db.query(
        `SELECT cp.id FROM country_places cp
         JOIN user_countries uc ON uc.id = cp.user_country_id
         WHERE cp.id = $1 AND uc.user_id = $2`,
        [req.params.placeId, userId],
      );
      if (ownerCheck.rows.length === 0) {
        res.status(403).json({ message: "Not authorized" });
        return;
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (req.body.isFavorite !== undefined) {
        updates.push(`is_favorite = $${paramIndex++}`);
        values.push(req.body.isFavorite);
      }
      if (req.body.isPuke !== undefined) {
        updates.push(`is_puke = $${paramIndex++}`);
        values.push(req.body.isPuke);
      }
      if (req.body.note !== undefined) {
        updates.push(`note = $${paramIndex++}`);
        values.push(req.body.note);
      }

      if (updates.length === 0) {
        res.status(400).json({ message: "No fields to update" });
        return;
      }

      values.push(req.params.placeId);
      const result: QueryResult<CountryPlace> = await db.query(
        `UPDATE country_places SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
        values,
      );

      res.status(200).json({ place: result.rows[0] });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /travel-log/places/:placeId - delete a place (owner only)
router.delete(
  "/travel-log/places/:placeId",
  ensureLoggedIn,
  async (
    req: TypedRequest<unknown, unknown, PlaceIdParam>,
    res: TypedResponse<MessageResponse>,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user.id;

      // Verify ownership through join
      const ownerCheck = await db.query(
        `SELECT cp.id FROM country_places cp
         JOIN user_countries uc ON uc.id = cp.user_country_id
         WHERE cp.id = $1 AND uc.user_id = $2`,
        [req.params.placeId, userId],
      );
      if (ownerCheck.rows.length === 0) {
        res.status(403).json({ message: "Not authorized" });
        return;
      }

      await db.query("DELETE FROM country_places WHERE id = $1", [req.params.placeId]);
      res.status(200).json({ message: "Place removed" });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
