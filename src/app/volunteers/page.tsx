"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import VolunteerCard from "@/components/VolunteerCard";
import EditVolunteerModal from "@/components/EditVolunteerModal";
import AddVolunteerModal from "@/components/AddVolunteerModal";

type Volunteer = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  place: string;
  status: string;
  joining_date: string;
  photo_url?: string | null;
  last_active_date?: string;
};

type VolunteerUpdateData = {
  full_name: string;
  email: string;
  role: string;
  place: string;
  status: string;
  joining_date: string;
  photo_url?: string | null;
};

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchVolunteers();
  }, []);

  const fetchVolunteers = async () => {
    setLoading(true);
    setError('');
    try {
      // Try to fetch with photo_url, fallback to without if column doesn't exist
      const { data: initialData, error } = await supabase
        .from("volunteers")
        .select("id, full_name, email, role, place, status, joining_date, photo_url")
        .order("joining_date", { ascending: false });

      let data = initialData;

      // If photo_url column doesn't exist, fetch without it
      if (error && error.message.includes('photo_url')) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("volunteers")
          .select("id, full_name, email, role, place, status, joining_date")
          .order("joining_date", { ascending: false });

        if (fallbackError) throw fallbackError;
        // Add photo_url: null to each item for type compatibility
        data = (fallbackData || []).map(v => ({ ...v, photo_url: null }));
      } else if (error) {
        throw error;
      }

      // Fetch last active date for each volunteer
      const volunteersWithLastActive = await Promise.all(
        (data || []).map(async (volunteer) => {
          if (volunteer.status === 'Inactive') {
            // Get the most recent task assignment date
            const { data: lastAssignment } = await supabase
              .from('task_assignments')
              .select('assigned_at')
              .eq('volunteer_id', volunteer.id)
              .order('assigned_at', { ascending: false })
              .limit(1);

            // Use assignment date if available, otherwise use joining date
            const lastActiveDate = lastAssignment && lastAssignment.length > 0 
              ? lastAssignment[0].assigned_at 
              : volunteer.joining_date;

            return {
              ...volunteer,
              last_active_date: lastActiveDate
            };
          }
          return volunteer;
        })
      );

      setVolunteers(volunteersWithLastActive);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch volunteers');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    const volunteer = volunteers.find(v => v.id === id);
    if (volunteer) {
      setEditingVolunteer(volunteer);
      setIsModalOpen(true);
    }
  };

  const handleSave = async (updatedVolunteer: Volunteer) => {
    try {
      const updateData: VolunteerUpdateData = {
        full_name: updatedVolunteer.full_name,
        email: updatedVolunteer.email,
        role: updatedVolunteer.role,
        place: updatedVolunteer.place,
        status: updatedVolunteer.status,
        joining_date: updatedVolunteer.joining_date,
      };

      // Try to include photo_url if it exists
      if (updatedVolunteer.photo_url !== undefined) {
        updateData.photo_url = updatedVolunteer.photo_url;
      }

      const { error } = await supabase
        .from("volunteers")
        .update(updateData)
        .eq("id", updatedVolunteer.id);

      if (error) {
        // If error is about photo_url column not existing, try without it
        if (error.message.includes('photo_url')) {
          const { error: retryError } = await supabase
            .from("volunteers")
            .update({
              full_name: updatedVolunteer.full_name,
              email: updatedVolunteer.email,
              role: updatedVolunteer.role,
              place: updatedVolunteer.place,
              status: updatedVolunteer.status,
              joining_date: updatedVolunteer.joining_date,
            })
            .eq("id", updatedVolunteer.id);
          
          if (retryError) {
            console.error("Error updating volunteer:", retryError.message);
            alert(`Failed to update: ${retryError.message}`);
          } else {
            fetchVolunteers();
          }
        } else {
          console.error("Error updating volunteer:", error.message);
          alert(`Failed to update: ${error.message}`);
        }
      } else {
        fetchVolunteers();
      }
    } catch (err) {
      console.error("Exception:", err);
      alert('Failed to save volunteer');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this volunteer? This action cannot be undone.")) {
      const { error } = await supabase
        .from("volunteers")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting volunteer:", error);
      } else {
        fetchVolunteers();
      }
    }
  };

  // Filter and sort volunteers
  const filteredAndSortedVolunteers = volunteers
    .filter((v) =>
      v.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.joining_date).getTime();
      const dateB = new Date(b.joining_date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 sm:mb-2">
              Volunteers
            </h1>
            <p className="text-sm sm:text-base text-slate-400">Manage your community volunteers</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors duration-150 flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <span>+</span>
            <span className="sm:inline">Add Volunteer</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-600 text-white rounded-lg">
            Error: {error}
          </div>
        )}

        {/* Search and Sort Controls */}
        <div className="mb-8 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-sm sm:text-base"
          />
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
          >
            {sortOrder === 'asc' ? '📅 Oldest' : '📅 Newest'}
          </button>
        </div>

        {loading ? (
          <div className="text-center text-slate-400 py-12">Loading volunteers...</div>
        ) : (
          <>
            {filteredAndSortedVolunteers.length === 0 ? (
              <div className="text-center text-slate-400 py-12">
                {searchQuery ? 'No volunteers found matching your search.' : 'No volunteers yet.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredAndSortedVolunteers.map((v) => (
                  <VolunteerCard
                    key={v.id}
                    id={v.id}
                    name={v.full_name}
                    role={v.role}
                    place={v.place}
                    status={v.status}
                    joiningDate={v.joining_date}
                    email={v.email}
                    photoUrl={v.photo_url}
                    lastActiveDate={v.last_active_date}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <EditVolunteerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        volunteer={editingVolunteer}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <AddVolunteerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onVolunteerAdded={fetchVolunteers}
      />
    </div>
  );
}
