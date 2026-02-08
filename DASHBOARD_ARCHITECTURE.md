# Clickable Dashboard Cards - Architecture & Features

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│           Dashboard Page (page.tsx)                  │
│  - Fetches metrics from Supabase                    │
│  - Manages task data                                │
│  - Passes props to DashboardCards                   │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│         DashboardCards Component                     │
│ - Manages modal open/close state                    │
│ - Filters tasks by category                        │
│ - Renders all 6 cards + 5 modals                   │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐
   │Card 1   │ │Card 2   │ │Card 3   │
   │(Static) │ │(Click)  │ │(Click)  │
   └─────────┘ └────┬────┘ └────┬────┘
                    │           │
                    ▼           ▼
              ┌──────────────────────────┐
              │   TaskListModal          │
              │ - Shows filtered tasks   │
              │ - Status badges         │
              │ - Priority indicators   │
              └──────────────────────────┘
```

---

## Component Hierarchy

```
Dashboard (page.tsx)
│
├── DashboardCards (Container Component)
│   ├── DashboardCard (Total Volunteers - Non-clickable)
│   ├── DashboardCard (Active Volunteers - Clickable)
│   │   └── TaskListModal (Active Tasks)
│   ├── DashboardCard (Inactive Volunteers - Clickable)
│   │   └── TaskListModal (Inactive Tasks)
│   ├── DashboardCard (Pending Tasks - Clickable)
│   │   └── TaskListModal (Pending Tasks)
│   ├── DashboardCard (Completed Tasks - Clickable)
│   │   └── TaskListModal (Completed Tasks)
│   └── DashboardCard (Overdue Tasks - Clickable)
│       └── TaskListModal (Overdue Tasks)
```

---

## User Interaction Flow

```
1. USER LANDS ON DASHBOARD
   ├─ Data loads
   ├─ 6 cards display with metrics
   └─ User sees "Click to view" hint on 5 cards

2. USER CLICKS A CARD
   ├─ Modal state updates
   ├─ Tasks filtered by category
   ├─ Modal displays with filtered tasks
   └─ Task list shows with badges & details

3. USER VIEWS TASK DETAILS
   ├─ Sees task title, description
   ├─ Views priority badge (Low/Medium/High)
   ├─ Views status badge (Pending/Active/Completed/Overdue)
   ├─ Reads due date & assigned volunteer
   └─ Can scroll through all tasks

4. USER CLOSES MODAL
   ├─ Clicks X button or outside
   ├─ Modal state resets
   └─ Returns to dashboard
```

---

## Feature Showcase

### 1. Clickable Cards
```
┌───────────────────────────────┐
│  ✅  Active Volunteers         │
│                               │
│             35                │
│                               │
│  ↳ Click to view              │
│                               │
│  On Hover:                    │
│  • Border color brightens     │
│  • Background adjusts         │
│  • Cursor changes to pointer  │
└───────────────────────────────┘
```

### 2. Non-Clickable Card
```
┌───────────────────────────────┐
│  👥  Total Volunteers          │
│                               │
│             50                │
│                               │
│  All registered volunteers    │
│                               │
│  (No interaction allowed)     │
└───────────────────────────────┘
```

### 3. Task List Modal
```
╔════════════════════════════════════╗
║  ACTIVE VOLUNTEERS          [✕]    ║
╠════════════════════════════════════╣
║                                    ║
║ ┌──────────────────────────────┐  ║
║ │ Community Cleanup Drive     │  ║
║ │                              │  ║
║ │ Help clean up local park...  │  ║
║ │                              │  ║
║ │ 📅 Feb 15, 2026  [High] [✓] │  ║
║ └──────────────────────────────┘  ║
║                                    ║
║ ┌──────────────────────────────┐  ║
║ │ Senior Center Support        │  ║
║ │ Assist elderly residents...  │  ║
║ │                              │  ║
║ │ 📅 Feb 20, 2026  [Med] [✓]  │  ║
║ └──────────────────────────────┘  ║
║                                    ║
╚════════════════════════════════════╝
```

---

## Styling Features

### Card Colors (with gradients on hover)
```
Blue (Total Volunteers)
├─ Border: border-blue-500/20
├─ Background: from-blue-900/10 to-blue-800/5
└─ On Hover: from-blue-900/20 to-blue-800/10

Green (Active Volunteers)
├─ Border: border-green-500/20
├─ Background: from-green-900/10 to-green-800/5
└─ On Hover: from-green-900/20 to-green-800/10

Orange (Inactive Volunteers)
├─ Border: border-orange-500/20
├─ Background: from-orange-900/10 to-orange-800/5
└─ On Hover: from-orange-900/20 to-orange-800/10

Purple (Pending Tasks)
├─ Border: border-purple-500/20
├─ Background: from-purple-900/10 to-purple-800/5
└─ On Hover: from-purple-900/20 to-purple-800/10

Cyan (Completed Tasks)
├─ Border: border-cyan-500/20
├─ Background: from-cyan-900/10 to-cyan-800/5
└─ On Hover: from-cyan-900/20 to-cyan-800/10

Red (Overdue Tasks)
├─ Border: border-red-500/20
├─ Background: from-red-900/10 to-red-800/5
└─ On Hover: from-red-900/20 to-red-800/10
```

### Responsive Grid Layout
```
Mobile (< 640px)
┌─────────┐
│Card 1   │
├─────────┤
│Card 2   │
├─────────┤
│Card 3   │
├─────────┤
│Card 4   │
├─────────┤
│Card 5   │
├─────────┤
│Card 6   │
└─────────┘

Tablet (640px - 1024px)
┌─────────┬─────────┐
│Card 1   │Card 2   │
├─────────┼─────────┤
│Card 3   │Card 4   │
├─────────┼─────────┤
│Card 5   │Card 6   │
└─────────┴─────────┘

Desktop (1024px+)
┌─────────┬─────────┬─────────┐
│Card 1   │Card 2   │Card 3   │
├─────────┼─────────┼─────────┤
│Card 4   │Card 5   │Card 6   │
└─────────┴─────────┴─────────┘
```

---

## Data Flow Diagram

```
┌──────────────────┐
│   Supabase DB    │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  fetchMetrics() in page.tsx           │
│  ├─ Query volunteers table            │
│  ├─ Count total, active, inactive     │
│  ├─ Query tasks table                 │
│  └─ Count pending, completed, overdue │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  State in page.tsx                   │
│  ├─ metrics (counts)                 │
│  ├─ tasks (full Task[])              │
│  └─ loading/error states             │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Pass to DashboardCards Component    │
│  ├─ All metric values                │
│  ├─ Full tasks array                 │
│  └─ loading flag                     │
└────────┬─────────────────────────────┘
         │
         ├─────────────────────────────┐
         │                             │
         ▼                             ▼
┌──────────────┐        ┌──────────────────────┐
│DashboardCard │        │TaskListModal         │
│Components    │        │(Only renders when    │
│             │        │modal is open)       │
└──────────────┘        └──────────────────────┘
```

---

## Task Filtering Logic

```
All Tasks
   │
   ├─ Active Status
   │  └─ → "Active Volunteers" Card
   │
   ├─ Pending Status
   │  └─ → "Pending Tasks" Card
   │
   ├─ Completed Status
   │  └─ → "Completed Tasks" Card
   │
   ├─ Overdue Status
   │  └─ → "Overdue Tasks" Card
   │
   └─ (All except Total)
      └─ → "Inactive Volunteers" Card
```

---

## State Management

```
DashboardCards Component State:
┌────────────────────────────────────┐
│ openModal: string | null           │
│                                    │
│ '' (null)      → All modals closed │
│ 'active'       → Active modal open │
│ 'inactive'     → Inactive modal    │
│ 'pending'      → Pending modal     │
│ 'completed'    → Completed modal   │
│ 'overdue'      → Overdue modal     │
└────────────────────────────────────┘
```

---

## Accessibility Features

```
├─ Keyboard Navigation
│  ├─ Tab key moves focus
│  ├─ Enter/Space activates card
│  └─ Escape closes modal
│
├─ ARIA Attributes
│  ├─ role="button" on clickable cards
│  ├─ tabIndex="0" for focus
│  └─ Semantic HTML structure
│
├─ Visual Indicators
│  ├─ Cursor pointer on hover
│  ├─ Focus ring on keyboard
│  └─ Color contrast (WCAG AA)
│
└─ Screen Readers
   ├─ Proper heading hierarchy
   ├─ Descriptive text labels
   └─ Button role announced
```

---

## Performance Considerations

```
Optimization Strategies:
├─ Component Memoization
│  └─ Use React.memo() for DashboardCard
│
├─ Lazy Loading
│  └─ Modal content only renders when open
│
├─ Event Handlers
│  └─ Use useCallback to prevent re-renders
│
├─ Task Filtering
│  └─ Done in component (not DB query)
│
└─ CSS Classes
   └─ All classes are static (Tailwind)
```

---

## File Size Overview

```
DashboardCard.tsx        ~2 KB
TaskListModal.tsx        ~3 KB
DashboardCards.tsx       ~4 KB
sample-tasks.ts          ~3 KB
─────────────────────────────────
Total                    ~12 KB

Plus Tailwind CSS selectors (cached)
```

---

## Browser Compatibility

```
Supported:
✓ Chrome 90+
✓ Firefox 88+
✓ Safari 14+
✓ Edge 90+
✓ Mobile browsers (iOS Safari, Chrome Mobile)

Uses:
✓ Array methods (filter, map)
✓ Object spread (...props)
✓ Template literals
✓ React Hooks (useState, useCallback)
✓ Tailwind CSS 3.0+
```

---

## Example Metrics Flow

```
User Dashboard Load:
│
├─ Load totalVolunteers: 50
├─ Load activeVolunteers: 35
├─ Load inactiveVolunteers: 15
├─ Load pendingTasks: 12
├─ Load completedTasks: 8
├─ Load overdueTasks: 2
├─ Load allTasks[]: 22 tasks
│
└─ Render:
   ├─ Card 1: "👥 Total: 50" 🔒 (locked)
   ├─ Card 2: "✅ Active: 35" 🔓 (clickable)
   ├─ Card 3: "⏸️ Inactive: 15" 🔓
   ├─ Card 4: "⏳ Pending: 12" 🔓
   ├─ Card 5: "✨ Completed: 8" 🔓
   └─ Card 6: "⚠️ Overdue: 2" 🔓
```

---

## Summary

| Aspect | Details |
|--------|---------|
| **Components** | 3 (DashboardCard, TaskListModal, DashboardCards) |
| **Clickable Cards** | 5 out of 6 cards |
| **Modals** | 5 task filter modals |
| **Sample Tasks** | 10 pre-made tasks |
| **Responsive** | Mobile, Tablet, Desktop |
| **Keyboard Access** | Full support |
| **Colors** | 6 color schemes |
| **Total Size** | ~12 KB (components) |
| **Dependencies** | React, Tailwind CSS, TypeScript |

