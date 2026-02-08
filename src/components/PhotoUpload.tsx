'use client';

import React, { useRef } from 'react';
import { X } from 'lucide-react';

interface PhotoUploadProps {
  preview: string | null;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  loading?: boolean;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  preview,
  onFileSelect,
  onRemove,
  loading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && ['image/jpeg', 'image/png'].includes(file.type)) {
      onFileSelect(file);
    } else {
      alert('Please select a JPG or PNG image');
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-slate-300 mb-2">
        Profile Photo
      </label>

      {preview ? (
        <div className="space-y-3">
          <div className="relative w-32 h-32 mx-auto">
            <div className="w-full h-full rounded-lg overflow-hidden border-2 border-blue-500/50 bg-slate-700/50">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={onRemove}
              disabled={loading}
              className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white rounded-full p-1.5 transition-colors duration-150"
              aria-label="Remove photo"
            >
              <X size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-full text-sm bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-slate-300 py-2 px-3 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Change Photo
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="w-full border-2 border-dashed border-slate-600/50 hover:border-blue-500/50 text-slate-400 hover:text-slate-300 py-4 px-4 rounded-lg transition-colors duration-150 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl">📷</span>
            <span>Click to upload photo (JPG/PNG)</span>
            <span className="text-xs text-slate-500">Max 1MB, will be resized to 256x256px</span>
          </div>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFileChange}
        className="hidden"
        disabled={loading}
      />
    </div>
  );
};

export default PhotoUpload;
