# Quick Integration Guide - Clickable Dashboard Cards

## What Was Created

✅ **3 React Components:**
1. `DashboardCard.tsx` - Individual card component (clickable or static)
2. `TaskListModal.tsx` - Modal to display filtered tasks
3. `DashboardCards.tsx` - Container managing state & displaying all 6 cards

✅ **Sample Data:**
- `sample-tasks.ts` - 10 sample tasks + utility functions

✅ **Example Implementation:**
- `dashboard-example.tsx` - Full working example

---

## Integration Steps

### Option 1: Quick Integration (Minimal Changes)
Replace your existing dashboard cards with the new system.

#### 1. Update `src/app/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardCards from "@/components/DashboardCards";
import { SAMPLE_TASKS } from "@/lib/sample-tasks";
import type { Task } from "@/components/TaskListModal";

type Metrics = {
  totalVolunteers: number;
  activeVolunteers: number;
  inactiveVolunteers: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
};

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalVolunteers: 0,
    activeVolunteers: 0,
    inactiveVolunteers: 0,
    pendingTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
  });
  const [tasks, setTasks] = useState<Task[]>(SAMPLE_TASKS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch volunteers
      const { data: volunteers, error: volError } = await supabase
        .from("volunteers")
        .select("status");

      if (volError) throw volError;

      const totalVolunteers = volunteers?.length || 0;
      const activeVolunteers = volunteers?.filter(v => v.status === 'Active').length || 0;
      const inactiveVolunteers = totalVolunteers - activeVolunteers;

      // Fetch tasks with all required fields
      const { data: dbTasks, error: taskError } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          status,
          due_date,
          priority,
          volunteers (name)
        `);

      if (taskError) throw taskError;

      const pendingTasks = dbTasks?.filter(t => t.status === 'Pending').length || 0;
      const completedTasks = dbTasks?.filter(t => t.status === 'Completed').length || 0;
      const overdueTasks = dbTasks?.filter(t => t.status === 'Overdue').length || 0;

      // Map database tasks to Task interface
      const mappedTasks: Task[] = (dbTasks || []).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        dueDate: task.due_date,
        priority: task.priority,
        assignedVolunteer: task.volunteers?.name || 'Unassigned',
      }));

      setMetrics({
        totalVolunteers,
        activeVolunteers,
        inactiveVolunteers,
        pendingTasks,
        completedTasks,
        overdueTasks,
      });

      setTasks(mappedTasks);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Failed to load dashboard metrics');
      // Keep sample data as fallback
      setTasks(SAMPLE_TASKS);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Dashboard
          </h1>
          <p className="text-slate-400">
            Click on any card (except Total Volunteers) to view more details.
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Dashboard Cards */}
        <DashboardCards
          totalVolunteers={metrics.totalVolunteers}
          activeVolunteers={metrics.activeVolunteers}
          inactiveVolunteers={metrics.inactiveVolunteers}
          pendingTasks={metrics.pendingTasks}
          completedTasks={metrics.completedTasks}
          overdueTasks={metrics.overdueTasks}
          allTasks={tasks}
          loading={loading}
        />
      </div>
    </div>
  );
}
```

#### 2. That's it! Your dashboard now has:
✅ Clickable cards  
✅ Modal task lists  
✅ Full keyboard accessibility  
✅ Responsive design  
✅ Hover effects  

---

## Testing with Sample Data

If you want to test with sample data first:

```tsx
// Use sample data without fetching from database
const [tasks, setTasks] = useState<Task[]>(SAMPLE_TASKS);

// In fetchMetrics, set metrics manually:
setMetrics({
  totalVolunteers: 50,
  activeVolunteers: 35,
  inactiveVolunteers: 15,
  pendingTasks: 12,
  completedTasks: 8,
  overdueTasks: 2,
});
```

---

## Database Schema Requirements

Make sure your `tasks` table has these columns:

```sql
tasks (
  id: UUID,
  title: VARCHAR,
  description: VARCHAR,
  status: VARCHAR ('Pending', 'Active', 'Completed', 'Overdue'),
  due_date: DATE,
  priority: VARCHAR ('Low', 'Medium', 'High'),
  volunteer_id: UUID (FK)
)
```

For the example above, ensure you have a relationship with volunteers table:

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  title VARCHAR NOT NULL,
  description VARCHAR,
  status VARCHAR NOT NULL,
  due_date DATE,
  priority VARCHAR,
  volunteer_id UUID REFERENCES volunteers(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Advanced: Customization

### Change Card Order
In `DashboardCards.tsx`, reorder the `<DashboardCard>` components.

### Rename Card Titles
Update the `title` prop in each card:
```tsx
<DashboardCard
  title="Your Custom Title"
  // ...
/>
```

### Change Icons
Replace emoji/icons with your own:
```tsx
<DashboardCard
  icon={<YourCustomIcon />}
  // ...
/>
```

### Modify Colors
Update the `color` prop:
```tsx
<DashboardCard
  color="purple"  // 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'cyan'
  // ...
/>
```

### Make Total Volunteers Clickable
In `DashboardCards.tsx`, change:
```tsx
isClickable={false}
```
to:
```tsx
isClickable={true}
onClick={() => setOpenModal('total')}
```

Then add a new modal config for 'total' category.

---

## Component Props Reference

### DashboardCard Props
```typescript
{
  title: string;                              // "Active Volunteers"
  value: number;                              // 35
  icon: React.ReactNode;                      // <span>✅</span>
  color: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'cyan';
  isClickable?: boolean;                      // true/false
  onClick?: () => void;                       // () => setOpenModal('active')
  description?: string;                       // "Click to view details"
}
```

### TaskListModal Props
```typescript
{
  isOpen: boolean;                            // true/false
  onClose: () => void;                        // () => setOpenModal(null)
  title: string;                              // "Active Volunteers"
  tasks: Task[];                              // Task array filtered by category
  categoryType: 'active' | 'inactive' | 'pending' | 'completed' | 'overdue';
}
```

### DashboardCards Props
```typescript
{
  totalVolunteers: number;                    // Total count
  activeVolunteers: number;                   // Active count
  inactiveVolunteers: number;                 // Inactive count
  pendingTasks: number;                       // Pending count
  completedTasks: number;                     // Completed count
  overdueTasks: number;                       // Overdue count
  allTasks?: Task[];                          // Array of all tasks (gets filtered)
  loading?: boolean;                          // Show skeleton loader
}
```

---

## Keyboard Navigation

Users can navigate with keyboard:
- **Tab** → Move to next card
- **Enter/Space** → Click focused card
- **Escape** → Close modal

---

## Styling Details

All components use **Tailwind CSS** with:
- Dark theme (slate-800, slate-900)
- Gradient backgrounds on hover
- Color-coded badges
- Responsive padding/text sizes
- Smooth transitions

---

## File Locations

```
src/
├── components/
│   ├── DashboardCard.tsx        ← Single card
│   ├── TaskListModal.tsx         ← Modal for tasks
│   ├── DashboardCards.tsx        ← Container
│   └── Modal.tsx                 ← Existing (already have)
├── lib/
│   ├── sample-tasks.ts           ← Sample data
│   └── supabase.ts               ← Existing
└── app/
    ├── page.tsx                  ← Update this
    └── dashboard-example.tsx     ← Reference implementation
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Task" type not found | Import: `import type { Task } from '@/components/TaskListModal';` |
| Cards not clickable | Ensure `isClickable={true}` is set in DashboardCards.tsx |
| Modal not closing | Check `onClose={() => setOpenModal(null)}` is passed |
| Styling looks wrong | Verify Tailwind CSS is configured in `tailwind.config.js` |
| Tasks not filtering | Check your database query returns correct `status` values |

---

## Next Steps

1. ✅ Copy the 3 component files to your project
2. ✅ Copy the sample-tasks.ts file
3. ✅ Update your `src/app/page.tsx` with the integration code above
4. ✅ Adjust the database query to match your schema
5. ✅ Test with sample data first
6. ✅ Switch to real database data
7. ✅ Customize colors, icons, and titles as needed

---

## Support Files

- **Full Documentation**: `DASHBOARD_CARDS_DOCUMENTATION.md`
- **Sample Data**: `src/lib/sample-tasks.ts`
- **Example Page**: `src/app/dashboard-example.tsx`
- **Component Files**: `src/components/DashboardCard*.tsx`

---

Need help? Check the documentation or the example implementations!
