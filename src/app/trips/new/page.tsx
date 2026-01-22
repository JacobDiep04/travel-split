'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function NewTrip() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [tripName, setTripName] = useState('');
  const [tripDate, setTripDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [fetchingFriends, setFetchingFriends] = useState(false);

  const fetchFriends = async () => {
    try {
      setFetchingFriends(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setFriends(data || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setFetchingFriends(false);
    }
  };

  const openAddMemberModal = async () => {
    await fetchFriends();
    setShowAddMemberModal(true);
  };

  const toggleMemberSelection = (friend: any) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.id === friend.id);
      if (exists) {
        return prev.filter(m => m.id !== friend.id);
      } else {
        return [...prev, friend];
      }
    });
  };

  const removeMember = (friendId: number) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== friendId));
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to create a trip');
      }

      // Create the trip
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert([
          {
            name: tripName,
            date: tripDate,
            total: 0,
            settled: false,
            user_id: user.id
          }
        ])
        .select()
        .single();

      if (tripError) throw tripError;

      // Add the owner as a participant first
      const ownerName = user.user_metadata?.name || user.email?.split('@')[0] || 'Me';
      const participantsToAdd = [
        {
          trip_id: tripData.id,
          name: ownerName,
          user_id: user.id  // Add user_id for the owner
        },
        // Add selected friends as participants
        ...selectedMembers.map(friend => ({
          trip_id: tripData.id,
          name: friend.friend_name,
          user_id: null  // They'll get user_id when they accept invitation
        }))
      ];

      if (participantsToAdd.length > 0) {
        const { error: participantError } = await supabase
          .from('participants')
          .insert(participantsToAdd);

        if (participantError) throw participantError;
      }

      // Redirect to the trip details page
      router.push(`/trips/${tripData.id}`);
    } catch (error: any) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Add Members Modal */}
        {showAddMemberModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-black mb-4">Add Members</h2>
              
              {fetchingFriends ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading friends...</p>
                </div>
              ) : friends.length > 0 ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Select friends to add to this trip
                  </p>
                  <div className="space-y-2 mb-6">
                    {friends.map((friend) => {
                      const isSelected = selectedMembers.find(m => m.id === friend.id);
                      return (
                        <label 
                          key={friend.id} 
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-200"
                        >
                          <input
                            type="checkbox"
                            checked={!!isSelected}
                            onChange={() => toggleMemberSelection(friend)}
                            className="w-5 h-5 text-blue-500"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-black">{friend.friend_name}</p>
                            <p className="text-sm text-gray-500">{friend.friend_email}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowAddMemberModal(false)}
                      className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300"
                    >
                      Done
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="text-4xl mb-3">👥</div>
                  <p className="text-gray-600 mb-4">
                    You don't have any friends yet. Add friends first to invite them to trips.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowAddMemberModal(false);
                        router.push('/friends');
                      }}
                      className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600"
                    >
                      Go to Friends
                    </button>
                    <button
                      onClick={() => setShowAddMemberModal(false)}
                      className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-2"
          >
            ← Back to Home
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-blue-500 mb-6">Create New Trip</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateTrip} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Trip Name
              </label>
              <input
                type="text"
                required
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                placeholder="e.g., Summer Beach Trip 2024"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Trip Date
              </label>
              <input
                type="date"
                required
                value={tripDate}
                onChange={(e) => setTripDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
            </div>

            {/* Members Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Members
                </label>
                <button
                  type="button"
                  onClick={openAddMemberModal}
                  className="text-blue-500 hover:text-blue-700 font-semibold text-sm"
                >
                  + Add Members
                </button>
              </div>
              
              {selectedMembers.length > 0 ? (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <span className="font-semibold">You</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Owner</span>
                  </div>
                  {selectedMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between bg-white p-2 rounded">
                      <div>
                        <p className="font-semibold text-black text-sm">{member.friend_name}</p>
                        <p className="text-xs text-gray-500">{member.friend_email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMember(member.id)}
                        className="text-red-500 hover:text-red-700 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <p className="text-gray-500 mb-2">No members added yet</p>
                  <p className="text-sm text-gray-400">You'll be added as the owner automatically</p>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Create Trip'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}