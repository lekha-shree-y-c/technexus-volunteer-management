import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { supabase } from '@/lib/supabase';

interface Volunteer {
  id: string;
  full_name: string;
  profile_image_url?: string;
}

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskAssigned: () => void;
}

const AssignTaskModal: React.FC<AssignTaskModalProps> = ({ isOpen, onClose, onTaskAssigned }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchVolunteers();
    }
  }, [isOpen]);

  const fetchVolunteers = async () => {
    const { data, error } = await supabase
      .from('volunteers')
      .select('id, full_name, profile_image_url')
      .eq('status', 'Active');

    if (error) {
      console.error('Error fetching volunteers:', error);
    } else {
      setVolunteers(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate || selectedVolunteers.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch('/api/assign-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          due_date: dueDate || null,
          volunteer_ids: selectedVolunteers
        })
      });

      const contentType = response.headers.get('content-type') || '';
      const result = contentType.includes('application/json')
        ? await response.json()
        : { error: await response.text() };

      console.log('Assign task response:', { status: response.status, result });

      if (!response.ok) {
        const errorMsg = result?.error || result?.details || 'Failed to assign task';
        console.error('Assign task error:', errorMsg);
        throw new Error(errorMsg);
      }

      setTitle('');
      setDescription('');
      setDueDate('');
      setSelectedVolunteers([]);
      onTaskAssigned();
      onClose();
    } catch (error) {
      console.error('Error assigning task:', error);
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign New Task">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Task Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
            rows={3}
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Due Date <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Assign to Volunteers
          </label>
          <div className="max-h-40 overflow-y-auto space-y-2 border border-slate-700/30 rounded-lg p-2 bg-slate-700/20">
            {volunteers.length > 0 ? (
              volunteers.map((volunteer) => (
                <div
                  key={volunteer.id}
                  onClick={() => toggleVolunteer(volunteer.id)}
                  className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors duration-150 ${
                    selectedVolunteers.includes(volunteer.id)
                      ? 'bg-blue-600/30 border border-blue-500/50'
                      : 'bg-slate-700/30 hover:bg-slate-700/50 border border-transparent'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-sm mr-3 flex-shrink-0 font-medium">
                    {volunteer.profile_image_url ? (
                      <img src={volunteer.profile_image_url} alt={volunteer.full_name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      volunteer.full_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="text-slate-200">{volunteer.full_name}</span>
                  {selectedVolunteers.includes(volunteer.id) && (
                    <span className="ml-auto text-blue-400 text-lg">✓</span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-sm p-2">No active volunteers available</p>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-slate-300 py-2 px-4 rounded-lg transition-colors duration-150 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !title.trim() || !dueDate || selectedVolunteers.length === 0}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-500 text-white py-2 px-4 rounded-lg transition-colors duration-150 font-medium"
          >
            {loading ? 'Assigning...' : 'Assign Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AssignTaskModal;