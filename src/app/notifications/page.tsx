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

      const { data, error } = await supabase
        .from('trip_invitations')
        .select(`
          *,
          trips (
            id,
            name,
            date,
            total
          ),
          invited_by:invited_by_user_id (
            email,
            raw_user_meta_data
          )
        `)
        .eq('invited_user_email', user.email)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: number, tripId: number) => {
    setProcessingId(invitationId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Add user as participant to the trip
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

      // Update invitation status to accepted
      const { error: updateError } = await supabase
        .from('trip_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      await fetchInvitations();
      alert('Invitation accepted! You can now view this trip on your homepage.');
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
                        <span className="font-semibold text-blue-600">{invitation.trips?.name}</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        Date: {invitation.trips?.date}
                      </p>
                      <p className="text-sm text-gray-500">
                        Invited by: {invitation.invited_by?.raw_user_meta_data?.name || invitation.invited_by?.email}
                      </p>
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
                        <span className="font-semibold">{invitation.trips?.name}</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        Invited by: {invitation.invited_by?.raw_user_meta_data?.name || invitation.invited_by?.email}
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
      </main>
    </div>
  );
}