# SiteClock

Employee attendance and workforce management. Next.js 15 (App Router) + Supabase (auth/DB) + Prisma.

## What's actually implemented

- **Auth** — email/password + Google OAuth via Supabase, protected routes via middleware, role-based access (`SUPER_ADMIN`, `COMPANY_ADMIN`, `HR_MANAGER`, `SUPERVISOR`, `EMPLOYEE`).
- **Multi-tenant schema** — every table scoped by `companyId`, ready for multiple client companies on one deployment.
- **Dashboard** — real Prisma-backed stats (present/absent/late/on leave/attendance rate), today's check-ins, recent activity, pending leave alert.
- **Employees** — search, list, create (API), soft-delete/terminate (API), CRUD routes at `/api/employees`.
- **Attendance** — GPS clock-in with Haversine distance-to-office check (flags instead of hard-rejecting outside-radius check-ins), lateness calculated against assigned shift + grace period, clock-out with worked/overtime minutes. QR and selfie clock-in have real API-side handling (`/api/attendance/clock-in` accepts `QR_CODE` and `FACE` methods) but the browser UI for QR scanning and selfie capture is a stub — see "Not yet wired up" below.
- **Leave** — request + manager approve/reject, with audit logging.
- **Audit log & notifications** — schema + writes in place for the actions above.

## Not yet wired up (by design — these need real infra decisions from you)

- **Face verification** — needs a third-party face-match API (AWS Rekognition, Azure Face, or similar). The schema and API route accept a `faceMatchConfidence` score; you plug in the actual comparison call.
- **QR scanning UI** — wire up a library like `html5-qrcode` in `components/attendance/clock-widget.tsx`; the backend already validates the token against `employee.qrCodeToken`.
- **Payroll exports (Excel/CSV/PDF)** — `PayrollEntry` model exists; add an export route once you decide the calculation rules (overtime rate, deduction formulas).
- **Email notifications** — `Notification.channel` supports `"email"`; plug in Resend/SendGrid in a small `lib/email.ts`.
- **Realtime dashboard updates** — Supabase Realtime is included as a dependency; subscribe to the `attendance` table from the dashboard client component when you're ready.
- **PWA / offline sync** — not scaffolded yet.

## Setup

1. **Create a Supabase project** at supabase.com.
2. **Copy `.env.example` to `.env`** and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API.
   - `DATABASE_URL` / `DIRECT_URL` — Project Settings → Database → Connection string (use the pooler URL for `DATABASE_URL`, direct connection for `DIRECT_URL`).
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Push the schema to Supabase:**
   ```bash
   npx prisma db push
   npx prisma generate
   ```
5. **Enable Google OAuth (optional):** Supabase dashboard → Authentication → Providers → Google, add your OAuth client ID/secret.
6. **Set up user provisioning:** when someone signs up via `/register`, a Company + User row needs to be created in Postgres. Either:
   - Add a Supabase **Database Webhook** on `auth.users` INSERT pointing to `/api/auth/webhook`, or
   - Call that same logic directly inside `register/page.tsx` after `signUp()` succeeds (simpler for a single-tenant demo).
7. **Seed demo data (optional):**
   ```bash
   npm run prisma:seed
   ```
8. **Run locally:**
   ```bash
   npm run dev
   ```

## Deploy

- **App:** push to GitHub, import into Vercel, add the same env vars from `.env` in Vercel's project settings.
- **Database:** already hosted by Supabase — no separate step needed.
- Run `npx prisma db push` (or set up `prisma migrate deploy` in your CI) against production before first deploy.

## Project structure

```
app/
  (auth)/login, register        — public auth pages
  (dashboard)/                  — protected app shell (sidebar, topbar) + pages
  api/                          — route handlers (employees, attendance, leave, auth)
  auth/callback                 — OAuth/email confirmation redirect handler
prisma/schema.prisma            — full data model (13 models)
lib/                            — Supabase clients, Prisma client, auth guards, utils
components/                     — UI primitives + feature components
```

## Known gaps vs. the original spec

Multi-company support, shift management UI, department management UI, settings page, and reports/exports are modeled in the schema but don't have pages yet — the pattern established in `employees/` and `attendance/` should make those quick to add.
