# Clickable Dashboard Cards System - Documentation

## Overview

This system provides a fully interactive and reusable dashboard card component for displaying volunteer metrics. All cards are clickable (except "Total Volunteers") and display filtered task lists in modals when clicked.

## Components

### 1. DashboardCard Component
**File:** `src/components/DashboardCard.tsx`

A reusable card component that displays a metric with icon, value, and optional click handler.

#### Props:
```typescript
interface DashboardCardProps {
  title: string;                    // Card title (e.g., "Active Volunteers")
  value: number;                    // The numeric value to display
  icon: React.ReactNode;            // Icon element (emoji or custom component)
  color: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'cyan';
  isClickable?: boolean;            // Enable click functionality (default: false)
  onClick?: () => void;             // Handler for card click
  description?: string;             // Optional description text
}
```

#### Features:
- **Color-coded borders and backgrounds** based on the `color` prop
- **Gradient backgrounds** that enhance on hover
- **Keyboard accessible** - supports Enter/Space key when focused
- **Hover effects** - cursor changes to pointer, background adjusts
- **Responsive design** - works on mobile, tablet, desktop

#### Usage:
```tsx
<DashboardCard
  title="Active Volunteers"
  value={42}
  icon={<span className="text-2xl">✅</span>}
  color="green"
  isClickable={true}
  onClick={() => handleCardClick('active')}
  description="Click to view details"
/>
```

---

### 2. TaskListModal Component
**File:** `src/components/TaskListModal.tsx`

Modal that displays a filtered list of tasks for a specific category.

#### Props:
```typescript
interface TaskListModalProps {
  isOpen: boolean;                           // Modal visibility state
  onClose: () => void;                       // Close handler
  title: string;                             // Modal title
  tasks: Task[];                             // Array of tasks to display
  categoryType: 'active' | 'inactive' | 'pending' | 'completed' | 'overdue';
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'Pending' | 'Active' | 'Completed' | 'Overdue';
  dueDate?: string;
  assignedVolunteer?: string;
  priority?: 'Low' | 'Medium' | 'High';
}
```

#### Features:
- **Status badges** - color-coded based on task status
- **Priority indicators** - High/Medium/Low priority badges
- **Date formatting** - user-friendly date display
- **Empty state** - helpful message when no tasks exist
- **Responsive layout** - adapts to different screen sizes
- **Smooth animations** - hover effects on task items

#### Usage:
```tsx
<TaskListModal
  isOpen={openModal === 'pending'}
  onClose={() => setOpenModal(null)}
  title="Pending Tasks"
  tasks={pendingTasks}
  categoryType="pending"
/>
```

---

### 3. DashboardCards Component
**File:** `src/components/DashboardCards.tsx`

Main container component that manages state and displays all dashboard cards with their modals.

#### Props:
```typescript
interface DashboardCardsProps {
  totalVolunteers: number;
  activeVolunteers: number;
  inactiveVolunteers: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
  allTasks?: Task[];          // All available tasks (filtered by component)
  loading?: boolean;          // Show skeleton loader during fetch
}
```

#### Features:
- **State management** - handles modal open/close state
- **Task filtering** - automatically filters tasks by category
- **Multiple modals** - separate modal for each clickable card
- **Loading skeleton** - placeholder grid while data loads
- **Responsive grid** - 1 column on mobile, 2 on tablet, 3 on desktop

#### Usage:
```tsx
<DashboardCards
  totalVolunteers={50}
  activeVolunteers={35}
  inactiveVolunteers={15}
  pendingTasks={12}
  completedTasks={8}
  overdueTasks={2}
  allTasks={SAMPLE_TASKS}
  loading={false}
/>
```

---

## Data Structure

### Task Interface
```typescript
interface Task {
  id: string;                    // Unique identifier
  title: string;                 // Task name
  description?: string;          // Detailed description
  status: 'Pending' | 'Active' | 'Completed' | 'Overdue';
  dueDate?: string;             // ISO date string (YYYY-MM-DD)
  assignedVolunteer?: string;   // Volunteer name
  priority?: 'Low' | 'Medium' | 'High';
}
```

---

## Sample Data

**File:** `src/lib/sample-tasks.ts`

Provides pre-defined task examples for testing and development.

### Available Functions:

#### `SAMPLE_TASKS`
Array of 10 sample tasks with various statuses and priorities.

```typescript
import { SAMPLE_TASKS } from '@/lib/sample-tasks';

const tasks = SAMPLE_TASKS;
```

#### `filterTasksByStatus(tasks, status)`
Filter tasks by their status.

```typescript
import { filterTasksByStatus } from '@/lib/sample-tasks';

const pendingTasks = filterTasksByStatus(SAMPLE_TASKS, 'Pending');
const completedTasks = filterTasksByStatus(SAMPLE_TASKS, 'Completed');
```

#### `filterTasksByPriority(tasks, priority)`
Filter tasks by priority level.

```typescript
import { filterTasksByPriority } from '@/lib/sample-tasks';

const highPriorityTasks = filterTasksByPriority(SAMPLE_TASKS, 'High');
```

#### `getOverdueTasks(tasks)`
Get all overdue tasks (excluding completed ones).

```typescript
import { getOverdueTasks } from '@/lib/sample-tasks';

const overdue = getOverdueTasks(SAMPLE_TASKS);
```

---

## Styling & Colors

### Card Colors
Cards use a consistent color palette with gradient backgrounds:

| Color | Usage | Gradient |
|-------|-------|----------|
| `blue` | Total Volunteers | Blue gradient (900-800) |
| `green` | Active Volunteers | Green gradient (900-800) |
| `orange` | Inactive Volunteers | Orange gradient (900-800) |
| `purple` | Pending Tasks | Purple gradient (900-800) |
| `cyan` | Completed Tasks | Cyan gradient (900-800) |
| `red` | Overdue Tasks | Red gradient (900-800) |

### Hover Effects
- **Clickable cards**: Border and background colors intensify
- **Non-clickable cards**: Static appearance with subtle shadow
- **Task items in modal**: Background brightens on hover

### Responsive Breakpoints
```css
/* Mobile-first approach */
sm: 640px   /* Tablets */
md: 768px   /* Medium screens */
lg: 1024px  /* Large screens */
xl: 1280px  /* Extra large screens */
```

Grid layout:
- **Mobile**: 1 column
- **Tablet (sm)**: 2 columns
- **Desktop (lg)**: 3 columns

---

## Integration Guide

### Step 1: Import Components
```tsx
import DashboardCards from '@/components/DashboardCards';
import { SAMPLE_TASKS } from '@/lib/sample-tasks';
```

### Step 2: Use in Your Dashboard
```tsx
export default function Dashboard() {
  const [tasks, setTasks] = useState(SAMPLE_TASKS);
  const [metrics, setMetrics] = useState({
    totalVolunteers: 50,
    activeVolunteers: 35,
    inactiveVolunteers: 15,
    pendingTasks: 12,
    completedTasks: 8,
    overdueTasks: 2,
  });

  return (
    <div className="bg-slate-900 p-8">
      <DashboardCards
        totalVolunteers={metrics.totalVolunteers}
        activeVolunteers={metrics.activeVolunteers}
        inactiveVolunteers={metrics.inactiveVolunteers}
        pendingTasks={metrics.pendingTasks}
        completedTasks={metrics.completedTasks}
        overdueTasks={metrics.overdueTasks}
        allTasks={tasks}
        loading={false}
      />
    </div>
  );
}
```

### Step 3: Fetch Real Data from Database
```tsx
useEffect(() => {
  const fetchData = async () => {
    // Fetch volunteers
    const { data: volunteers } = await supabase
      .from('volunteers')
      .select('*');

    // Fetch tasks
    const { data: dbTasks } = await supabase
      .from('tasks')
      .select('*');

    // Map tasks to Task interface
    const mappedTasks = dbTasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      dueDate: task.due_date,
      assignedVolunteer: task.volunteer_name,
      priority: task.priority,
    }));

    setTasks(mappedTasks);
  };

  fetchData();
}, []);
```

---

## Customization

### Change Card Colors
Modify the color mapping in `DashboardCard.tsx`:
```tsx
const colorClasses = {
  blue: 'border-blue-500/20 bg-gradient-to-br from-blue-900/10...',
  // Add more colors as needed
};
```

### Add Custom Icons
Use any React component or emoji:
```tsx
<DashboardCard
  icon={<CustomIcon />}  // Custom SVG component
  // or
  icon={<span className="text-2xl">🎯</span>}  // Emoji
/>
```

### Adjust Modal Size
In `TaskListModal.tsx`, pass different `size` prop:
```tsx
<Modal size="xl">  {/* 'sm' | 'md' | 'lg' | 'xl' */}
  ...
</Modal>
```

### Customize Task Filters
Modify the `getTasksByCategory()` function in `DashboardCards.tsx`:
```tsx
const getTasksByCategory = (category: string): Task[] => {
  switch (category) {
    case 'active':
      return allTasks.filter(task => task.status === 'Active');
    // Add more custom filters
  }
};
```

---

## Keyboard Accessibility

All cards are keyboard accessible:
- **Tab**: Navigate between cards
- **Enter** or **Space**: Click focused card
- **Escape** (in modal): Close modal

---

## Testing Checklist

- [ ] Cards render with correct values
- [ ] Clicking cards opens appropriate modals
- [ ] Modals display correct filtered tasks
- [ ] Modals close when clicking close button
- [ ] Hover effects work on desktop
- [ ] Cards are responsive on mobile
- [ ] Keywords are accessible (Tab, Enter, Space)
- [ ] Total Volunteers card is non-clickable
- [ ] Empty state shows when no tasks exist
- [ ] Status badges display correct colors

---

## File Structure

```
src/
  components/
    DashboardCard.tsx          # Individual card component
    TaskListModal.tsx          # Modal for task display
    DashboardCards.tsx         # Container component
  lib/
    sample-tasks.ts            # Sample data & utilities
  app/
    dashboard-example.tsx      # Full page example
    page.tsx                   # Your existing dashboard (integrate here)
```

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Performance Tips

1. **Memoize callbacks** to prevent re-renders:
```tsx
const handleCardClick = useCallback(() => setOpenModal('pending'), []);
```

2. **Use React.memo** for DashboardCard if needed:
```tsx
export default React.memo(DashboardCard);
```

3. **Lazy load tasks** - fetch only when modal opens
4. **Use virtual scrolling** for large task lists (100+ items)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Cards not clickable | Check `isClickable={true}` is set |
| Modal not opening | Verify `openModal` state is managed correctly |
| Wrong tasks display | Check `getTasksByCategory()` filter logic |
| Styling looks different | Ensure Tailwind CSS is configured |
| Tasks not appearing | Verify `Task[]` interface matches your data |

