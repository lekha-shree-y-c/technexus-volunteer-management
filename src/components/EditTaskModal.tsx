import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { supabase } from '@/lib/supabase';

interface Volunteer {
  id: string;
  full_name: string;
  status: string;
  profile_image_url?: string;
}

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
  onTaskUpdated: () => void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ isOpen, onClose, taskId, onTaskUpdated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('Pending');
  const [assignedVolunteers, setAssignedVolunteers] = useState<Volunteer[]>([]);
  const [availableVolunteers, setAvailableVolunteers] = useState<Volunteer[]>([]);
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskData();
      fetchAvailableVolunteers();
    }
  }, [isOpen, taskId]);

  const fetchTaskData = async () => {
    if (!taskId) return;

    const { data: task, error: taskError } = await supabase
      .from('tasks')
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
            status,
            profile_image_url
          )
        )
      `)
      .eq('id', taskId)
      .single();

    if (taskError) {
      console.error('Error fetching task:', taskError);
      return;
    }

    setTitle(task.title || '');
    setDescription(task.description || '');
    setDueDate(task.due_date || '');
    setStatus(task.status || 'Pending');

    const assigned = task.task_assignments?.map((ta: any) => ta.volunteers) || [];
    setAssignedVolunteers(assigned);
  };

  const fetchAvailableVolunteers = async () => {
    const { data, error } = await supabase
      .from('volunteers')
      .select('id, full_name, status, profile_image_url')
      .eq('status', 'Active');

    if (error) {
      console.error('Error fetching volunteers:', error);
    } else {
      setAvailableVolunteers(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !taskId) return;

    setLoading(true);
    setError('');

    try {
      // Update task
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDate || null,
          status,
        })
        .eq('id', taskId);

      if (taskError) throw taskError;

      // Get current assignments
      const { data: currentAssignments, error: assignError } = await supabase
        .from('task_assignments')
        .select('volunteer_id')
        .eq('task_id', taskId);

      if (assignError) throw assignError;

      const currentVolunteerIds = currentAssignments?.map(a => a.volunteer_id) || [];
      const newVolunteerIds = selectedVolunteers;

      // Volunteers to add
      const toAdd = newVolunteerIds.filter(id => !currentVolunteerIds.includes(id));
      // Volunteers to remove
      const toRemove = currentVolunteerIds.filter(id => !newVolunteerIds.includes(id));

      // Add new assignments
      if (toAdd.length > 0) {
        const assignments = toAdd.map(volunteerId => ({
          task_id: taskId,
          volunteer_id: volunteerId,
        }));
        const { error: addError } = await supabase
          .from('task_assignments')
          .insert(assignments);
        if (addError) throw addError;
      }

      // Remove old assignments
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('task_assignments')
          .delete()
          .eq('task_id', taskId)
          .in('volunteer_id', toRemove);
        if (removeError) throw removeError;
      }

      onTaskUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  const toggleVolunteer = (id: string) => {
    setSelectedVolunteers(prev =>
      prev.includes(id)
        ? prev.filter(v => v !== id)
        : [...prev, id]
    );
  };

  const removeAssignedVolunteer = (id: string) => {
    setAssignedVolunteers(prev => prev.filter(v => v.id !== id));
    setSelectedVolunteers(prev => prev.filter(v => v !== id));
  };

  const handleDelete = async () => {
    if (!taskId) return;

    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      // Delete task assignments first
      const { error: assignError } = await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', taskId);

      if (assignError) throw assignError;

      // Delete task
      const { error: taskError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (taskError) throw taskError;

      onTaskUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Task" size="xl">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Task Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 border-b border-slate-700 pb-2">Task Details</h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Task Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Right Column: Volunteers */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 border-b border-slate-700 pb-2">Assigned Volunteers</h3>
            
            {/* Currently Assigned */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Currently Assigned
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {assignedVolunteers.map((volunteer) => (
                  <div key={volunteer.id} className="flex items-center justify-between bg-slate-700 p-2 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm mr-3">
                        {volunteer.profile_image_url ? (
                          <img src={volunteer.profile_image_url} alt={volunteer.full_name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          volunteer.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="text-slate-200">{volunteer.full_name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAssignedVolunteer(volunteer.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Volunteers */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Add/Remove Volunteers
              </label>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {availableVolunteers.map((volunteer) => (
                  <div
                    key={volunteer.id}
                    onClick={() => toggleVolunteer(volunteer.id)}
                    className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedVolunteers.includes(volunteer.id)
                        ? 'bg-blue-600'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm mr-3">
                      {volunteer.profile_image_url ? (
                        <img src={volunteer.profile_image_url} alt={volunteer.full_name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        volunteer.full_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="text-slate-200">{volunteer.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-700">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Delete Task
          </button>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {loading ? 'Updating...' : 'Update Task'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default EditTaskModal;