# Testing library-pg Application

## Environment Setup

### Prerequisites
- PostgreSQL >= 13 running on localhost:5432
- Node.js (check `.nvmrc` or `package.json` engines)
- Database: `library_db` with user `postgres`/`postgres`

### Starting Services
```bash
cd /path/to/library-pg

# Install dependencies (root, server, client, student-client)
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
cd student-client && npm install && cd ..

# Seed database
npm run seed

# Start backend (port 5001)
npm run server

# Start admin-client (port 3001) — may have pre-existing runtime errors
PORT=3001 npm run client

# Start student-client (port 3002)
PORT=3002 npm run student-client
```

### Demo Credentials
- **Admin**: `admin@library.com` / `123456`
- **Librarian**: `librarian@library.com` / `123456`
- **Student**: `user@library.com` / `123456`

## Devin Secrets Needed
No external secrets required — all services run locally with default PostgreSQL credentials.

## Testing Patterns

### API Testing
1. Get admin JWT token first:
```bash
TOKEN=$(curl -s http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@library.com","password":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
```
2. Use token for authenticated endpoints:
```bash
curl -s http://localhost:5001/api/endpoint -H "Authorization: Bearer $TOKEN"
```
3. API response format uses `data` key (not `books`, `users`, etc.):
```json
{"success": true, "data": [...]}
```

### Database Verification
- Table names are **lowercase** (e.g., `books`, `users`, `borrows`, not `Books`)
- Use `PGPASSWORD=postgres psql -U postgres -d library_db -h localhost` for queries
- Sequelize uses `sync({ alter: true })` — tables auto-created on server start

### Creating Test Data
- Departments: `POST /api/departments` with `{"name": "..."}`
- Assigning books to departments: `PUT /api/books/:id` with `{"department_id": N}`
- Borrow records: Insert directly via SQL for precise control over dates:
```sql
INSERT INTO borrows (user_id, book_id, status, borrow_date, due_date, ...)
VALUES (3, 1, 'borrowed', NOW(), NOW() + INTERVAL '14 days', ...);
```
- Fine records: Insert via SQL after creating borrows

### Scheduler Testing
The overdue scheduler runs on a daily cron (`0 0 * * *`). To test manually:
1. Create an overdue borrow (due_date in the past, status='borrowed')
2. Run the scheduler logic directly with a Node.js script from `/server` directory
3. Must set correct env vars: `DB_USER=postgres DB_PASS=postgres`
4. The scheduler skips borrows already marked as 'overdue' — reset status to 'borrowed' to re-test

### Forgot/Reset Password Testing
- In development (`NODE_ENV=development`), the forgot-password endpoint may return the reset token directly
- If not, query the database: `SELECT reset_token FROM users WHERE email='...'`
- Tokens expire after 15 minutes
- After testing, reset password back to original: use forgot-password + reset-password API calls

## Known Issues

### AnimatedCounter Race Condition
The homepage `AnimatedCounter` component might show 0 on first load. This is a race condition between `IntersectionObserver` firing and API data arriving. The `started.current` ref prevents re-animation when `target` changes from 0 to actual value. Manifests intermittently.

### Admin-Client Runtime Error
The admin-client (port 3001) may have a pre-existing `setLoading is not defined` error. This is not related to new feature PRs. Student-client (port 3002) is the primary testing target for student-facing features.

### Proxy Configuration
- Student-client proxies `/api` to `http://localhost:5001` (configured in `package.json`)
- On Vercel (static deployment), API calls fail silently since there's no backend — stats show 0, etc.
- For production, set `REACT_APP_API_URL` environment variable to point to a deployed backend

## Browser Testing Tips
- Maximize browser window before recording: `wmctrl -r :ACTIVE: -b add,maximized_vert,maximized_horz`
- Student-client features to test via browser: Fines page (/my-fines), Forgot/Reset Password, Homepage
- Admin features may need API-level testing if admin-client has runtime errors
- The student-client login page has a "Quên mật khẩu?" link to `/forgot-password`
