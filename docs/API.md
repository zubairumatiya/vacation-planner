# API Reference

Base URL: `https://localhost:5000` (development)

All authenticated endpoints require a `Authorization: Bearer <access_token>` header.

---

## Authentication

### POST `/auth/login`

Authenticate a user and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass1!"
}
```

**Response `200`:**
```json
{
  "accessToken": "eyJhbG...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "traveler",
    "avatarUrl": "https://..."
  }
}
```
Also sets an HTTP-only `refreshToken` cookie.

**Errors:** `401` invalid credentials, `403` email not verified.

---

### POST `/signup`

Register a new account. Sends a verification email.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass1!",
  "firstName": "Jane",
  "lastName": "Doe",
  "username": "janedoe"
}
```

**Response `201`:**
```json
{
  "message": "Verification email sent"
}
```

**Errors:** `422` validation failure (weak password, invalid email, duplicate username).

---

### POST `/auth/refresh`

Refresh an expired access token using the HTTP-only refresh cookie.

**Response `200`:**
```json
{
  "accessToken": "eyJhbG..."
}
```

**Errors:** `401` invalid or expired refresh token.

---

## Trips

### GET `/vacation/:tripId`

Get a trip with its full schedule and list. Requires trip access (owner, editor, or reader).

**Response `200`:**
```json
{
  "trip": {
    "id": "uuid",
    "tripName": "Tokyo 2025",
    "location": "Tokyo, Japan",
    "startDate": "2025-06-01",
    "endDate": "2025-06-10",
    "schedule": [...],
    "list": [...],
    "shares": [...]
  }
}
```

**Errors:** `403` no access, `404` trip not found.

---

### POST `/vacation`

Create a new trip. Authenticated.

**Request Body:**
```json
{
  "tripName": "Tokyo 2025",
  "location": "Tokyo, Japan",
  "startDate": "2025-06-01",
  "endDate": "2025-06-10",
  "scheduleItems": [
    {
      "dayNumber": 1,
      "time": "09:00",
      "activity": "Visit Senso-ji Temple",
      "cost": 0
    }
  ]
}
```

**Response `201`:** Returns the created trip object.

---

## AI

### POST `/ai/chat`

Send a message to the Gemini AI assistant for trip planning help.

**Request Body:**
```json
{
  "message": "What are the best restaurants in Shibuya?",
  "tripId": "uuid",
  "conversationHistory": []
}
```

**Response `200`:**
```json
{
  "reply": "Here are some top-rated restaurants in Shibuya..."
}
```

---

## Profile & Social

### GET `/profile`

Get the authenticated user's profile, including trip count and followers.

### POST `/profile/follow/:userId`

Send a follow request to another user.

### GET `/profile/notifications`

Get the user's notifications (follow requests, trip invitations).

---

For the complete list of endpoints, see the route files in `backend/routes/`.
