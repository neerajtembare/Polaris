# Project Polaris — Implementation Checklist

## Purpose

This document provides a granular, ordered checklist for implementing Polaris MVP. Each step is small enough to complete in one session and builds on previous steps.

**Usage:**
- Work through steps in order
- Check off each step when complete
- Don't skip ahead
- If blocked, note the blocker and reassess

---

# Phase 0: Foundation (~2 weeks)

## 0.1 Project Setup

- [ ] **0.1.1** Create monorepo directory structure:
  ```
  polaris/
  ├── apps/
  │   ├── backend/
  │   └── frontend/
  ├── packages/
  │   └── shared/
  ├── package.json (root)
  └── README.md
  ```

- [ ] **0.1.2** Initialize root `package.json` with workspaces:
  ```json
  {
    "name": "polaris",
    "private": true,
    "workspaces": ["apps/*", "packages/*"]
  }
  ```

- [ ] **0.1.3** Add root dev dependencies:
  - TypeScript
  - ESLint
  - Prettier
  - concurrently (for running both apps)

- [ ] **0.1.4** Create root `tsconfig.base.json` with shared compiler options

- [ ] **0.1.5** Create `.gitignore` with node_modules, dist, .env, *.db

- [ ] **0.1.6** Initialize git repository and make initial commit

---

## 0.2 Backend Setup

- [ ] **0.2.1** Initialize `apps/backend/package.json`:
  ```json
  {
    "name": "@polaris/backend",
    "scripts": {
      "dev": "tsx watch src/index.ts",
      "build": "tsc",
      "start": "node dist/index.js",
      "db:migrate": "prisma migrate dev",
      "db:generate": "prisma generate",
      "db:studio": "prisma studio"
    }
  }
  ```

- [ ] **0.2.2** Install backend dependencies:
  - fastify
  - @fastify/cors
  - @fastify/helmet
  - dotenv
  - zod
  - @prisma/client

- [ ] **0.2.3** Install backend dev dependencies:
  - typescript
  - tsx
  - prisma
  - @types/node

- [ ] **0.2.4** Create `apps/backend/tsconfig.json` extending base

- [ ] **0.2.5** Create directory structure:
  ```
  apps/backend/
  ├── src/
  │   ├── index.ts
  │   ├── app.ts
  │   ├── config/
  │   │   └── index.ts
  │   ├── routes/
  │   │   └── index.ts
  │   ├── controllers/
  │   ├── services/
  │   ├── lib/
  │   │   └── prisma.ts
  │   └── types/
  │       └── index.ts
  └── prisma/
      └── schema.prisma
  ```

- [ ] **0.2.6** Create Fastify app (`app.ts`):
  ```typescript
  import Fastify from 'fastify';
  import cors from '@fastify/cors';
  import helmet from '@fastify/helmet';

  const app = Fastify({ logger: true });

  app.register(cors);
  app.register(helmet);

  // Routes registered here
  
  export default app;
  ```

- [ ] **0.2.7** Create entry point (`index.ts`):
  ```typescript
  import 'dotenv/config';
  import app from './app';
  
  const PORT = process.env.PORT || 3001;
  
  app.listen({ port: Number(PORT), host: '0.0.0.0' }, (err) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
  });
  ```

- [ ] **0.2.8** Create `/health` endpoint returning `{ status: "healthy" }`

- [ ] **0.2.9** Test: `npm run dev` starts server, `curl localhost:3001/health` returns OK

---

## 0.3 Database Setup (Prisma)

- [ ] **0.3.1** Initialize Prisma:
  ```bash
  cd apps/backend
  npx prisma init --datasource-provider sqlite
  ```

- [ ] **0.3.2** Create `apps/backend/prisma/schema.prisma`:
  ```prisma
  datasource db {
    provider = "sqlite"
    url      = env("DATABASE_URL")
  }

  generator client {
    provider = "prisma-client-js"
  }

  model Goal {
    id          String     @id @default(uuid())
    title       String
    description String?
    timeframe   String     @default("short")
    parentId    String?    @map("parent_id")
    parent      Goal?      @relation("GoalHierarchy", fields: [parentId], references: [id])
    children    Goal[]     @relation("GoalHierarchy")
    targetValue Float?     @map("target_value")
    targetUnit  String?    @map("target_unit")
    targetDate  DateTime?  @map("target_date")
    status      String     @default("active")
    isDeleted   Boolean    @default(false) @map("is_deleted")
    createdAt   DateTime   @default(now()) @map("created_at")
    updatedAt   DateTime   @updatedAt @map("updated_at")
    activities  Activity[]

    @@index([parentId])
    @@index([timeframe])
    @@index([status])
    @@index([isDeleted])
    @@map("goals")
  }

  model Activity {
    id           String    @id @default(uuid())
    title        String
    notes        String?
    activityType String    @map("activity_type")
    value        Float?
    unit         String?
    rawInput     String?   @map("raw_input")
    goalId       String?   @map("goal_id")
    goal         Goal?     @relation(fields: [goalId], references: [id])
    activityDate DateTime  @map("activity_date")
    category     String    @default("growth")
    status       String    @default("planned")
    aiGenerated   Boolean  @default(false) @map("ai_generated")
    aiCategorized Boolean  @default(false) @map("ai_categorized")
    isDeleted    Boolean   @default(false) @map("is_deleted")
    createdAt    DateTime  @default(now()) @map("created_at")
    updatedAt    DateTime  @updatedAt @map("updated_at")
    completedAt  DateTime? @map("completed_at")

    @@index([activityDate])
    @@index([goalId])
    @@index([category])
    @@index([status])
    @@index([isDeleted])
    @@map("activities")
  }

  model Event {
    id            String   @id @default(uuid())
    entityType    String   @map("entity_type")
    entityId      String   @map("entity_id")
    eventType     String   @map("event_type")
    previousState String?  @map("previous_state")
    newState      String   @map("new_state")
    metadata      String?
    timestamp     DateTime @default(now())

    @@index([entityId])
    @@index([entityType])
    @@index([eventType])
    @@index([timestamp])
    @@map("events")
  }
  ```

- [ ] **0.3.3** Create `.env` file in `apps/backend`:
  ```
  DATABASE_URL="file:./data/polaris.db"
  ```

- [ ] **0.3.4** Create Prisma client module (`src/lib/prisma.ts`):
  ```typescript
  import { PrismaClient } from '@prisma/client';
  
  const prisma = new PrismaClient();
  
  export default prisma;
  ```

- [ ] **0.3.5** Run initial migration:
  ```bash
  npx prisma migrate dev --name init
  ```

- [ ] **0.3.6** Generate Prisma Client:
  ```bash
  npx prisma generate
  ```

- [ ] **0.3.7** Verify database created at `apps/backend/data/polaris.db`

- [ ] **0.3.8** Test Prisma Studio:
  ```bash
  npx prisma studio
  ```

- [ ] **0.3.9** Update `/health` to include database status check:
  ```typescript
  app.get('/health', async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', database: 'connected' };
  });
  ```

---

## 0.4 Frontend Setup

- [ ] **0.4.1** Create Vite React app:
  ```bash
  cd apps
  npm create vite@latest frontend -- --template react-ts
  ```

- [ ] **0.4.2** Update `apps/frontend/package.json`:
  - Name: `@polaris/frontend`
  - Ensure TypeScript configured

- [ ] **0.4.3** Install frontend dependencies:
  - @tanstack/react-query
  - zustand
  - react-router-dom
  - tailwindcss
  - @radix-ui/react-slot (for primitives)
  - clsx
  - date-fns

- [ ] **0.4.4** Configure Tailwind CSS:
  - `npx tailwindcss init -p`
  - Configure `content` paths
  - Add base styles to `index.css`

- [ ] **0.4.5** Create directory structure:
  ```
  apps/frontend/src/
  ├── main.tsx
  ├── App.tsx
  ├── index.css
  ├── components/
  │   ├── ui/
  │   └── layout/
  ├── pages/
  ├── hooks/
  ├── services/
  │   └── api.ts
  ├── stores/
  └── types/
  ```

- [ ] **0.4.6** Create API service (`services/api.ts`):
  - Base URL config (from env)
  - Fetch wrapper with error handling
  - Type-safe request methods

- [ ] **0.4.7** Setup React Query provider in `main.tsx`

- [ ] **0.4.8** Setup React Router with basic routes:
  - `/` → Today View (placeholder)
  - `/goals` → Goals List (placeholder)
  - `/goals/:id` → Goal Detail (placeholder)

- [ ] **0.4.9** Create basic Layout component:
  - Header with app name
  - Navigation links
  - Main content area

- [ ] **0.4.10** Configure proxy to backend in `vite.config.ts`:
  ```typescript
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
  ```

- [ ] **0.4.11** Test: Frontend loads, shows layout, navigation works

---

## 0.5 Shared Package

- [ ] **0.5.1** Create `packages/shared/package.json`:
  ```json
  {
    "name": "@polaris/shared",
    "main": "src/index.ts",
    "types": "src/index.ts"
  }
  ```

- [ ] **0.5.2** Create shared types (`packages/shared/src/types.ts`):
  - Goal interface
  - Activity interface
  - Timeframe enum
  - ActivityType enum
  - Status enums

- [ ] **0.5.3** Create shared validation schemas (`packages/shared/src/schemas.ts`):
  - CreateGoalSchema (Zod)
  - UpdateGoalSchema
  - CreateActivitySchema
  - UpdateActivitySchema

- [ ] **0.5.4** Export from `packages/shared/src/index.ts`

- [ ] **0.5.5** Import shared types in backend and frontend

---

## 0.6 Development Workflow

- [ ] **0.6.1** Create root `dev` script to run both apps:
  ```json
  "dev": "concurrently \"npm run dev -w @polaris/backend\" \"npm run dev -w @polaris/frontend\""
  ```

- [ ] **0.6.2** Create `.env.example` with required variables:
  ```
  PORT=3001
  DATABASE_URL=./data/polaris.db
  NODE_ENV=development
  ```

- [ ] **0.6.3** Add ESLint config for both apps

- [ ] **0.6.4** Add Prettier config

- [ ] **0.6.5** Test full dev workflow:
  - `npm install` from root
  - `npm run dev` starts both apps
  - Frontend loads and shows layout
  - Backend health check works

- [ ] **0.6.6** Commit: "Phase 0 complete: Foundation setup"

---

# Phase 1: Manual Core (~4-6 weeks)

## Milestone 1.1: Goals CRUD (~1 week)

### Backend: Goals

- [ ] **1.1.1** Create Goal types (`types/goal.ts`):
  - Goal interface (or use Prisma-generated types)
  - CreateGoalInput
  - UpdateGoalInput

- [ ] **1.1.2** Create Goal service (`services/goalService.ts`):
  - Uses Prisma client directly
  - `findAll(filters)` - list goals with filters
  - `findById(id)` - get single goal
  - `create(data)` - insert goal
  - `update(id, data)` - update goal
  - `softDelete(id)` - set isDeleted = true
  - Event logging on mutations

- [ ] **1.1.3** Create Goal controller (`controllers/goalController.ts`):
  - `getGoals` - handle GET /goals
  - `getGoal` - handle GET /goals/:id
  - `createGoal` - handle POST /goals
  - `updateGoal` - handle PATCH /goals/:id
  - `deleteGoal` - handle DELETE /goals/:id

- [ ] **1.1.4** Create Goal routes (`routes/goals.ts`):
  - Wire up all endpoints
  - Apply validation middleware

- [ ] **1.1.5** Register goal routes in main router

- [ ] **1.1.6** Test with curl/Postman:
  - Create goal
  - List goals
  - Get goal by ID
  - Update goal
  - Delete goal (soft)

### Frontend: Goals

- [ ] **1.1.8** Create Goal API hooks (`hooks/useGoals.ts`):
  - `useGoals()` - fetch all goals
  - `useGoal(id)` - fetch single goal
  - `useCreateGoal()` - mutation
  - `useUpdateGoal()` - mutation
  - `useDeleteGoal()` - mutation

- [ ] **1.1.9** Create GoalCard component (`components/GoalCard.tsx`):
  - Display title, timeframe, target
  - Click to navigate to detail

- [ ] **1.1.10** Create GoalsList page (`pages/GoalsList.tsx`):
  - Fetch and display all goals
  - Group by timeframe (long/medium/short)
  - Empty state when no goals
  - "Add Goal" button

- [ ] **1.1.11** Create GoalForm component (`components/GoalForm.tsx`):
  - Title input (required)
  - Description textarea
  - Timeframe select
  - Target value + unit inputs
  - Parent goal select (optional)
  - Submit/Cancel buttons

- [ ] **1.1.12** Create CreateGoal page (`pages/CreateGoal.tsx`):
  - GoalForm with create mutation
  - Navigate to list on success
  - Error handling

- [ ] **1.1.13** Create GoalDetail page (`pages/GoalDetail.tsx`):
  - Display full goal info
  - Edit button → shows form
  - Delete button → confirms and deletes
  - Back navigation

- [ ] **1.1.14** Test full Goals flow:
  - Create goal from UI
  - See goal in list
  - View goal details
  - Edit goal
  - Delete goal

- [ ] **1.1.15** Commit: "Milestone 1.1 complete: Goals CRUD"

---

## Milestone 1.2: Activities CRUD (~1 week)

### Backend: Activities

- [ ] **1.2.1** Create Activity types (`types/activity.ts`):
  - Activity interface (or use Prisma-generated types)
  - CreateActivityInput
  - UpdateActivityInput
  - ActivityType enum

- [ ] **1.2.2** Create Activity service (`services/activityService.ts`):
  - Uses Prisma client directly
  - `findAll(filters)` - with date range, goal_id filters
  - `findById(id)`
  - `findByDate(date)` - activities for specific date
  - `create(data)` - validation (value required for quantity/duration)
  - `update(id, data)`
  - `softDelete(id)`
  - Event logging on mutations

- [ ] **1.2.3** Create Activity controller (`controllers/activityController.ts`):
  - Standard CRUD handlers
  - `getToday` handler for today's activities

- [ ] **1.2.4** Create Activity routes (`routes/activities.ts`):
  - `GET /activities` - list with filters
  - `GET /activities/today` - today's activities
  - `GET /activities/:id`
  - `POST /activities`
  - `PATCH /activities/:id`
  - `DELETE /activities/:id`

- [ ] **1.2.5** Register activity routes

- [ ] **1.2.6** Test with curl/Postman

### Frontend: Activities

- [ ] **1.2.7** Create Activity API hooks (`hooks/useActivities.ts`):
  - `useActivities(filters)`
  - `useTodayActivities()`
  - `useCreateActivity()`
  - `useUpdateActivity()`
  - `useDeleteActivity()`

- [ ] **1.2.8** Create ActivityRow component (`components/ActivityRow.tsx`):
  - Display description, type, value
  - Status indicator (planned/completed/skipped)
  - Click to edit

- [ ] **1.2.9** Create ActivityForm component (`components/ActivityForm.tsx`):
  - Description input
  - Activity type select
  - Value + unit inputs (conditional)
  - Goal select (optional)
  - Date picker
  - Status select
  - Notes textarea

- [ ] **1.2.10** Create ActivityList component (`components/ActivityList.tsx`):
  - Group by status (planned/completed)
  - Empty state

- [ ] **1.2.11** Test Activities CRUD from UI

- [ ] **1.2.12** Commit: "Milestone 1.2 complete: Activities CRUD"

---

## Milestone 1.3: Today View (~1 week)

- [ ] **1.3.1** Create TodayView page (`pages/TodayView.tsx`):
  - Date header (Today, Day Month Date)
  - Planned activities section
  - Completed activities section
  - Quick-add bar at bottom

- [ ] **1.3.2** Create QuickAdd component (`components/QuickAdd.tsx`):
  - Text input
  - Submit button
  - Opens ActivityForm modal/drawer

- [ ] **1.3.3** Create ActivityModal component (`components/ActivityModal.tsx`):
  - Modal wrapper for ActivityForm
  - Create and Edit modes

- [ ] **1.3.4** Implement complete activity action:
  - Click on planned activity
  - Quick complete button
  - Optional: edit value before completing

- [ ] **1.3.5** Implement skip activity action:
  - Mark planned activity as skipped

- [ ] **1.3.6** Make Today View the default route (`/`)

- [ ] **1.3.7** Style Today View for readability:
  - Clear visual hierarchy
  - Touch-friendly targets

- [ ] **1.3.8** Test Today View workflow:
  - Plan activities
  - Complete activities
  - Log ad-hoc activities
  - Skip activities

- [ ] **1.3.9** Commit: "Milestone 1.3 complete: Today View"

---

## Milestone 1.4: Progress Display (~1 week)

### Backend: Progress

- [ ] **1.4.1** Create Progress service (`services/progressService.ts`):
  - `calculateGoalProgress(goalId)`:
    - Sum activity values for goal
    - Calculate percentage if target exists
    - Count total activities
  - `getDashboardMetrics(period)`:
    - Total activities in period
    - Goals touched
    - Streak calculation

- [ ] **1.4.2** Create Progress controller (`controllers/progressController.ts`):
  - `getGoalProgress` - GET /goals/:id/progress
  - `getDashboard` - GET /metrics/dashboard

- [ ] **1.4.3** Create progress routes and register

- [ ] **1.4.4** Update Goal service to include progress:
  - Use Prisma aggregations
  - Attach progress to goal responses

- [ ] **1.4.5** Test progress endpoints

### Frontend: Progress

- [ ] **1.4.6** Create ProgressBar component (`components/ui/ProgressBar.tsx`):
  - Visual bar with percentage
  - Current / Target label

- [ ] **1.4.7** Update GoalCard to show progress

- [ ] **1.4.8** Update GoalDetail to show progress:
  - Progress bar
  - Activity count
  - Last activity date

- [ ] **1.4.9** Create basic Dashboard metrics on TodayView:
  - Goals with progress
  - This week's activity count

- [ ] **1.4.10** Test progress displays correctly:
  - Log activity
  - See goal progress update
  - Dashboard shows metrics

- [ ] **1.4.11** Commit: "Milestone 1.4 complete: Progress Display"

---

## Phase 1 Completion

- [ ] **1.5.1** Full integration test:
  - Create a goal with target
  - Plan activities for today
  - Complete activities
  - See progress update
  - Navigate between views

- [ ] **1.5.2** Fix any bugs found

- [ ] **1.5.3** Code cleanup:
  - Remove console.logs
  - Add missing types
  - Format code

- [ ] **1.5.4** Update README with:
  - Setup instructions
  - Development workflow
  - Current status

- [ ] **1.5.5** Commit: "Phase 1 complete: Manual Core MVP"

---

# Phase 2: Data & Polish (~3-4 weeks)

## 2.1 Week View

- [ ] **2.1.1** Create WeekView page (`pages/WeekView.tsx`)
- [ ] **2.1.2** Create WeekGrid component (7-day grid)
- [ ] **2.1.3** Create DayCell component (activities per day)
- [ ] **2.1.4** Add date navigation (prev/next week)
- [ ] **2.1.5** Implement click-day to view/add activities
- [ ] **2.1.6** Add route `/week`
- [ ] **2.1.7** Test week view

---

## 2.2 Visualizations

- [ ] **2.2.1** Install charting library (recharts or similar)
- [ ] **2.2.2** Create ActivityChart component (activities over time)
- [ ] **2.2.3** Create GoalProgressChart component
- [ ] **2.2.4** Add charts to dashboard/goal detail
- [ ] **2.2.5** Test visualizations

---

## 2.3 Streaks & Metrics

- [ ] **2.3.1** Implement streak calculation in ProgressService:
  - Current streak (consecutive days with activities)
  - Longest streak
- [ ] **2.3.2** Create StreakDisplay component
- [ ] **2.3.3** Add week-over-week comparison
- [ ] **2.3.4** Display on dashboard

---

## 2.4 Data Export

- [ ] **2.4.1** Create export endpoint: GET /export
  - Return all goals and activities as JSON
- [ ] **2.4.2** Create ExportButton component
- [ ] **2.4.3** Download as .json file
- [ ] **2.4.4** (Optional) CSV export

---

## 2.5 PWA Setup

- [ ] **2.5.1** Create manifest.json
- [ ] **2.5.2** Add app icons (multiple sizes)
- [ ] **2.5.3** Create basic service worker
- [ ] **2.5.4** Test PWA install on mobile browser
- [ ] **2.5.5** Test offline detection

---

## 2.6 Polish & UX

- [ ] **2.6.1** Loading states (skeletons)
- [ ] **2.6.2** Error states (friendly messages)
- [ ] **2.6.3** Empty states (helpful prompts)
- [ ] **2.6.4** Responsive testing (mobile/tablet/desktop)
- [ ] **2.6.5** Keyboard navigation
- [ ] **2.6.6** Focus management

---

## Phase 2 Completion

- [ ] **2.7.1** Full regression test
- [ ] **2.7.2** Performance check
- [ ] **2.7.3** Code cleanup
- [ ] **2.7.4** Commit: "Phase 2 complete: Data & Polish"

---

# Quick Reference

## Commands

```bash
# Start development
npm run dev

# Run Prisma migrations
npm run db:migrate -w @polaris/backend

# Generate Prisma client
npm run db:generate -w @polaris/backend

# Open Prisma Studio (database browser)
npm run db:studio -w @polaris/backend

# Build for production
npm run build

# Lint
npm run lint
```

## Key Files to Check

| File | Purpose |
|------|---------|
| `apps/backend/src/index.ts` | Server entry |
| `apps/backend/src/app.ts` | Fastify app |
| `apps/backend/src/lib/prisma.ts` | Prisma client |
| `apps/backend/prisma/schema.prisma` | Database schema |
| `apps/backend/src/routes/index.ts` | Route registration |
| `apps/frontend/src/App.tsx` | React root |
| `apps/frontend/src/services/api.ts` | API client |
| `packages/shared/src/types.ts` | Shared types |

---

# Progress Tracker

| Phase | Milestone | Status |
|-------|-----------|--------|
| 0 | Project Setup | ⬜ Not Started |
| 0 | Backend Setup | ⬜ Not Started |
| 0 | Database Setup | ⬜ Not Started |
| 0 | Frontend Setup | ⬜ Not Started |
| 0 | Shared Package | ⬜ Not Started |
| 0 | Dev Workflow | ⬜ Not Started |
| 1.1 | Goals CRUD | ⬜ Not Started |
| 1.2 | Activities CRUD | ⬜ Not Started |
| 1.3 | Today View | ⬜ Not Started |
| 1.4 | Progress | ⬜ Not Started |
| 2.1 | Week View | ⬜ Not Started |
| 2.2 | Visualizations | ⬜ Not Started |
| 2.3 | Streaks | ⬜ Not Started |
| 2.4 | Export | ⬜ Not Started |
| 2.5 | PWA | ⬜ Not Started |
| 2.6 | Polish | ⬜ Not Started |

**Legend:** ⬜ Not Started | 🔄 In Progress | ✅ Complete

---

**Work through this checklist step by step. Don't skip ahead. Each step builds on the previous.**
