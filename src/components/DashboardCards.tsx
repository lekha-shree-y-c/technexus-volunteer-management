'use client';

import React, { useState } from 'react';
import DashboardCard from './DashboardCard';
import TaskListModal from './TaskListModal';
import VolunteerListModal from './VolunteerListModal';

interface DashboardCardsProps {
  totalVolunteers: number;
  activeVolunteers: number;
  inactiveVolunteers: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
  loading?: boolean;
}

const DashboardCards: React.FC<DashboardCardsProps> = ({
  totalVolunteers,
  activeVolunteers,
  inactiveVolunteers,
  pendingTasks,
  completedTasks,
  overdueTasks,
  loading = false,
}) => {
  const [openModal, setOpenModal] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-40 bg-slate-700/30 rounded-xl border border-slate-700/50" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Total Volunteers Card (Non-clickable) */}
        <DashboardCard
          title="Total Volunteers"
          value={totalVolunteers}
          icon={<span className="text-2xl">👥</span>}
          color="blue"
          isClickable={false}
          description="All registered volunteers"
        />

        {/* Active Volunteers Card */}
        <DashboardCard
          title="Active Volunteers"
          value={activeVolunteers}
          icon={<span className="text-2xl">✅</span>}
          color="green"
          isClickable={true}
          onClick={() => setOpenModal('active')}
          description="Click to view details"
        />

        {/* Inactive Volunteers Card */}
        <DashboardCard
          title="Inactive Volunteers"
          value={inactiveVolunteers}
          icon={<span className="text-2xl">⏸️</span>}
          color="orange"
          isClickable={true}
          onClick={() => setOpenModal('inactive')}
          description="Click to view details"
        />

        {/* Pending Tasks Card */}
        <DashboardCard
          title="Pending Tasks"
          value={pendingTasks}
          icon={<span className="text-2xl">⏳</span>}
          color="purple"
          isClickable={true}
          onClick={() => setOpenModal('pending')}
          description="Click to view details"
        />

        {/* Completed Tasks Card */}
        <DashboardCard
          title="Completed Tasks"
          value={completedTasks}
          icon={<span className="text-2xl">✨</span>}
          color="cyan"
          isClickable={true}
          onClick={() => setOpenModal('completed')}
          description="Click to view details"
        />

        {/* Overdue Tasks Card */}
        <DashboardCard
          title="Overdue Tasks"
          value={overdueTasks}
          icon={<span className="text-2xl">⚠️</span>}
          color="red"
          isClickable={true}
          onClick={() => setOpenModal('overdue')}
          description="Click to view details"
        />
      </div>

      {/* Volunteer Modals */}
      <VolunteerListModal
        isOpen={openModal === 'active'}
        onClose={() => setOpenModal(null)}
        status="Active"
      />

      <VolunteerListModal
        isOpen={openModal === 'inactive'}
        onClose={() => setOpenModal(null)}
        status="Inactive"
      />

      {/* Task Modals */}
      <TaskListModal
        isOpen={openModal === 'pending'}
        onClose={() => setOpenModal(null)}
        categoryType="pending"
      />

      <TaskListModal
        isOpen={openModal === 'completed'}
        onClose={() => setOpenModal(null)}
        categoryType="completed"
      />

      <TaskListModal
        isOpen={openModal === 'overdue'}
        onClose={() => setOpenModal(null)}
        categoryType="overdue"
      />
    </>
  );
};

export default DashboardCards;
