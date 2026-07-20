# Wadi Al Buraq CRM — Client & Sales Management Dashboard

Enterprise CRM for **WADI AL BURAQ TOURISM L.L.C.** built with Next.js, Firebase and Tailwind CSS.

## Features

- 🔐 **Role-based access** — Admin / Manager / Employee with server-enforced Firestore Security Rules
- 🔒 **Employee data isolation** — employees can only ever see, search, or query their own assigned clients (enforced in `firestore.rules`, not just the UI)
- 📊 Role-aware dashboards with revenue, service, lead-source and team-comparison charts
- 👥 Full client management: profiles, requirements, documents (upload + preview), payments, follow-ups, tasks, activity timeline
- 📋 Kanban lead board with drag & drop, calendar view, reports with CSV/Excel/Print export
- 🔔 Notification center, immutable audit trail, admin settings, duplicate detection, passport-expiry alerts
- 🌗 Dark/light mode, collapsible sidebar, Ctrl+K quick search, skeleton loading, PWA with offline cache

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Firebase project** at [console.firebase.google.com](https://console.firebase.google.com):
   - Enable **Authentication → Email/Password**
   - Create a **Firestore database** (production mode)
   - Enable **Storage**

3. **Configure environment** — copy `.env.local.example` to `.env.local` and fill in the web-app config from Project Settings.

4. **Deploy security rules** (critical — do not skip):

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use <your-project-id>
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

5. **Create the first admin**:
   - Firebase Console → Authentication → Add user (email + password)
   - Firestore → create document at `users/<that-uid>`:

     ```json
     {
       "uid": "<uid>",
       "employeeId": "ADM-001",
       "name": "Your Name",
       "email": "admin@wadialburaq.com",
       "role": "admin",
       "status": "active",
       "createdAt": "<server timestamp>"
     }
     ```

   - After that, add all other users from the app: **Team → Add User**.

6. **Add the logo** — save the official logo as `public/logo.png` (512×512 recommended).

7. **Run**

   ```bash
   npm run dev     # development
   npm run build   # production build
   npm start       # serve production
   ```

## Security model

| Role | Access |
|------|--------|
| Admin | Everything, incl. users, settings, deletes |
| Manager | All clients/sales/reports, assign/reassign, no system settings |
| Employee | Only documents where `assignedEmployeeId == uid` — enforced by Firestore rules on every read, write and query |

Audit logs are append-only (`update, delete: if false`).

## Structure

```
src/
  app/(app)/        # protected pages: dashboard, clients, kanban, followups,
                    # tasks, calendar, sales, reports, employees, notifications,
                    # audit-logs, settings, profile
  app/login/        # authentication
  components/       # ui kit, layout shell, charts, client modules
  context/          # Auth + Theme providers
  lib/              # firebase init, data access, types, constants, export
firestore.rules     # role-based security (deploy!)
storage.rules       # file access rules (deploy!)
```

Future modules (accounting, HR, WhatsApp API, customer portal…) can be added as new
route groups + collections without restructuring — data access is centralized in `src/lib/data.ts`.
