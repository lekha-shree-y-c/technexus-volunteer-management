
import React, { useState } from 'react';
import Modal from './Modal';
import { supabase } from '@/lib/supabase';

interface AddVolunteerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVolunteerAdded: () => void;
}

const AddVolunteerModal: React.FC<AddVolunteerModalProps> = ({ isOpen, onClose, onVolunteerAdded }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [place, setPlace] = useState('');
  const [status, setStatus] = useState('Active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !role.trim() || !place.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase
        .from('volunteers')
        .insert([{
          full_name: name.trim(),
          email: email.trim(),
          role: role.trim(),
          place: place.trim(),
          status: status,
          joining_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        }]);

      if (error) throw error;

      setName('');
      setEmail('');
      setRole('');
      setPlace('');
      setStatus('Active');
      onVolunteerAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add volunteer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Volunteer">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Role
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Location
          </label>
          <input
            type="text"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}
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
            disabled={loading || !name.trim() || !email.trim() || !role.trim()}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-500 text-white py-2 px-4 rounded-lg transition-colors duration-150 font-medium"
          >
            {loading ? 'Adding...' : 'Add Volunteer'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddVolunteerModal;