# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Application: قاعدة بيانات الموردين والمقاولين - الرواف

### Purpose
Full-stack Arabic RTL dashboard for "شركة الرواف للمقاولات" — manages suppliers, contractors, and service providers.

### Artifacts
- **rawaf-dashboard** (`artifacts/rawaf-dashboard`) — React + Vite frontend (Arabic RTL, warm beige theme)
- **api-server** (`artifacts/api-server`) — Express 5 backend serving `/api`

### Frontend Features
- **لوحة التنسيق الفني** (main tab): Live contractor details card, price comparison chart, work history, footer stats
- **قاعدة البيانات** (database tab): Password-protected (`maged@2026`), full CRUD table, interactive star ratings, Excel export, local content field
- **Header**: Single unified full-width search bar — fuzzy-matches across all contractor fields in real time
- **Star Ratings**: 5-star system — read-only in table, editable in add/edit modals; inline next to contractor name in detail card
- **Excel Export**: "تصدير Excel" button exports filtered data in RTL professional format via SheetJS (rightToLeft sheet view)
- **Row-click navigation**: Clicking contractor name in DB table navigates directly to main dashboard (no "عرض" button)
- **Header search**: Single unified search filters both main dashboard and database table (passed via props, no duplicate search bars)
- **Table columns**: 12 data columns — رقم العقد، المقاول، المشروع، المحفظة، نطاق التوصيف الفني، النشاط الرئيسي، نوع الأعمال، نوع العمل، الوحدة، السعر، التواصل، التقييم
- **Work history logic**: Shows other projects of the SAME contractor (same contractor name + same workType), not other contractors

### DB Schema (`lib/db/src/schema/contractors.ts`)
Table: `contractors`
Columns: id, contractNo, contractor, project, portfolio, technicalScope, workType, workCategory (nullable), unit (nullable), **mainActivity** (text nullable), price (integer), phone, email, workDescription (nullable), workScopeText (nullable), **rating** (integer nullable, 0-5), **localContent** (text nullable), createdAt

### API Endpoints (`lib/api-spec/openapi.yaml`)
- `GET /api/contractors` — list with optional filters (contractNo, contractor, technicalScope, workType, project, portfolio)
- `POST /api/contractors` — create new contractor
- `GET /api/contractors/:id` — get single contractor
- `DELETE /api/contractors/:id` — delete contractor

### Design
- Warm beige body (`#f2ede6`), white cards, gold (`#c5a059` / `#a88540`) accents, charcoal (`#3a3632`) text
- Tajawal Arabic font, full RTL direction
- CSS animations: fadeInUp, slideIn, pulse-gold, stagger
- Rawaf logo: `@assets/logo_1776260992247.jpg`

---

## User Management System: إدارة المستخدمين

### Entry Point
- Gear icon (⚙) in header — visible ONLY to admin users (`role === "admin"`)
- Clicking the gear opens `UserManagementPanel` modal overlay

### Default Admin Credentials
- loginName: `admin` | password: `maged@2026` | name: `علي عنتر` | role: `admin`
- Admin is auto-seeded in `users` table on first server start

### Panel Features
- User table: status dot (green = online <2min, gray = offline), avatar with initials, name, loginName, jobTitle, role badge, edit/delete/toggle-active buttons
- Online counter badge in panel header
- Add User / Edit User form: name, loginName (username), jobTitle, role, password
- Activity Log: click any user name → modal showing 7-day login history (timestamp + date per entry)
- Delete with confirmation modal

### DB Schema (`lib/db/src/schema/`)
- `users.ts` → Table `users`: id, name, loginName (unique), jobTitle, role (admin/user), passwordHash (SHA-256 + salt), isActive, lastActive, createdAt
- `user_logs.ts` → Table `user_logs`: id, userId, loginName, loginAt

### API Endpoints
- `POST /api/auth/login` — validate credentials, log to user_logs, return user (no hash)
- `POST /api/auth/heartbeat` — update lastActive timestamp (called every 60s from App.tsx)
- `GET /api/admin/users` — list all users (requires `x-admin-login` header)
- `POST /api/admin/users` — create user
- `PUT /api/admin/users/:id` — update user (name, loginName, jobTitle, role, password, isActive)
- `DELETE /api/admin/users/:id` — delete user + all their logs
- `GET /api/admin/users/:id/logs` — 7-day activity log for a user

### Password Hashing
SHA-256 with internal salt in `artifacts/api-server/src/lib/auth-utils.ts`

### Session
Login stores user JSON in `sessionStorage["rawaf_current_user"]`. App.tsx reads it + listens to `rawaf-login` / `rawaf-logout` custom events to update state.

---

## Removed Systems
- Contract Management System (`نظام إدارة العقود`) was fully removed. Old DB tables (contracts, contract_stage_log, contract_documents, contract_comments) may still exist in the database but are unused.

### Entry Point
- Second button "🏛️ نظام إدارة العقود" on SplashGate (next to "الدخول للنظام الآمن")
- Session stored in `rawaf_contracts_gate` — no separate password required
- Role selector (9 roles grid) shown on first entry, stored in `rawaf_contracts_role` sessionStorage

### Frontend Structure (`artifacts/rawaf-dashboard/src/contracts/`)
- `ContractApp.tsx` — main shell (sidebar + routing + role gate)
- `ContractSidebar.tsx` — 4-tab sidebar (الرئيسية، طلبات العقود، متابعة العقود، قاعدة البيانات)
- `ContractDashboard.tsx` — KPI cards (جديد/قيد الإجراء/معتمد/موقع) + pending contracts
- `ContractRequests.tsx` — full contracts list + new contract form (مدير المشروع only)
- `ContractDetail.tsx` — detail view: WorkflowWaterfall + stage action cards + Timeline audit log
- `ContractTracking.tsx` — active contracts with expandable timeline per contract
- `ContractArchive.tsx` — completed contracts archive with stats
- `WorkflowWaterfall.tsx` — 11-stage horizontal progress bar (permanent header on detail view)
- `RoleSelector.tsx` — 9-role card grid with pending badges
- `tafqit.ts` — Arabic number-to-words converter (التفقيط)
- `api.ts` — typed fetch wrappers for contracts API
- `types.ts` — shared TypeScript interfaces + STAGES + ROLES constants

### Design Language (Golden System)
- Background: white marble `#FFFFFF`, accent: gold `#C5A059`
- Font: Cairo (loaded via Google Fonts) + Tajawal fallback
- Full RTL direction

### 11-Stage Workflow
1. إنشاء العقد (مدير المشروع)
2. مراجعة القطاع (مدير القطاع)
3. مراجعة PMO (مدير PMO)
4. المراجعة القانونية (أخصائي العقود)
5. صياغة البنود (أدمن العقود)
6. رفع مسودة العقد (أدمن العقود)
7. اعتماد مدير الإدارة
8. اعتماد نائب الرئيس
9. اعتماد الرئيس التنفيذي (الختم الذهبي)
10. رفع النسخة الموقعة (مسؤول التوقيعات)
11. الأرشفة والإغلاق (مسؤول التوقيعات)

### DB Schema (`lib/db/src/schema/contracts.ts`)
- Table `contracts`: id, contractNo (CON-YYYY-NNNN), title, vendorName, vendorContact, value, startDate, endDate, contractType, projectName, currentStage (1-11), status (active/completed), createdBy, wordFilename, signedFilename, rejectionReason, createdAt, updatedAt
- Table `contract_stage_log`: id, contractId, stage, action (advance/reject), actorRole, actorName, notes, createdAt

### API Endpoints (`artifacts/api-server/src/routes/contracts_mgmt.ts`)
- `GET /api/contracts` — list with optional ?status= ?stage= filters
- `POST /api/contracts` — create contract (auto-generates CON-YYYY-NNNN number)
- `GET /api/contracts/stats` — KPI counts (total, draft, inProgress, approved, completed)
- `GET /api/contracts/:id` — single contract detail
- `GET /api/contracts/:id/log` — audit trail / stage log
- `PATCH /api/contracts/:id/stage` — advance or reject stage (server enforces role gate)
- `DELETE /api/contracts/:id` — delete contract + logs
