'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function Sidebar() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string>('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    loadUserData();
    fetchNotificationCount();

    // Set up real-time subscription for notifications
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('trip_invitations_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trip_invitations',
            filter: `invited_user_email=eq.${user.email}`
          },
          (payload) => {
            console.log('Invitation change detected:', payload);
            fetchNotificationCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fullName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
      const firstName = fullName.split(' ')[0];
      setUserName(firstName);
      setUserEmail(user?.email || '');
      
      const avatar = user?.user_metadata?.avatar_url || 
                     user?.user_metadata?.picture || 
                     `https://api.dicebear.com/7.x/initials/svg?seed=${firstName}`;
      setUserAvatar(avatar);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchNotificationCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from('trip_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('invited_user_email', user.email)
        .eq('status', 'pending');

      if (error) {
        // If table doesn't exist yet, silently fail
        if (error.code === '42P01') {
          console.log('Trip invitations table not created yet. Run the SQL schema.');
          return;
        }
        throw error;
      }
      setNotificationCount(count || 0);
    } catch (error: any) {
      // Don't show error to user, just log it
      console.log('Note: Trip invitations feature not set up yet.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-6 sticky top-0 h-screen flex flex-col">
      <h2 className="text-2xl font-bold mb-8 text-blue-500">TravelSplit</h2>
      
      <nav className="space-y-2 flex-1">
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
        
        <button 
          onClick={() => router.push('/notifications')}
          className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 text-black relative"
        >
          <span className="text-xl">🔔</span>
          Notifications
          {notificationCount > 0 && (
            <span className="absolute right-4 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>
        
        <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 text-black">
          <span className="text-xl">💬</span>
          Messages
        </button>
      </nav>

      {/* Profile Menu - Twitter Style */}
      <div className="relative mt-4">
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="w-full flex items-center gap-3 p-3 rounded-full hover:bg-gray-100 transition-colors"
        >
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 font-semibold">
                {userName.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          )}
          <div className="flex-1 text-left">
            <p className="font-semibold text-black text-sm">{userName || 'Loading...'}</p>
            <p className="text-gray-500 text-xs truncate">{userEmail || ''}</p>
          </div>
          <span className="text-xl">⋯</span>
        </button>

        {/* Dropdown Menu */}
        {showProfileMenu && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
            <button
              onClick={() => {
                setShowProfileMenu(false);
                router.push('/profile');
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center gap-3 text-black"
            >
              <span className="text-xl">👤</span>
              View Profile
            </button>
            <button
              onClick={() => {
                setShowProfileMenu(false);
                handleLogout();
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center gap-3 text-red-600"
            >
              <span className="text-xl">🚪</span>
              Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}