# Environment Variables

Create both `.env` files from the examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

## Frontend Variables

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `VITE_API_URL` | Backend API base URL | `https://localhost:5000` (dev) or your production backend URL |
| `VITE_MAPS_API_KEY` | Google Maps JavaScript API key | Same key as backend `MAPS_API_KEY` |
| `VITE_ENVIRONMENT_VALUE` | Environment mode | `development` or `production` |

## Backend Variables

### Required

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `PORT` | Backend server port | Default: `5000` |
| `DB_URL` | PostgreSQL connection string | Supabase dashboard > Settings > Database > Connection Pooler, or your local PostgreSQL URL |
| `SIGNATURE` | JWT access token signing secret | Generate with `openssl rand -base64 32` |
| `SIGNATURE2` | JWT refresh token signing secret | Generate a different value with `openssl rand -base64 32` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `FRONTEND_URL` | Frontend origin for CORS | `https://localhost:5173` (dev) or your production URL |
| `BACKEND_BASE_URL` | Backend base URL for email links | `https://localhost:5000` (dev) or your production URL |

## Email (Resend)

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `RESEND_API_KEY` | Resend API key for transactional email | [resend.com/api-keys](https://resend.com/api-keys) |
| `MY_DOMAIN_EMAIL` | Verified sender email address | Your verified domain email in Resend |
| `APP_NAME` | App name used in email templates | `Vacation-Planner` |

## Google Services

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `MAPS_API_KEY` | Google Maps JavaScript API key | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) — enable Maps JavaScript API |
| `GEMINI_API_KEY` | Google Gemini AI API key | [Google AI Studio](https://aistudio.google.com/apikey) |

## Production Only

| Variable | Description |
|----------|-------------|
| `PROD_URL` | Production frontend URL (used for email redirect links) |

## E2E Testing

These are used by Playwright tests (set in your shell or CI, not in `.env`):

| Variable | Description |
|----------|-------------|
| `E2E_EMAIL` | Test account email |
| `E2E_PASSWORD` | Test account password |
