# FitPulse BackEnd

Express API for the FitPulse MySQL database. The FrontEnd folder is not served or modified by this backend.

## Setup

1. Copy `.env.example` to `.env` and set the MySQL connection values.
2. Set `FRONTEND_ORIGINS` to the exact origin(s) serving the frontend, separated by commas.
3. Run `npm install`, then `npm run dev` from this folder.

The API listens on `http://localhost:5000` by default. Its landing page is available at `/`.

## Read-only API

- `GET /api/v1/health` checks the API's MySQL connection (`503` if the database is unavailable).
- `GET /api/v1/classes` lists classes with their instructor and maximum capacity.
- `GET /api/v1/classes/:id` returns one class.
- `GET /api/v1/classes/:id/reviews` lists reviews for a class without exposing reviewer email or password.
- `GET /api/v1/instructors` lists instructors.

The schema has no enrollment/reservation table, user roles, or payment-to-class relation. For now the API does not write classes, purchases, reviews, or user data and does not expose account records. Those operations need an authentication/authorization model and, for bookings, a schema relationship before they can be implemented safely.

The class table contains both `maximum_limit` and `maximum-limit`; the API uses `maximum_limit` when set and otherwise falls back to `maximum-limit` or `20`.
