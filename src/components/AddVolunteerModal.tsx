
import React, { useState } from 'react';
import Modal from './Modal';
import PhotoUpload from './PhotoUpload';
import ImageCropModal from './ImageCropModal';
import { supabase } from '@/lib/supabase';
import { getImageDataUrl } from '@/lib/image-utils';

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
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Photo upload states
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);

  const handlePhotoSelect = async (file: File) => {
    try {
      const dataUrl = await getImageDataUrl(file);
      setPhotoPreview(dataUrl);
      setCropModalOpen(true);
    } catch (err) {
      setError('Failed to load image');
    }
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCroppedBlob(blob);
    setCropModalOpen(false);
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setCroppedBlob(null);
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
    if (!name.trim() || !email.trim() || !role.trim() || !place.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { data: insertedData, error: insertError } = await supabase
        .from('volunteers')
        .insert([{
          full_name: name.trim(),
          email: email.trim(),
          role: role.trim(),
          place: place.trim(),
          status: status,
          joining_date: joiningDate,
        }])
        .select('id');

      if (insertError) throw insertError;

      const volunteerId = insertedData?.[0]?.id;

      if (croppedBlob && volunteerId) {
        const photoUrl = await uploadPhotoToSupabase(croppedBlob, volunteerId);
        if (photoUrl) {
          const { error: updateError } = await supabase
            .from('volunteers')
            .update({ photo_url: photoUrl })
            .eq('id', volunteerId);
          
          if (updateError) console.error('Error updating photo URL:', updateError);
        }
      }

      setName('');
      setEmail('');
      setRole('');
      setPlace('');
      setStatus('Active');
      setJoiningDate(new Date().toISOString().split('T')[0]);
      setPhotoPreview(null);
      setCroppedBlob(null);
      
      onVolunteerAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add volunteer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
          <div className="mb-4">
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
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Joining Date
            </label>
            <input
              type="date"
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
              required
            />
          </div>
          <div className="mb-6">
            <PhotoUpload
              preview={photoPreview}
              onFileSelect={handlePhotoSelect}
              onRemove={handleRemovePhoto}
              loading={loading}
            />
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
              disabled={loading}
              className="flex-1 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-slate-300 py-2 px-4 rounded-lg transition-colors duration-150 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
      <ImageCropModal
        isOpen={cropModalOpen}
        imageSrc={photoPreview}
        onClose={() => setCropModalOpen(false)}
        onCropConfirm={handleCropConfirm}
      />
    </>
  );
};

export default AddVolunteerModal;