import React, { useState } from 'react';
import Modal from './Modal';

interface Volunteer {
  id: string;
  full_name: string;
  email: string;
  role: string;
  place: string;
  joining_date: string;
  status: string;
}

interface EditVolunteerModalProps {
  isOpen: boolean;
  onClose: () => void;
  volunteer: Volunteer | null;
  onSave: (volunteer: Volunteer) => void;
  onDelete: (id: string) => void;
}

const EditVolunteerModal: React.FC<EditVolunteerModalProps> = ({ isOpen, onClose, volunteer, onSave, onDelete }) => {
  const [formData, setFormData] = useState<Partial<Volunteer>>({});

  React.useEffect(() => {
    if (volunteer) {
      setFormData(volunteer);
    }
  }, [volunteer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (volunteer && formData.full_name && formData.email && formData.role && formData.place && formData.status) {
      onSave({ ...volunteer, ...formData } as Volunteer);
      onClose();
    }
  };

  const handleDelete = () => {
    if (volunteer && confirm("Are you sure you want to remove this volunteer? This action cannot be undone.")) {
      onDelete(volunteer.id);
      onClose();
    }
  };

  const handleChange = (field: keyof Volunteer, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Volunteer">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-300 mb-2">Full Name</label>
          <input
            type="text"
            value={formData.full_name || ''}
            onChange={(e) => handleChange('full_name', e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-300 mb-2">Email</label>
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-300 mb-2">Role</label>
          <input
            type="text"
            value={formData.role || ''}
            onChange={(e) => handleChange('role', e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-300 mb-2">Location</label>
          <input
            type="text"
            value={formData.place || ''}
            onChange={(e) => handleChange('place', e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-300 mb-2">Status</label>
          <select
            value={formData.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
            required
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Delete Button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleDelete}
            className="w-full border border-red-600/50 hover:border-red-600 text-red-400 hover:text-red-300 hover:bg-red-600/10 py-2 px-4 rounded-lg transition-colors duration-150 font-medium"
          >
            Remove Volunteer
          </button>
        </div>

        {/* Action Buttons */}
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
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-150 font-medium"
          >
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditVolunteerModal;