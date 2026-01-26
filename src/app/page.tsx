'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Sidebar from '@/components/Sidebar';

interface Trip {
  id: number;
  name: string;
  date: string;
  total: string;
  settled: boolean;
  created_at: string;
}

interface Payment {
  id: number;
  person: string;
  amount: string;
  trip: string;
  status: string;
  due_date: string;
}

export default function Home() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const [trips, setTrips] = useState<Trip[]>([]);
  const [outstandingPayments, setOutstandingPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('');

  const fetchTrips = async () => {
    try {
      setLoading(true);
      
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No user found');
        setLoading(false);
        return;
      }

      // Fetch trips where user is the owner
      const { data: ownedTrips, error: ownedError } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id);

      if (ownedError) {
        console.error('Error fetching owned trips:', ownedError);
      }

      // Fetch trips where user is a participant
      const { data: participantTrips, error: participantError } = await supabase
        .from('participants')
        .select('trip_id')
        .eq('user_id', user.id);

      if (participantError) {
        console.error('Error fetching participant trips:', participantError);
      }

      // Get the full trip details for participant trips
      let invitedTrips: Trip[] = [];
      if (participantTrips && participantTrips.length > 0) {
        const tripIds = participantTrips.map(p => p.trip_id);
        const { data: invitedTripsData, error: invitedError } = await supabase
          .from('trips')
          .select('*')
          .in('id', tripIds);

        if (invitedError) {
          console.error('Error fetching invited trips:', invitedError);
        } else {
          invitedTrips = invitedTripsData || [];
        }
      }

      // Combine and deduplicate trips
      const allTrips = [...(ownedTrips || []), ...invitedTrips];
      const uniqueTrips = Array.from(
        new Map(allTrips.map(trip => [trip.id, trip])).values()
      );

      // Sort by created_at
      uniqueTrips.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTrips(uniqueTrips);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        // Removed .eq('status', 'outstanding') since status column doesn't exist
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Supabase error fetching payments:');
        console.error('Error JSON:', JSON.stringify(error, null, 2));
        return;
      }

      setOutstandingPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push('/auth/login');
          return;
        }

        // Get user's name for greeting
        const { data: { user } } = await supabase.auth.getUser();
        const fullName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'there';
        const firstName = fullName.split(' ')[0];
        setUserName(firstName);

        // Set greeting based on time of day
        const hour = new Date().getHours();
        if (hour < 12) {
          setGreeting('Good morning');
        } else if (hour < 18) {
          setGreeting('Good afternoon');
        } else {
          setGreeting('Good evening');
        }

        // Fetch data
        await Promise.all([
          fetchTrips(),
          fetchPayments(),
        ]);
      } catch (error) {
        console.error('Error in checkAuthAndFetch:', error);
        setLoading(false);
      }
    };

    checkAuthAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewDetails = (tripId: number) => {
    router.push(`/trips/${tripId}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl text-black">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Sidebar - Navigation */}
      <Sidebar />

      {/* Main Content - Trips Feed */}
      <main className="flex-1 max-w-2xl border-r border-gray-200">
        <div className="sticky top-0 bg-white/80 backdrop-blur border-b border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-black">{greeting}, {userName}!</h1>
            <button 
              onClick={() => router.push('/trips/new')}
              className="bg-blue-500 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-600 transition-colors"
            >
              + New Trip
            </button>
          </div>
        </div>

        {trips.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No trips yet. Create your first trip!</p>
          </div>
        ) : (
          <>
            {/* Active Trips */}
            <div className="border-b border-gray-200 p-4">
              <h2 className="font-bold text-lg mb-3 text-black">Active Trips</h2>
              {trips.filter(trip => !trip.settled).length === 0 ? (
                <p className="text-gray-500 text-sm">No active trips</p>
              ) : (
                trips.filter(trip => !trip.settled).map(trip => (
                  <div 
                    key={trip.id} 
                    onClick={() => handleViewDetails(trip.id)}
                    className="bg-white border border-gray-200 rounded-lg p-4 mb-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-black">{trip.name}</h3>
                      <span className="text-sm text-gray-500">{trip.date}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-black">Total expenses</span>
                      <span className="font-bold text-green-600">${parseFloat(trip.total).toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Previous Trips */}
            <div className="p-4">
              <h2 className="font-bold text-lg mb-3 text-black">Previous Trips</h2>
              {trips.filter(trip => trip.settled).length === 0 ? (
                <p className="text-gray-500 text-sm">No settled trips</p>
              ) : (
                trips.filter(trip => trip.settled).map(trip => (
                  <div 
                    key={trip.id} 
                    onClick={() => handleViewDetails(trip.id)}
                    className="bg-white border border-gray-200 rounded-lg p-4 mb-3 hover:bg-gray-50 cursor-pointer opacity-75 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-black">{trip.name}</h3>
                        <span className="text-xs text-green-600">✓ Settled</span>
                      </div>
                      <span className="text-sm text-gray-500">{trip.date}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-black">Total expenses</span>
                      <span className="font-bold text-black">${parseFloat(trip.total).toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>

      {/* Right Sidebar - Outstanding Payments */}
      <aside className="w-80 bg-white p-6 sticky top-0 h-screen overflow-y-auto">
        <div className="bg-gray-50 rounded-lg p-4">
          <h2 className="font-bold text-lg mb-4 text-black">You Owe</h2>
          
          {outstandingPayments.length > 0 ? (
            <div className="space-y-3">
              {outstandingPayments.map(payment => (
                <div key={payment.id} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-black">{payment.person}</span>
                    <span className="font-bold text-red-600">${parseFloat(payment.amount).toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-gray-500 mb-2">{payment.trip}</div>
                  <button className="w-full bg-blue-500 text-white px-3 py-1.5 rounded text-sm font-semibold hover:bg-blue-600">
                    Settle Up
                  </button>
                </div>
              ))}
              
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-black">Total Owed</span>
                  <span className="text-red-600">
                    ${outstandingPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">✓</div>
              <p>All settled up!</p>
            </div>
          )}
        </div>

        {/* People Owe You Section */}
        <div className="bg-gray-50 rounded-lg p-4 mt-4">
          <h2 className="font-bold text-lg mb-4 text-black">Owes You</h2>
          <div className="text-center text-gray-500 py-4">
            <p className="text-sm">No pending payments</p>
          </div>
        </div>
      </aside>
    </div>
  );
}