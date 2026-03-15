# Full Installation Guide

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | v18+ |
| npm | v9+ |
| PostgreSQL | v15+ (or a Supabase project) |
| mkcert (optional) | For local HTTPS certificates |

## 1. Clone the Repository

```bash
git clone https://github.com/zubairumatiya/vacation-planner.git
cd vacation-planner
```

## 2. Install Dependencies

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

## 3. Database Setup

### Option A: Supabase (recommended)
1. Create a project at [supabase.com](https://supabase.com)
2. Copy the **connection pooler** URL from Settings > Database
3. Run the schema migration:
   ```bash
   psql "YOUR_SUPABASE_URL" -f db_schema.sql
   ```

### Option B: Local PostgreSQL
1. Create a database:
   ```bash
   createdb vacation_planner
   ```
2. Run the schema:
   ```bash
   psql vacation_planner -f db_schema.sql
   ```

## 4. Environment Variables

Copy the example file and fill in your values:

```bash
cp backend/.env.example backend/.env
```

See **[ENV.md](ENV.md)** for a full reference of every variable and where to get each value.

## 5. HTTPS Certificates (Local Dev)

The app uses HTTPS in development. Generate local certificates with [mkcert](https://github.com/FiloSottile/mkcert):

```bash
# Install mkcert
brew install mkcert  # macOS
mkcert -install

# Generate certs
mkdir -p backend/certs
cd backend/certs
mkcert localhost
# Rename to match expected filenames
mv localhost-key.pem localhost-key.pem
mv localhost.pem localhost.pem
```

## 6. Start Development Servers

```bash
# Terminal 1: Compile TypeScript (watches for changes)
cd backend
tsc --watch

# Terminal 2: Run backend server (port 5000, auto-restarts on compiled changes)
cd backend
nodemon dist/backend/server.js

# Terminal 3: Frontend dev server (port 5173)
cd frontend
npm run dev
```

Open [https://localhost:5173](https://localhost:5173) in your browser.

## 7. Running Tests

```bash
# Unit + integration tests (all workspaces)
npm test

# E2E tests (requires both dev servers running)
npm run test:e2e
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ECONNREFUSED` on database | Verify your `DB_URL` is correct and the database is running |
| HTTPS cert errors in browser | Run `mkcert -install` to trust the local CA |
| `CORS` errors | Ensure `FRONTEND_URL` in `.env` matches your frontend's origin exactly (including port) |
| Gemini AI not responding | Verify `GEMINI_API_KEY` is set and has quota remaining |
| Email verification not sending | Check `RESEND_API_KEY` and `MY_DOMAIN_EMAIL` values |
| E2E tests timing out | Make sure both frontend and backend dev servers are running before starting tests |
