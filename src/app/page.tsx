"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardCards from "@/components/DashboardCards";

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
        .from('volunteers')
        .select('status');

      if (volError) throw volError;

      const totalVolunteers = volunteers?.length || 0;
      const activeVolunteers = volunteers?.filter(v => v.status === 'Active').length || 0;
      const inactiveVolunteers = volunteers?.filter(v => v.status === 'Inactive').length || 0;

      // Fetch tasks
      const { data: tasks, error: taskError } = await supabase
        .from('tasks')
        .select('status, due_date');

      if (taskError) throw taskError;

      // Calculate task metrics with proper filtering
      const now = new Date();
      
      // Pending: not completed AND due date not passed
      const pendingTasks = (tasks || []).filter((task) => {
        const isNotCompleted = task.status !== 'Completed';
        const dueDate = task.due_date ? new Date(task.due_date) : null;
        const notOverdue = dueDate ? dueDate >= now : true;
        return isNotCompleted && notOverdue;
      }).length;

      // Completed: marked as completed
      const completedTasks = (tasks || []).filter(
        (task) => task.status === 'Completed'
      ).length;

      // Overdue: not completed AND due date has passed
      const overdueTasks = (tasks || []).filter((task) => {
        const isNotCompleted = task.status !== 'Completed';
        const dueDate = task.due_date ? new Date(task.due_date) : null;
        const isPastDue = dueDate ? dueDate < now : false;
        return isNotCompleted && isPastDue;
      }).length;

      setMetrics({
        totalVolunteers,
        activeVolunteers,
        inactiveVolunteers,
        pendingTasks,
        completedTasks,
        overdueTasks,
      });
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Volunteer Dashboard
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={fetchMetrics}
              className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        <DashboardCards
          totalVolunteers={metrics.totalVolunteers}
          activeVolunteers={metrics.activeVolunteers}
          inactiveVolunteers={metrics.inactiveVolunteers}
          pendingTasks={metrics.pendingTasks}
          completedTasks={metrics.completedTasks}
          overdueTasks={metrics.overdueTasks}
          loading={loading}
        />
      </div>
    </div>
  );
}


