import React from 'react';

interface DashboardCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'cyan';
  isClickable?: boolean;
  onClick?: () => void;
  description?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  icon,
  color,
  isClickable = false,
  onClick,
  description,
}) => {
  const colorClasses = {
    blue: 'border-blue-500/20 bg-gradient-to-br from-blue-900/10 to-blue-800/5 hover:border-blue-500/40 hover:from-blue-900/20 hover:to-blue-800/10',
    green: 'border-green-500/20 bg-gradient-to-br from-green-900/10 to-green-800/5 hover:border-green-500/40 hover:from-green-900/20 hover:to-green-800/10',
    red: 'border-red-500/20 bg-gradient-to-br from-red-900/10 to-red-800/5 hover:border-red-500/40 hover:from-red-900/20 hover:to-red-800/10',
    purple: 'border-purple-500/20 bg-gradient-to-br from-purple-900/10 to-purple-800/5 hover:border-purple-500/40 hover:from-purple-900/20 hover:to-purple-800/10',
    orange: 'border-orange-500/20 bg-gradient-to-br from-orange-900/10 to-orange-800/5 hover:border-orange-500/40 hover:from-orange-900/20 hover:to-orange-800/10',
    cyan: 'border-cyan-500/20 bg-gradient-to-br from-cyan-900/10 to-cyan-800/5 hover:border-cyan-500/40 hover:from-cyan-900/20 hover:to-cyan-800/10',
  };

  const iconColorClasses = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
    cyan: 'text-cyan-400',
  };

  return (
    <div
      className={`rounded-xl background-card border transition-all duration-200 ${
        isClickable
          ? `cursor-pointer ${colorClasses[color]}`
          : 'border-slate-700/50 bg-slate-800/50'
      } p-6 sm:p-8`}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {/* Icon and Title Container */}
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg bg-slate-700/30 ${iconColorClasses[color]}`}>
          {icon}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-slate-300 text-sm font-medium mb-2">{title}</h3>

      {/* Value */}
      <p className="text-3xl sm:text-4xl font-bold text-white mb-2">{value}</p>

      {/* Description */}
      {description && (
        <p className="text-xs text-slate-500">{description}</p>
      )}
    </div>
  );
};

export default DashboardCard;
