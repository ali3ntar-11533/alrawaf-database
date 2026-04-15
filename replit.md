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
- **قاعدة البيانات** (database tab): Password-protected (`rawaf@2024`), full CRUD table, interactive star ratings, Excel export, local content field
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
- Rawaf logo: `@assets/1658133304061_1776159635121.jpg`
