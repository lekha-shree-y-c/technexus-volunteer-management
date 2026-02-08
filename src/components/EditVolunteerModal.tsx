import React, { useState } from 'react';
import Modal from './Modal';
import PhotoUpload from './PhotoUpload';
import ImageCropModal from './ImageCropModal';
import { supabase } from '@/lib/supabase';
import { getImageDataUrl } from '@/lib/image-utils';

interface Volunteer {
  id: string;
  full_name: string;
  email: string;
  role: string;
  place: string;
  joining_date: string;
  status: string;
  photo_url?: string | null;
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
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [newPhoto, setNewPhoto] = useState(false);

  React.useEffect(() => {
    if (volunteer) {
      setFormData(volunteer);
      setPhotoPreview(volunteer.photo_url || null);
      setCroppedBlob(null);
      setNewPhoto(false);
    }
  }, [volunteer]);

  const handlePhotoSelect = async (file: File) => {
    try {
      const dataUrl = await getImageDataUrl(file);
      setPhotoPreview(dataUrl);
      setCropModalOpen(true);
      setNewPhoto(true);
    } catch (err) {
      console.error('Failed to load image');
    }
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCroppedBlob(blob);
    setCropModalOpen(false);
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setCroppedBlob(null);
    setNewPhoto(true);
  };

  const uploadPhotoToSupabase = async (blob: Blob, volunteerId: string): Promise<string | null> => {
    try {
      const fileName = `${volunteerId}-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('volunteer-photos')
        .upload(`photos/${fileName}`, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('volunteer-photos')
        .getPublicUrl(`photos/${fileName}`);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Error uploading photo:', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volunteer || !formData.full_name || !formData.email || !formData.role || !formData.place || !formData.joining_date || !formData.status) {
      return;
    }

    setLoading(true);
    try {
      let photoUrl = formData.photo_url;

      // Handle photo upload if new photo was selected
      if (newPhoto && croppedBlob) {
        const uploadedUrl = await uploadPhotoToSupabase(croppedBlob, volunteer.id);
        if (uploadedUrl) {
          photoUrl = uploadedUrl;
        }
      } else if (newPhoto && !photoPreview) {
        // Remove photo if user deleted it
        photoUrl = null;
      }

      // Pass the updated data to parent component
      onSave({ 
        ...volunteer, 
        ...formData, 
        photo_url: photoUrl 
      } as Volunteer);
      
      onClose();
    } catch (err) {
      console.error('Error saving volunteer:', err);
      alert('Failed to save volunteer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (volunteer && confirm("Are you sure you want to remove this volunteer? This action cannot be undone.")) {
      onDelete(volunteer.id);
      onClose();
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Edit Volunteer">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-300 mb-2">Full Name</label>
            <input
              type="text"
              value={formData.full_name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-300 mb-2">Email</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-300 mb-2">Role</label>
            <input
              type="text"
              value={formData.role || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-300 mb-2">Location</label>
            <input
              type="text"
              value={formData.place || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, place: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-300 mb-2">Joining Date</label>
            <input
              type="date"
              value={formData.joining_date || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, joining_date: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-300 mb-2">Status</label>
            <select
              value={formData.status || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
              required
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="mb-6">
            <PhotoUpload
              preview={photoPreview}
              onFileSelect={handlePhotoSelect}
              onRemove={handleRemovePhoto}
              loading={loading}
            />
          </div>

          {/* Delete Button */}
          <div className="mb-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="w-full border border-red-600/50 hover:border-red-600 text-red-400 hover:text-red-300 hover:bg-red-600/10 py-2 px-4 rounded-lg transition-colors duration-150 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Remove Volunteer
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-slate-300 py-2 px-4 rounded-lg transition-colors duration-150 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-500 text-white py-2 px-4 rounded-lg transition-colors duration-150 font-medium"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
      <ImageCropModal
        isOpen={cropModalOpen}
        imageSrc={photoPreview}
        onClose={() => setCropModalOpen(false)}
        onCropConfirm={handleCropConfirm}
      />
    </>
  );
};

export default EditVolunteerModal;