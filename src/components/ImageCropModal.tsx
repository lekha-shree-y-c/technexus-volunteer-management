'use client';

import React, { useState } from 'react';
import Crop from 'react-easy-crop';
import Modal from './Modal';
import { getCroppedImage } from '@/lib/image-utils';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropConfirm: (croppedBlob: Blob) => Promise<void>;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropConfirm,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCropAreaChange = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setLoading(true);
    try {
      const croppedBlob = await getCroppedImage(imageSrc, croppedAreaPixels, rotation);
      await onCropConfirm(croppedBlob);
      onClose();
      // Reset state
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCroppedAreaPixels(null);
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!imageSrc) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crop Profile Photo">
      <div className="space-y-4">
        <div className="relative w-full h-96 bg-slate-900">
          <Crop
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1} // Square aspect ratio
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={handleCropAreaChange}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
          />
        </div>

        {/* Zoom Control */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-300">
            Zoom
          </label>
          <input
            type="range"
            min="1"
            max="3"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="text-xs text-slate-400">{(zoom * 100).toFixed(0)}%</div>
        </div>

        {/* Rotation Control */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-300">
            Rotation
          </label>
          <input
            type="range"
            min="0"
            max="360"
            step="15"
            value={rotation}
            onChange={(e) => setRotation(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="text-xs text-slate-400">{rotation}°</div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-slate-300 py-2 px-4 rounded-lg transition-colors duration-150 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-500 text-white py-2 px-4 rounded-lg transition-colors duration-150 font-medium"
          >
            {loading ? 'Processing...' : 'Confirm Crop'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ImageCropModal;
