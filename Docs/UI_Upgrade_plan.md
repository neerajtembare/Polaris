# Polaris UI Overhaul: The Celestial Design System

This plan outlines the steps required to implement the new "Celestial" UI generated via StitchMCP. We will update the global styles and refactor the core React components to achieve the premium, glassmorphism-based dark mode aesthetic shown in the mockups.

## User Review Required
> [!IMPORTANT]
> This is a significant UI refactor that touches layout, navigation, and core component styles. Please review the planned component changes below. If you approve, I will proceed to execute this plan.

## Proposed Changes

---

### Global Styling & Layout

#### [MODIFY] `apps/frontend/src/index.css`
- Update `@layer base` to standardize the new dark background (`bg-[#0e0e13]` or Tailwind's closest equivalent, extended in config if necessary).
- Enforce the "No-Line Rule" by ensuring base text colors are `gray-300` and `gray-400` instead of stark pure white where appropriate.

#### [MODIFY] `apps/frontend/tailwind.config.js`
- Extend the theme to include our specific space tones if necessary, though standard Tailwind colors (gray-900, gray-950, indigo-400/500/600) map extremely well to the Celestial system. Add `backdrop-blur` utilities if needed.

#### [MODIFY] `apps/frontend/src/components/layout/AppLayout.tsx`
- Refine the sidebar aesthetics.
- Update the `NavLink` active state to proudly use the Indigo highlight instead of a subdued background.

---

### Dashboards & Core Pages

#### [MODIFY] `apps/frontend/src/pages/Dashboard.tsx`
- **Header:** Add the new greeting header: `"Good evening, Neeraj"` with the current date formatted cleanly below it.
- **Stat Cards:** Update the 4 core metrics (Completed, Rate, Streak, Active) to use a horizontal flex/grid layout with glassmorphism styling (`bg-gray-900/40 backdrop-blur-md border border-gray-800/50`).
- **Heatmap:** Refine the colors to use tighter indigo scaling to match the Celestial palette.

#### [MODIFY] `apps/frontend/src/pages/TodayView.tsx`
- **Layout Shift:** Completely rewrite the layout to be a **3-column Kanban board**.
- **Columns:** "Planned", "Completed" (with green checkmarks), and "Skipped".
- **Header:** Implement the "Today" header with the orange pill streak badge (`🔥 12d streak`) and the primary "Log activity" button on the far right.

---

### Reusable Components

#### [MODIFY] `apps/frontend/src/components/activities/ActivityCard.tsx`
- Overhaul card styling to support the Kanban layout.
- Use `rounded-xl` and subtle `border-gray-800`.
- Style the linked goal text in muted tones and emphasize the value/unit in `indigo-400`.
- Update the action buttons to use the new CTA styling (gradient backgrounds or subtle transparency).

#### [MODIFY] `apps/frontend/src/components/goals/GoalCard.tsx`
- Apply the same glassmorphism treatment as the new `ActivityCard` to ensure visual consistency across the app.

#### [MODIFY] `apps/frontend/src/components/ui/Badge.tsx`
- Redesign the `StatusBadge` and `TimeframeBadge` to use softer, semi-transparent tints rather than flat solid grays/colors, increasing the premium feel of the app.

---

## Open Questions

> [!CAUTION]
> The Kanban layout in the Today View assumes there is horizontal space. On mobile, this will need to gracefully degrade into a single scrollable column (stacking Planned -> Completed -> Skipped). Is this acceptable for the mobile viewport?

## Verification Plan

### Automated Tests
- Run `npm run build` from `apps/frontend` to ensure no Typescript issues have been introduced due to component prop changes.

### Manual Verification
1. I will boot up the frontend development server (`npm run dev`).
2. I will visually verify that the Dashboard and Today View perfectly match the generated StitchMCP mockups.
3. I will test adding, completing, and skipping activities to ensure the new Kanban layout behaves smoothly during state changes.
