# PairUp React Frontend

This directory contains the Single Page Application (SPA) for **PairUp**, built with React 18, React Router v6, and Vite.

## Architecture

- **Public Marketplace**:
  - Live 2-column browse interface with filter chips (Python, React, DSA, DevOps, Django, JavaScript) and instant search.
  - Interactive profile preview panel with dynamic booking requests.
  - Dedicated LinkedIn-style mentor profile pages (`/mentor/:id`) with experience timeline, projects, education, certifications, and weekly availability grid.
  - Become a mentor registration & onboarding flow (`/become-a-mentor`).
  - Auth page (`/login`) with tabbed Login and Signup, plus Learner/Mentor role toggling.
  - CMS content pages (`/help`, `/contact`, `/privacy`, `/terms`).
- **Learner Portal** (`/learner/*`):
  - Overview dashboard with active session counts, total expenditure, and recent sessions.
  - Public problem posting form (`/learner/post-problem`).
  - Problem requests management & incoming mentor proposals acceptance (`/learner/my-problems`).
  - Sessions management (`/learner/sessions`): pay escrow, join live room, mark complete, submit disputes, and leave reviews.
  - Payments history & escrow accounting ledger (`/learner/payments`).
  - Reviews history (`/learner/reviews`).
  - Settings & theme toggling (`/learner/settings`).
- **Mentor Portal** (`/mentor/*`):
  - Dashboard with active session counters, open problem request counters, and net earnings.
  - Problem requests board (`/mentor/problem-requests`): browse student bug questions and submit proposals with cover letters & quotes.
  - Submitted proposals tracking (`/mentor/my-proposals`).
  - Sessions tracker with filter tabs (`/mentor/sessions`).
  - Availability scheduler (`/mentor/availability`): configure weekly days and hours.
  - Earnings & payout records (`/mentor/earnings`).
  - Learner reviews & ratings breakdown (`/mentor/reviews`).
  - Comprehensive mentor profile & resume editor (`/mentor/settings`).
- **Live Interactive Features**:
  - Real-time in-app chat (`/chat`) with automatic 4-second polling and anti-leak guard alert banners (blocking phone numbers, emails, and external payment links).
  - Live session pairing room (`/session?booking_id=...`) with call timer, participant avatars, call control buttons, and private auto-saving scratchpad notes.
- **Admin & Superadmin Portals** (`/admin/*`, `/superadmin`):
  - Overview KPI metrics: learners, mentors, completed sessions, gross volume, platform fees, and funds held in escrow.
  - User role management (`/admin/users`, `/admin/mentors`, `/admin/learners`).
  - Mentor verification application queue with Approve / Reject controls (`/admin/verification`).
  - Dispute resolution arbitration interface (`/admin/disputes`).
  - Mentor payout approval system (`/admin/payouts`).
  - Sessions and financial transactions ledgers (`/admin/sessions`, `/admin/payments`).
  - Problem requests & reviews moderation tools (`/admin/problems`, `/admin/reviews`).
  - System settings (`/admin/settings`).
  - Administrative audit logging trail (`/admin/audit-logs`).
  - Live CMS page editor (`/admin/content`).
  - Superadmin root console (`/superadmin`) with search-to-promote and admin access revocation.

## Getting Started

### 1. Prerequisites
- Node.js LTS (v18+)
- Python 3.10+ with Django running `backend_django`

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Verify `frontend/.env` is configured to point to the Django API:
```env
VITE_API_BASE_URL=http://127.0.0.1:8080
```

### 4. Development Server
Start the Vite development server:
```bash
npm run dev
```
The React frontend will be accessible at `http://localhost:5173`.

### 5. Production Build
```bash
npm run build
```
Build output will be bundled into the `frontend/dist/` directory.
