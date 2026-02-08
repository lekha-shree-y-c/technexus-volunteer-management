import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import Badge from './Badge';
import { supabase } from '@/lib/supabase';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  due_date?: string;
  priority?: string;
  volunteer_name?: string;
}

interface TaskListModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryType: 'pending' | 'completed' | 'overdue';
}

const TaskListModal: React.FC<TaskListModalProps> = ({
  isOpen,
  onClose,
  categoryType,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
    }
  }, [isOpen, categoryType]);

  const fetchTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('id, title, description, status, due_date, priority')
        .order('due_date', { ascending: true });

      if (fetchError) throw fetchError;

      // Filter tasks based on category
      const now = new Date();
      let filteredTasks: Task[] = [];

      if (categoryType === 'pending') {
        // Pending: not completed AND due date not passed
        filteredTasks = (data || []).filter((task) => {
          const isNotCompleted = task.status !== 'Completed';
          const dueDate = task.due_date ? new Date(task.due_date) : null;
          const notOverdue = dueDate ? dueDate >= now : true;
          return isNotCompleted && notOverdue;
        });
      } else if (categoryType === 'completed') {
        // Completed: marked as completed
        filteredTasks = (data || []).filter((task) => task.status === 'Completed');
      } else if (categoryType === 'overdue') {
        // Overdue: not completed AND due date has passed
        filteredTasks = (data || []).filter((task) => {
          const isNotCompleted = task.status !== 'Completed';
          const dueDate = task.due_date ? new Date(task.due_date) : null;
          const isPastDue = dueDate ? dueDate < now : false;
          return isNotCompleted && isPastDue;
        });
      }

      setTasks(filteredTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): 'default' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'Active':
        return 'warning';
      case 'Pending':
        return 'warning';
      case 'Overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority?: string): 'default' | 'success' | 'warning' | 'error' => {
    switch (priority) {
      case 'High':
        return 'error';
      case 'Medium':
        return 'warning';
      case 'Low':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTitleText = () => {
    switch (categoryType) {
      case 'pending':
        return 'Pending Tasks';
      case 'completed':
        return 'Completed Tasks';
      case 'overdue':
        return 'Overdue Tasks';
      default:
        return 'Tasks';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitleText()} size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-4 text-red-500">⚠️</div>
          <p className="text-red-400 font-medium mb-1">{error}</p>
          <button
            onClick={fetchTasks}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-4 text-slate-600">📋</div>
          <p className="text-slate-400 font-medium mb-1">No tasks found</p>
          <p className="text-slate-500 text-sm">
            There are no {categoryType} tasks at the moment.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-slate-400 text-sm mb-4">
            Showing {tasks.length} {categoryType} task{tasks.length !== 1 ? 's' : ''}
          </p>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-4 rounded-lg border border-slate-700/50 bg-slate-700/30 hover:bg-slate-700/50 transition-colors duration-150"
            >
              {/* Task Header */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <h4 className="text-white font-semibold flex-1 text-sm sm:text-base">
                  {task.title}
                </h4>
                <div className="flex gap-2 flex-shrink-0">
                  {task.priority && (
                    <Badge variant={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                  )}
                  <Badge variant={getStatusColor(task.status)}>
                    {task.status}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              {task.description && (
                <p className="text-slate-400 text-xs sm:text-sm mb-3">
                  {task.description}
                </p>
              )}

              {/* Task Details Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-slate-500">
                {task.due_date && (
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span>{formatDate(task.due_date)}</span>
                  </div>
                )}
                {task.volunteer_name && (
                  <div className="flex items-center gap-2">
                    <span>👤</span>
                    <span>{task.volunteer_name}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default TaskListModal;
