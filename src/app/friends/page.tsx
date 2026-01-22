'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function Friends() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingFriend, setAddingFriend] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push('/auth/login');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    await fetchFriends();
  };

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFriends(data || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendEmail.trim()) return;

    setAddingFriend(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if user is trying to add themselves
      if (friendEmail.toLowerCase() === user.email?.toLowerCase()) {
        alert('You cannot add yourself as a friend!');
        setAddingFriend(false);
        return;
      }

      // Check if friend already exists
      const { data: existing } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', user.id)
        .eq('friend_email', friendEmail.toLowerCase())
        .single();

      if (existing) {
        alert('This friend is already in your list!');
        setAddingFriend(false);
        return;
      }

      // Look up the friend's name from auth.users (if they're registered)
      // Note: This would require a server-side function in production
      // For now, we'll just store email and let them enter a name
      const friendName = friendEmail.split('@')[0]; // Default to email username

      const { error } = await supabase
        .from('friends')
        .insert([
          {
            user_id: user.id,
            friend_email: friendEmail.toLowerCase(),
            friend_name: friendName,
            status: 'pending' // Can be 'pending', 'accepted', etc.
          }
        ]);

      if (error) throw error;

      setFriendEmail('');
      setShowAddModal(false);
      await fetchFriends();
      alert('Friend added successfully!');
    } catch (error: any) {
      console.error('Error adding friend:', error);
      alert('Failed to add friend. Please try again.');
    } finally {
      setAddingFriend(false);
    }
  };

  const handleRemoveFriend = async (friendId: number, friendName: string) => {
    if (!confirm(`Are you sure you want to remove ${friendName} from your friends?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendId);

      if (error) throw error;

      await fetchFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
      alert('Failed to remove friend. Please try again.');
    }
  };

  const handleUpdateFriendName = async (friendId: number, currentName: string) => {
    const newName = prompt('Enter new name for this friend:', currentName);
    if (!newName || newName === currentName) return;

    try {
      const { error } = await supabase
        .from('friends')
        .update({ friend_name: newName.trim() })
        .eq('id', friendId);

      if (error) throw error;

      await fetchFriends();
    } catch (error) {
      console.error('Error updating friend name:', error);
      alert('Failed to update name. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl text-black">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Add Friend Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-black mb-4">Add Friend</h2>
              
              <form onSubmit={handleAddFriend}>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Friend's Email
                  </label>
                  <input
                    type="email"
                    required
                    value={friendEmail}
                    onChange={(e) => setFriendEmail(e.target.value)}
                    placeholder="friend@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    autoFocus
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Enter the email address of the person you want to add as a friend.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setFriendEmail('');
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingFriend}
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-400"
                  >
                    {addingFriend ? 'Adding...' : 'Add Friend'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-2 mb-4"
          >
            ← Back to Home
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-black">Friends</h1>
              <p className="text-gray-600 mt-2">Manage your friends and contacts</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-600"
            >
              + Add Friend
            </button>
          </div>
        </div>

        {/* Friends List */}
        <div className="bg-white rounded-lg shadow">
          {friends.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {friends.map((friend) => (
                <div key={friend.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                        {friend.friend_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-black">{friend.friend_name}</h3>
                        <p className="text-sm text-gray-500">{friend.friend_email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateFriendName(friend.id, friend.friend_name)}
                        className="text-blue-500 hover:text-blue-700 px-3 py-1 rounded text-sm font-semibold"
                      >
                        Edit Name
                      </button>
                      <button
                        onClick={() => handleRemoveFriend(friend.id, friend.friend_name)}
                        className="text-red-500 hover:text-red-700 px-3 py-1 rounded text-sm font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No friends yet</h3>
              <p className="text-gray-500 mb-4">
                Add friends to easily invite them to trips
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-600"
              >
                Add Your First Friend
              </button>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 How it works</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Add friends by their email address</li>
            <li>• Only friends can be added to your trips</li>
            <li>• You can edit friend names for easier identification</li>
            <li>• Friends don't need to accept - they're added to your personal list</li>
          </ul>
        </div>
      </div>
    </div>
  );
}