# FitPulse BackEnd

Express API for the FitPulse MySQL database. The FrontEnd is a separate static site and is not served by this backend.

## Setup

1. Copy `.env.example` to `.env` and set the MySQL connection values.
2. Set `FRONTEND_ORIGINS` to the exact origin(s) serving the frontend, separated by commas.
3. Run `npm install`, then `npm run dev` from this folder.

The API listens on `http://localhost:5000` by default. Its landing page is available at `/`.

## API

- `GET /api/v1/health` checks the API's MySQL connection (`503` if the database is unavailable).
- `GET /api/v1/classes` lists classes with their instructor and maximum capacity.
- `GET /api/v1/classes/:id` returns one class.
- `GET /api/v1/classes/:id/reviews` lists reviews for a class without exposing reviewer email or password.
- `POST /api/v1/classes` creates a class for an authenticated admin.
- `POST /api/v1/classes/:id/enroll` records a free enrollment for an authenticated user.
- `GET /api/v1/instructors` lists instructors.
- `POST /api/v1/Users` creates a user from `{ "name", "email", "password" }`.
- `POST /api/v1/Sessions` verifies `{ "email", "password" }` and returns a signed, expiring session token with the user's role.
- `GET /api/v1/Sessions/me` returns the current user from a valid `Authorization: Bearer <token>` header.
- `GET /api/v1/Sessions/me/enrollments` lists the authenticated user's classes.
- `GET /api/v1/admin/dashboard` returns user-role accounts and today's simulated enrollment totals for an admin.
- `GET /api/v1/admin/users/:id` returns a selected user and their enrollments for admin supervision.

Passwords are hashed in the API with PBKDF2-HMAC-SHA256 and a unique random salt before insertion. The encoded salt and hash are stored together in the existing `user.password` field. The `user` table has no phone column, so registration stores the full name, email, and password only.

Session tokens are HMAC-signed and expire after eight hours. Set `SESSION_SECRET` to a random secret of at least 32 bytes in `.env`; if it is omitted, the API generates an in-memory secret and logs a warning, so existing tokens become invalid after a server restart. No SQL session table is used.

The `user.role` column is an enum with `user` and `admin` values. New registrations do not accept a role from the request and use the database's `user` default. To grant admin access, update only the intended account, for example: `UPDATE \`user\` SET role = 'admin' WHERE email = 'admin@example.com';`. Admin pages verify this role through the authenticated session endpoint.

Run `BackEnd/migrations/001_class_enrollment.sql` once against the database after the `user` and `class` tables exist. It stores one free enrollment per user/class and snapshots the class's listed price as `simulated_amount`; no payment is processed. Class creation uses the admin API and defaults to category=class name, price=0, empty description, and capacity=20.

The admin dashboard lists every account with `role = 'user'`; the schema does not record online/last-seen status. Its “sales” are clearly labeled simulated values: the sum of listed class prices for free enrollments created today, not payments. The API still does not process payments or write reviews.

The class table contains both `maximum_limit` and `maximum-limit`; the API uses `maximum_limit` when set and otherwise falls back to `maximum-limit` or `20`.

## FrontEnd integration

The class list and Yoga, Spinning, and CrossFit pages read class data from this API. Class details accept an `id` query parameter; the cart accepts `classId` and records free enrollments. Instructor names and class reviews are loaded from their read endpoints. The register page posts to `Users`, and the login page posts to `Sessions`. MyAccount shows the signed-in user's enrolled classes; admin user cards open a read-only profile with that selected user's enrolled classes. Admin class creation is supported; review submission and payment processing remain unavailable.

The frontend defaults to `http://localhost:5000/api/v1`. To use another API host, set `window.FITPULSE_API_BASE` before loading `FrontEnd/js/api.js`, or add a `fitpulse-api-base` meta tag to the page. When serving the frontend from a local web server, add its exact origin to `FRONTEND_ORIGINS` in the backend `.env`.
