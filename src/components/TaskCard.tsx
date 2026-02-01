import React from 'react';
import Badge from './Badge';

interface TaskCardProps {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: string;
  assignedVolunteers: { id: string; name: string; avatarUrl?: string }[];
  onToggleComplete: (id: string) => void;
  onEdit: (id: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  id,
  title,
  description,
  dueDate,
  status,
  assignedVolunteers,
  onToggleComplete,
  onEdit,
}) => {
  const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== 'Completed';
  const isCompleted = status === 'Completed';

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-600 transition-all duration-150">
      {/* Card Content */}
      <div className="p-4 sm:p-6">
        {/* Title Section */}
        <div className="flex items-start justify-between mb-3 gap-2 sm:gap-3">
          <h3 className={`text-sm sm:text-base font-semibold flex-1 ${isCompleted ? 'text-slate-500 line-through' : 'text-white'}`}>
            {title}
          </h3>
          {isCompleted && <span className="text-green-400 text-lg sm:text-xl flex-shrink-0">✓</span>}
        </div>

        {/* Description */}
        {description && (
          <p className={`text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed ${isCompleted ? 'text-slate-600' : 'text-slate-400'}`}>
            {description}
          </p>
        )}

        {/* Due Date Badge */}
        {dueDate && (
          <div className="mb-3 sm:mb-4">
            <Badge variant={isOverdue ? 'error' : 'warning'}>
              Due: {new Date(dueDate).toLocaleDateString()}
            </Badge>
          </div>
        )}

        {/* Assigned Volunteers */}
        {assignedVolunteers.length > 0 && (
          <div className="mb-3 sm:mb-4">
            <p className="text-xs text-slate-500 mb-2 font-medium">Assigned to:</p>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {assignedVolunteers.map((volunteer) => (
                <div key={volunteer.id} className="flex items-center gap-1 sm:gap-2 bg-slate-700/50 border border-slate-600/50 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 text-xs">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs flex-shrink-0 font-medium">
                    {volunteer.avatarUrl ? (
                      <img src={volunteer.avatarUrl} alt={volunteer.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      volunteer.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="text-slate-300 truncate text-xs">{volunteer.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 sm:pt-3 border-t border-slate-700/30">
          <button
            onClick={() => onEdit(id)}
            className="flex-1 mt-2 sm:mt-3 bg-blue-600/90 hover:bg-blue-600 text-white text-xs sm:text-sm font-medium py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg transition-colors duration-150"
          >
            Edit
          </button>
          <button
            onClick={() => onToggleComplete(id)}
            className={`flex-1 mt-2 sm:mt-3 text-xs sm:text-sm font-medium py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg transition-colors duration-150 ${
              isCompleted
                ? 'border border-slate-600 hover:border-slate-500 text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
                : 'bg-purple-600/90 hover:bg-purple-600 text-white'
            }`}
          >
            {isCompleted ? 'Reopen' : 'Complete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;