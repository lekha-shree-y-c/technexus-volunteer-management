import React from 'react';
import Badge from './Badge';

interface VolunteerCardProps {
  id: string;
  name: string;
  role: string;
  place: string;
  status: string;
  joiningDate: string;
  email: string;
  photoUrl?: string | null;
  lastActiveDate?: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const VolunteerCard: React.FC<VolunteerCardProps> = ({
  id,
  name,
  role,
  place,
  status,
  joiningDate,
  email,
  photoUrl,
  lastActiveDate,
  onEdit,
  onDelete,
}) => {
  const getInitialBgColor = (initial: string) => {
    const colors = [
      'bg-blue-600', 'bg-purple-600', 'bg-pink-600',
      'bg-green-600', 'bg-cyan-600', 'bg-indigo-600',
      'bg-teal-600', 'bg-orange-600'
    ];
    return colors[initial.charCodeAt(0) % colors.length];
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-600 transition-all duration-150">
      {/* Card Content */}
      <div className="p-4 sm:p-6">
        {/* Avatar + Name Section */}
        <div className="flex items-start mb-4 gap-3 sm:gap-4">
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full ${photoUrl ? '' : getInitialBgColor(name.charAt(0))} flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0 overflow-hidden border border-slate-600/50`}>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-white truncate">{name}</h3>
            <p className="text-xs sm:text-sm text-slate-400 truncate">{role}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-4">
          <Badge variant={status === 'Active' ? 'success' : 'default'}>
            {status}
          </Badge>
          {/* Show Last Active date only for Inactive volunteers */}
          {status === 'Inactive' && lastActiveDate && (
            <p className="text-xs text-slate-500 mt-2">
              Last Active: {new Date(lastActiveDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Details Section */}
        <div className="space-y-1.5 sm:space-y-2 mb-4 text-xs sm:text-sm">
          {place && (
            <p className="text-slate-400 truncate">
              <span className="text-slate-500">Location:</span> {place}
            </p>
          )}
          <p className="text-slate-500 truncate">
            <span className="text-slate-600">Email:</span> <span className="text-slate-400">{email}</span>
          </p>
          <p className="text-slate-500">
            <span className="text-slate-600">Joined:</span> {new Date(joiningDate).toLocaleDateString()}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 sm:pt-3 border-t border-slate-700/30">
          <button
            onClick={() => onEdit(id)}
            className="flex-1 mt-2 sm:mt-3 bg-blue-600/90 hover:bg-blue-600 text-white text-xs sm:text-sm font-medium py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg transition-colors duration-150"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(id)}
            className="flex-1 mt-2 sm:mt-3 border border-slate-600 hover:border-red-600 text-slate-300 hover:text-red-400 hover:bg-red-600/10 text-xs sm:text-sm font-medium py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg transition-colors duration-150"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};

export default VolunteerCard;