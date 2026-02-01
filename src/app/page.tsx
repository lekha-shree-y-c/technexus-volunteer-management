"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
        .from("volunteers")
        .select("status");

      if (volError) throw volError;

      const totalVolunteers = volunteers?.length || 0;
      const activeVolunteers = volunteers?.filter(v => v.status === 'Active').length || 0;
      const inactiveVolunteers = totalVolunteers - activeVolunteers;

      // Fetch tasks
      const { data: tasks, error: taskError } = await supabase
        .from("tasks")
        .select("status, due_date");

      if (taskError) throw taskError;

      const pendingTasks = tasks?.filter(t => t.status === 'Pending').length || 0;
      const completedTasks = tasks?.filter(t => t.status === 'Completed').length || 0;
      const overdueTasks = tasks?.filter(t => t.status === 'Pending' && t.due_date && new Date(t.due_date) < new Date()).length || 0;

      setMetrics({
        totalVolunteers,
        activeVolunteers,
        inactiveVolunteers,
        pendingTasks,
        completedTasks,
        overdueTasks,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-3 sm:p-6">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 sm:mb-2">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-slate-400">Overview of your volunteer community</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700/50 text-red-300 rounded-lg text-sm sm:text-base">
            Error: {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-400 py-12">Loading dashboard...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-slate-800/50 border border-slate-700/50 p-4 sm:p-6 rounded-xl hover:shadow-md transition-all duration-150">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">Total Volunteers</h3>
              <p className="text-2xl sm:text-3xl font-bold text-blue-400">{metrics.totalVolunteers}</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 p-4 sm:p-6 rounded-xl hover:shadow-md transition-all duration-150">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">Active Volunteers</h3>
              <p className="text-2xl sm:text-3xl font-bold text-green-400">{metrics.activeVolunteers}</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 p-4 sm:p-6 rounded-xl hover:shadow-md transition-all duration-150">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">Inactive Volunteers</h3>
              <p className="text-2xl sm:text-3xl font-bold text-slate-400">{metrics.inactiveVolunteers}</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 p-4 sm:p-6 rounded-xl hover:shadow-md transition-all duration-150">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">Pending Tasks</h3>
              <p className="text-2xl sm:text-3xl font-bold text-yellow-400">{metrics.pendingTasks}</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 p-4 sm:p-6 rounded-xl hover:shadow-md transition-all duration-150">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">Completed Tasks</h3>
              <p className="text-2xl sm:text-3xl font-bold text-green-400">{metrics.completedTasks}</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 p-4 sm:p-6 rounded-xl hover:shadow-md transition-all duration-150">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">Overdue Tasks</h3>
              <p className="text-2xl sm:text-3xl font-bold text-red-400">{metrics.overdueTasks}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


