import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const baseClasses = 'px-3 py-1.5 text-xs font-semibold rounded-full inline-block';
  const variantClasses = {
    default: 'bg-slate-700/80 text-slate-200 border border-slate-600/50',
    success: 'bg-green-600/20 text-green-300 border border-green-600/40',
    warning: 'bg-yellow-600/20 text-yellow-300 border border-yellow-600/40',
    error: 'bg-red-600/20 text-red-300 border border-red-600/40',
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;