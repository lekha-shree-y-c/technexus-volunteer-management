"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import TaskCard from "@/components/TaskCard";
import AssignTaskModal from "@/components/AssignTaskModal";
import EditTaskModal from "@/components/EditTaskModal";

type Task = {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: string;
  assigned_volunteers: {
    id: string;
    name: string;
    avatarUrl?: string;
  }[];
};

type TaskAssignmentRow = {
  volunteer_id: string;
  volunteers: {
    id: string;
    full_name: string;
    profile_image_url?: string | null;
  } | {
    id: string;
    full_name: string;
    profile_image_url?: string | null;
  }[] | null;
};

type TaskQueryRow = {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: string;
  task_assignments?: TaskAssignmentRow[];
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  async function fetchTasks() {
    const { data, error } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        description,
        due_date,
        status,
        task_assignments (
          volunteer_id,
          volunteers (
            id,
            full_name,
            profile_image_url
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
    } else {
      const getVolunteerFromAssignment = (assignment: TaskAssignmentRow) => {
        const relation = assignment.volunteers;
        if (!relation) {
          return null;
        }

        return Array.isArray(relation) ? relation[0] : relation;
      };

      const formattedTasks = ((data ?? []) as unknown as TaskQueryRow[]).map((task) => ({
        ...task,
        assigned_volunteers: (task.task_assignments ?? [])
          .map(getVolunteerFromAssignment)
          .filter((volunteer): volunteer is { id: string; full_name: string; profile_image_url?: string | null } => Boolean(volunteer))
          .map((volunteer) => ({
            id: volunteer.id,
            name: volunteer.full_name,
            avatarUrl: volunteer.profile_image_url ?? undefined,
          }))
      }));
      setTasks(formattedTasks);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTasks();
  }, []);

  const handleToggleComplete = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';

    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      console.error("Error updating task:", error);
    } else {
      fetchTasks();
    }
  };

  const handleEdit = (id: string) => {
    setEditingTaskId(id);
    setIsEditModalOpen(true);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 sm:mb-2">
              Tasks
            </h1>
            <p className="text-sm sm:text-base text-slate-400">Manage and track community tasks</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors duration-150 w-full sm:w-auto whitespace-nowrap"
          >
            + Assign Task
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              id={task.id}
              title={task.title}
              description={task.description}
              dueDate={task.due_date}
              status={task.status}
              assignedVolunteers={task.assigned_volunteers}
              onToggleComplete={handleToggleComplete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      </div>

      <AssignTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTaskAssigned={fetchTasks}
      />

      <EditTaskModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        taskId={editingTaskId}
        onTaskUpdated={fetchTasks}
      />
    </div>
  );
}