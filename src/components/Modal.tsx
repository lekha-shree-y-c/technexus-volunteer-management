import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-3 sm:p-4 md:p-0">
      <div className={`bg-slate-800 border border-slate-700/50 rounded-t-xl md:rounded-xl p-4 sm:p-6 w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto shadow-2xl`}>
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700/30">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg p-1 transition-colors duration-150"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;