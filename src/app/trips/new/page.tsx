'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function NewTrip() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    participants: ['']
  });

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Insert the trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert([
        {
          name: formData.name,
          date: formData.date,
          total: 0,
          settled: false,
          user_id: user.id  // Add this line
        }
      ])
      .select()
      .single();

    if (tripError) throw tripError;

    // Insert participants
    const participantsToInsert = formData.participants
      .filter(p => p.trim() !== '')
      .map(name => ({
        trip_id: trip.id,
        name: name.trim()
      }));

    if (participantsToInsert.length > 0) {
      const { error: participantsError } = await supabase
        .from('participants')
        .insert(participantsToInsert);

      if (participantsError) throw participantsError;
    }

    // Navigate to the new trip
    router.push(`/trips/${trip.id}`);
  } catch (error) {
    console.error('Error creating trip:', error);
    alert('Failed to create trip. Please try again.');
  } finally {
    setLoading(false);
  }
};

  const addParticipant = () => {
    setFormData({
      ...formData,
      participants: [...formData.participants, '']
    });
  };

  const updateParticipant = (index: number, value: string) => {
    const newParticipants = [...formData.participants];
    newParticipants[index] = value;
    setFormData({
      ...formData,
      participants: newParticipants
    });
  };

  const removeParticipant = (index: number) => {
    const newParticipants = formData.participants.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      participants: newParticipants
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
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
          
          <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 text-black">
            <span className="text-xl">🔍</span>
            Explore Trips
          </button>
          
          <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 text-black">
            <span className="text-xl">🔔</span>
            Notifications
          </button>
          
          <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 text-black">
            <span className="text-xl">💬</span>
            Messages
          </button>
          
          <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 text-black">
            <span className="text-xl">👤</span>
            Profile
          </button>
        </nav>

        <button 
          onClick={() => router.push('/trips/new')}
          className="w-full mt-6 bg-blue-500 text-white px-6 py-3 rounded-full font-bold hover:bg-blue-600"
        >
          New Trip
        </button>
      </aside>

      {/* Main Content - New Trip Form */}
      <main className="flex-1 max-w-2xl border-r border-gray-200">
        <div className="sticky top-0 bg-white/80 backdrop-blur border-b border-gray-200 p-4">
          <button 
            onClick={() => router.back()}
            className="text-blue-500 hover:text-blue-700 mb-2 flex items-center gap-1"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-black">Create New Trip</h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Trip Name */}
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Trip Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Summer Beach Trip"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            />
          </div>

          {/* Trip Date */}
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Trip Date *
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            />
          </div>

          {/* Participants */}
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Participants
            </label>
            <div className="space-y-2">
              {formData.participants.map((participant, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={participant}
                    onChange={(e) => updateParticipant(index, e.target.value)}
                    placeholder={`Person ${index + 1}`}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                  {formData.participants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeParticipant(index)}
                      className="px-4 py-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addParticipant}
              className="mt-2 text-blue-500 hover:text-blue-700 font-semibold"
            >
              + Add Participant
            </button>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Trip'}
            </button>
          </div>
        </form>
      </main>

      {/* Right Sidebar - Tips */}
      <aside className="w-80 bg-white p-6 sticky top-0 h-screen overflow-y-auto">
        <div className="bg-blue-50 rounded-lg p-4">
          <h2 className="font-bold text-lg mb-3 text-black">💡 Tips</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Give your trip a memorable name</li>
            <li>• Add all participants who will share expenses</li>
            <li>• You can add expenses after creating the trip</li>
            <li>• Participants can be edited later</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}