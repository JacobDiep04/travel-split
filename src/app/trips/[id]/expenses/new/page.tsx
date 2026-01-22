'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function NewExpense() {
  const params = useParams();
  const router = useRouter();
  const tripId = Number(params.id);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    paidBy: '',
    date: new Date().toISOString().split('T')[0],
    splitEqually: true,
    splitWith: [] as string[]
  });

  const [participants, setParticipants] = useState<string[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState('');
  const [addingParticipant, setAddingParticipant] = useState(false);

  // Fetch participants when component loads
  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('name')
        .eq('trip_id', tripId);

      if (error) throw error;
      
      const names = data?.map(p => p.name) || [];
      setParticipants(names);
      setFormData(prev => ({ ...prev, splitWith: names }));
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const fetchFriends = async () => {
    try {
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
    }
  };

  const openAddParticipantModal = async () => {
    await fetchFriends();
    setShowAddParticipantModal(true);
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFriendId) return;

    setAddingParticipant(true);
    try {
      const selectedFriend = friends.find(f => f.id === parseInt(selectedFriendId));
      if (!selectedFriend) throw new Error('Friend not found');

      // Check if friend is already a participant
      const alreadyAdded = participants.some(
        p => p.toLowerCase() === selectedFriend.friend_name.toLowerCase()
      );

      if (alreadyAdded) {
        alert(`${selectedFriend.friend_name} is already a participant!`);
        setAddingParticipant(false);
        return;
      }

      const { error } = await supabase
        .from('participants')
        .insert([
          {
            trip_id: tripId,
            name: selectedFriend.friend_name
          }
        ]);

      if (error) throw error;

      setSelectedFriendId('');
      setShowAddParticipantModal(false);
      await fetchParticipants(); // Refresh participants
      alert(`${selectedFriend.friend_name} added to the trip!`);
    } catch (error) {
      console.error('Error adding participant:', error);
      alert('Failed to add participant. Please try again.');
    } finally {
      setAddingParticipant(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Insert the expense
      const { error } = await supabase
        .from('expenses')
        .insert([
          {
            trip_id: tripId,
            description: formData.description,
            amount: parseFloat(formData.amount),
            paid_by: formData.paidBy,
            date: formData.date
          }
        ]);

      if (error) throw error;

      // Update trip total
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('trip_id', tripId);

      // Fix floating-point precision by rounding to 2 decimal places
      const total = expenses?.reduce((sum, exp) => {
        return Math.round((sum + parseFloat(exp.amount)) * 100) / 100;
      }, 0) || 0;

      await supabase
        .from('trips')
        .update({ total })
        .eq('id', tripId);

      // Navigate back to trip details
      router.push(`/trips/${tripId}`);
    } catch (error) {
      console.error('Error creating expense:', error);
      alert('Failed to create expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleParticipant = (name: string) => {
    setFormData(prev => ({
      ...prev,
      splitWith: prev.splitWith.includes(name)
        ? prev.splitWith.filter(n => n !== name)
        : [...prev.splitWith, name]
    }));
  };

  const amount = parseFloat(formData.amount) || 0;
  const splitCount = formData.splitWith.length || 1;
  const perPersonAmount = Math.round((amount / splitCount) * 100) / 100;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Add Participant Modal */}
      {showAddParticipantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-black mb-4">Add Participant</h2>
            
            {friends.length > 0 ? (
              <form onSubmit={handleAddParticipant}>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Friend
                  </label>
                  <select
                    required
                    value={selectedFriendId}
                    onChange={(e) => setSelectedFriendId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  >
                    <option value="">Choose a friend...</option>
                    {friends
                      .filter(friend => !participants.includes(friend.friend_name))
                      .map((friend) => (
                        <option key={friend.id} value={friend.id}>
                          {friend.friend_name} ({friend.friend_email})
                        </option>
                      ))}
                  </select>
                  <p className="text-sm text-gray-500 mt-2">
                    Only friends who aren't already participants
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddParticipantModal(false);
                      setSelectedFriendId('');
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingParticipant}
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-400"
                  >
                    {addingParticipant ? 'Adding...' : 'Add Participant'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-gray-600 mb-4">
                  You don't have any friends yet. Add friends first to invite them to trips.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowAddParticipantModal(false);
                      router.push('/friends');
                    }}
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600"
                  >
                    Go to Friends
                  </button>
                  <button
                    onClick={() => setShowAddParticipantModal(false)}
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

      {/* Left Sidebar - Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 sticky top-0 h-screen">
        <h2 className="text-2xl font-bold mb-8 text-blue-500">TravelSplit</h2>
        
        <nav className="space-y-2">
          <button 
            onClick={() => router.push('/')}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 font-semibold flex items-center gap-3 text-black"
          >
            <span className="text-xl">🏠</span>
            Home
          </button>
          
          <button 
            onClick={() => router.push('/friends')}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 text-black"
          >
            <span className="text-xl">👥</span>
            Friends
          </button>
          
          <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 text-black">
            <span className="text-xl">🔔</span>
            Notifications
          </button>
          
          <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 text-black">
            <span className="text-xl">💬</span>
            Messages
          </button>
          
          <button 
            onClick={() => router.push('/profile')}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 text-black"
          >
            <span className="text-xl">👤</span>
            Profile
          </button>
        </nav>
      </aside>

      {/* Main Content - New Expense Form */}
      <main className="flex-1 max-w-2xl border-r border-gray-200">
        <div className="sticky top-0 bg-white/80 backdrop-blur border-b border-gray-200 p-4">
          <button 
            onClick={() => router.back()}
            className="text-blue-500 hover:text-blue-700 mb-2 flex items-center gap-1"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-black">Add New Expense</h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Expense Description */}
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Description *
            </label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Dinner at restaurant"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Amount *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
            </div>
          </div>

          {/* Paid By */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-black">
                Paid By *
              </label>
              {participants.length === 0 && (
                <button
                  type="button"
                  onClick={openAddParticipantModal}
                  className="text-blue-500 hover:text-blue-700 text-sm font-semibold"
                >
                  + Add Participant
                </button>
              )}
            </div>
            {participants.length > 0 ? (
              <select
                required
                value={formData.paidBy}
                onChange={(e) => setFormData({ ...formData, paidBy: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              >
                <option value="">Select who paid</option>
                {participants.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            ) : (
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 text-center">
                <p className="text-gray-600 mb-2">No participants yet</p>
                <button
                  type="button"
                  onClick={openAddParticipantModal}
                  className="text-blue-500 hover:text-blue-700 font-semibold"
                >
                  Add a participant to get started
                </button>
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Date *
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            />
          </div>

          {/* Split With */}
          {participants.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Split With
              </label>
              <div className="space-y-2">
                {participants.map((name) => (
                  <label key={name} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.splitWith.includes(name)}
                      onChange={() => toggleParticipant(name)}
                      className="w-4 h-4 text-blue-500"
                    />
                    <span className="text-black">{name}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={openAddParticipantModal}
                className="mt-2 text-blue-500 hover:text-blue-700 text-sm font-semibold"
              >
                + Add Another Participant
              </button>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || participants.length === 0}
              className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </main>

      {/* Right Sidebar - Breakdown */}
      <aside className="w-80 bg-white p-6 sticky top-0 h-screen overflow-y-auto">
        <div className="bg-blue-50 rounded-lg p-4">
          <h2 className="font-bold text-lg mb-4 text-black">Expense Breakdown</h2>
          
          <div className="space-y-3 mb-4">
            <div className="bg-white border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-gray-600 mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-black">${amount.toFixed(2)}</p>
            </div>
            
            <div className="bg-white border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-gray-600 mb-1">Split Between</p>
              <p className="text-xl font-bold text-black">{splitCount} {splitCount === 1 ? 'person' : 'people'}</p>
            </div>
            
            <div className="bg-white border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-gray-600 mb-1">Per Person</p>
              <p className="text-2xl font-bold text-green-600">${perPersonAmount.toFixed(2)}</p>
            </div>
          </div>

          {formData.splitWith.length > 0 && amount > 0 && (
            <div>
              <h3 className="font-semibold text-black mb-2">Individual Shares</h3>
              <div className="space-y-2">
                {formData.splitWith.map((name) => (
                  <div key={name} className="flex justify-between items-center text-sm">
                    <span className="text-black">{name}</span>
                    <span className="font-semibold text-gray-700">${perPersonAmount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}