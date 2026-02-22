import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { supabase } from '@/lib/supabase';

interface Volunteer {
  id: string;
  full_name: string;
  email: string;
  status: 'Active' | 'Inactive';
  role: string;
  place?: string;
  joining_date?: string;
  last_active_date?: string;
}

interface VolunteerListModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'Active' | 'Inactive';
}

const VolunteerListModal: React.FC<VolunteerListModalProps> = ({
  isOpen,
  onClose,
  status,
}) => {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchVolunteers();
    }
  }, [isOpen, status]);

  const fetchVolunteers = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Fetching volunteers with status:', status);
      
      // First, try a simple query to test connection
      const { count, error: countError } = await supabase
        .from('volunteers')
        .select('*', { count: 'exact', head: true });
      
      console.log('Table check - count:', count, 'error:', countError);
      
      if (countError) {
        throw new Error(`Table access error: ${countError.message || 'Cannot access volunteers table'}`);
      }
      
      // Now fetch the actual data
      const { data, error: fetchError } = await supabase
        .from('volunteers')
        .select('id, full_name, email, status, role, place, joining_date')
        .eq('status', status)
        .order('full_name', { ascending: true });

      console.log('Supabase response:', { data, error: fetchError });

      if (fetchError) {
        console.error('Supabase error details:', fetchError);
        const errorMsg = fetchError.message || fetchError.details || fetchError.hint || 'Failed to fetch volunteers';
        setError(`Database error: ${errorMsg}`);
        setLoading(false);
        return;
      }
      
      if (!data) {
        console.warn('No data returned from Supabase');
        setVolunteers([]);
        return;
      }
      
      console.log(`Successfully fetched ${data.length} volunteers`);
      
      // Fetch last active date for inactive volunteers
      if (status === 'Inactive') {
        const volunteersWithLastActive = await Promise.all(
          data.map(async (volunteer) => {
            const { data: lastAssignment } = await supabase
              .from('task_assignments')
              .select('assigned_at')
              .eq('volunteer_id', volunteer.id)
              .order('assigned_at', { ascending: false })
              .limit(1);

            const lastActiveDate = lastAssignment && lastAssignment.length > 0
              ? lastAssignment[0].assigned_at
              : volunteer.joining_date;

            return {
              ...volunteer,
              last_active_date: lastActiveDate
            };
          })
        );
        setVolunteers(volunteersWithLastActive);
      } else {
        setVolunteers(data);
      }
    } catch (err) {
      console.error('Error fetching volunteers:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load volunteers';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const title = `${status} Volunteers`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-4 text-red-500">⚠️</div>
          <p className="text-red-400 font-medium mb-1">{error}</p>
          <button
            onClick={fetchVolunteers}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      ) : volunteers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-4 text-slate-600">👥</div>
          <p className="text-slate-400 font-medium mb-1">No volunteers found</p>
          <p className="text-slate-500 text-sm">
            There are no {status.toLowerCase()} volunteers at the moment.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-slate-400 text-sm mb-4">
            Showing {volunteers.length} {status.toLowerCase()} volunteer{volunteers.length !== 1 ? 's' : ''}
          </p>
          {volunteers.map((volunteer) => (
            <div
              key={volunteer.id}
              className="p-4 rounded-lg border border-slate-700/50 bg-slate-700/30 hover:bg-slate-700/50 transition-colors duration-150"
            >
              {/* Volunteer Header */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3 flex-1">
                  <h4 className="text-white font-semibold text-sm sm:text-base">
                    {volunteer.full_name}
                  </h4>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                    volunteer.status === 'Active'
                      ? 'bg-green-600/20 text-green-300 border border-green-600/40'
                      : 'bg-yellow-600/20 text-yellow-300 border border-yellow-600/40'
                  }`}
                >
                  {volunteer.status}
                </span>
              </div>

              {/* Email */}
              <div className="text-slate-400 text-xs sm:text-sm mb-2">
                📧 {volunteer.email || 'No email'}
              </div>

              {/* Role */}
              <div className="text-slate-400 text-xs sm:text-sm mb-2">
                👔 {volunteer.role}
              </div>

              {/* Place */}
              {volunteer.place && (
                <div className="text-slate-400 text-xs sm:text-sm mb-2">
                  📍 {volunteer.place}
                </div>
              )}

              {/* Join Date */}
              {volunteer.joining_date && (
                <div className="text-slate-500 text-xs mt-2">
                  Joined:{' '}
                  {new Date(volunteer.joining_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              )}

              {/* Last Active Date - Only for Inactive volunteers */}
              {volunteer.status === 'Inactive' && volunteer.last_active_date && (
                <div className="text-slate-400 text-xs mt-2 border-t border-slate-700/50 pt-2">
                  Last Active:{' '}
                  {new Date(volunteer.last_active_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default VolunteerListModal;
