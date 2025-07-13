'use client';

import { useState, useEffect } from 'react';
import GlobalNavigationBar from '@/components/GlobalNavigationBar';
import SideBar from '@/components/SideBar';
import { useAppState } from '@/lib/state/AppContext';
import SourceSettings from './SourceSettings';
import SignInModal from './SignInModal';
import { Source } from '@/types';
import { fetchApi } from '@/lib/api';
import LoadingSpinner from './LoadingSpinner';
import { tokenService } from '@/lib/token.service';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const { sidebarMinimized, currentUser, setCurrentUser } = useAppState();
  const [sourceSettingsOpen, setSourceSettingsOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [sourceListVersion, setSourceListVersion] = useState(0);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Load user data from token when the app starts
  useEffect(() => {
    const loadUser = async () => {
      if (currentUser) {
        setIsLoadingUser(false);
        return;
      }

      const token = tokenService.getToken();
      if (!token) {
        setIsLoadingUser(false);
        return;
      }

      try {
        // Decode JWT to get user info
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.userId;
        const userName = payload.name || '';
        const userPhone = payload.phone || '';

        // Parse the name into first and last
        const nameParts = userName.split(' ');
        const first = nameParts[0] || '';
        const last = nameParts.slice(1).join(' ') || '';

        // Create user object from token
        const user = {
          _id: userId,
          first,
          last,
          phone: userPhone,
          email: payload.email || '',
          imageUrl: payload.imageUrl,
          isAdmin: false,
          sourceIds: [], // Will be loaded separately
          denseMode: false,
          darkMode: false,
        };

        setCurrentUser(user);
      } catch (error) {
        console.error('Error loading user from token:', error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadUser();
  }, [currentUser, setCurrentUser]);

  const handleToggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  const handleSourceSave = () => {
    setSourceListVersion(v => v + 1);
  };

  const mainPadding = sidebarMinimized ? 'lg:pl-20' : 'lg:pl-60';

  if (isLoadingUser) {
    return <LoadingSpinner message="Loading user data..." />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <SideBar isOpen={isSidebarOpen} onClose={handleCloseSidebar} />
      <GlobalNavigationBar onToggleSidebar={handleToggleSidebar} />
      <main className={`pt-20 lg:pt-4 ${mainPadding} transition-all duration-300 ease-in-out`}>
        {children}
      </main>

      <SourceSettings
        isOpen={sourceSettingsOpen}
        onClose={() => {
          setSourceSettingsOpen(false);
          setEditingSource(null);
        }}
        editingSource={editingSource}
        onSourceSave={handleSourceSave}
      />

      <SignInModal />
    </div>
  );
} 