'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Sidebar from '@/components/Sidebar';

export default function Notifications() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [tableExists, setTableExists] = useState(true);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push('/auth/login');
      return;
    }

    await fetchInvitations();
  };

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('trip_invitations')
        .select('*')
        .eq('invited_user_email', user.email)
        .order('created_at', { ascending: false });

      if (invitationsError) {
        if (invitationsError.code === '42P01' || invitationsError.code === 'PGRST116') {
          console.log('Trip invitations table not created yet. Please run the SQL schema.');
          setInvitations([]);
          setTableExists(false);
          return;
        }
        throw invitationsError;
      }

      // Fetch related trip data
      const enrichedInvitations = await Promise.all(
        (invitationsData || []).map(async (invitation) => {
          const { data: tripData } = await supabase
            .from('trips')
            .select('id, name, date, total')
            .eq('id', invitation.trip_id)
            .single();

          return {
            ...invitation,
            trips: tripData
          };
        })
      );

      setInvitations(enrichedInvitations);
    } catch (error: any) {
      console.log('Error fetching invitations:', error);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: number, tripId: number) => {
    setProcessingId(invitationId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
      
      const { error: participantError } = await supabase
        .from('participants')
        .insert([
          {
            trip_id: tripId,
            name: userName,
            user_id: user.id
          }
        ]);

      if (participantError) throw participantError;

      const { error: updateError } = await supabase
        .from('trip_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      await fetchInvitations();
      alert('Invitation accepted! You can now view this trip on your homepage.');
      router.push('/');
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      alert('Failed to accept invitation. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: number) => {
    if (!confirm('Are you sure you want to decline this invitation?')) {
      return;
    }

    setProcessingId(invitationId);
    try {
      const { error } = await supabase
        .from('trip_invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId);

      if (error) throw error;

      await fetchInvitations();
    } catch (error) {
      console.error('Error declining invitation:', error);
      alert('Failed to decline invitation. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
  const respondedInvitations = invitations.filter(inv => inv.status !== 'pending');

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xl text-black">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 max-w-4xl p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-black">Notifications</h1>
          <p className="text-gray-600 mt-2">Manage your trip invitations</p>
        </div>

        {!tableExists ? (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">🔧</div>
            <h2 className="text-2xl font-bold text-blue-900 mb-4">Setup Required</h2>
            <p className="text-blue-800 mb-4">
              The trip invitations feature needs to be set up in your database.
            </p>
            <div className="bg-white rounded-lg p-4 text-left max-w-2xl mx-auto">
              <p className="font-semibold text-gray-900 mb-2">To enable invitations:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Go to your Supabase Dashboard</li>
                <li>Click "SQL Editor" in the left sidebar</li>
                <li>Click "New Query"</li>
                <li>Run the trip invitations SQL schema</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          </div>
        ) : (
          <>
            {/* Pending Invitations */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-black mb-4">Pending Invitations</h2>
              {pendingInvitations.length > 0 ? (
                <div className="space-y-4">
                  {pendingInvitations.map((invitation) => (
                    <div key={invitation.id} className="bg-white rounded-lg shadow p-6 border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">✉️</span>
                            <h3 className="text-lg font-bold text-black">Trip Invitation</h3>
                          </div>
                          <p className="text-gray-700 mb-1">
                            You've been invited to join{' '}
                            <span className="font-semibold text-blue-600">{invitation.trips?.name || 'a trip'}</span>
                          </p>
                          {invitation.trips?.date && (
                            <p className="text-sm text-gray-500">
                              Date: {invitation.trips.date}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            Received {new Date(invitation.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleAcceptInvitation(invitation.id, invitation.trip_id)}
                            disabled={processingId === invitation.id}
                            className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                          >
                            {processingId === invitation.id ? 'Processing...' : 'Accept'}
                          </button>
                          <button
                            onClick={() => handleDeclineInvitation(invitation.id)}
                            disabled={processingId === invitation.id}
                            className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center border border-gray-200">
                  <div className="text-6xl mb-4">📭</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No pending invitations</h3>
                  <p className="text-gray-500">You're all caught up!</p>
                </div>
              )}
            </div>

            {/* Previous Responses */}
            {respondedInvitations.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-black mb-4">Previous Responses</h2>
                <div className="space-y-4">
                  {respondedInvitations.map((invitation) => (
                    <div key={invitation.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 opacity-75">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-gray-700">
                            <span className="font-semibold">{invitation.trips?.name || 'Trip'}</span>
                          </p>
                        </div>
                        <div>
                          {invitation.status === 'accepted' ? (
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                              ✓ Accepted
                            </span>
                          ) : (
                            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                              ✗ Declined
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}