'use client';

import { useState, useEffect } from 'react';
import GlobalNavigationBar from '@/components/GlobalNavigationBar';
import SideBar from '@/components/SideBar';
import { useAppState } from '@/lib/state/AppContext';
import SourceSettings from '@/components/SourceSettings';
import SignInModal from './SignInModal';
import { Source } from '@/types';

import LoadingSpinner from './LoadingSpinner';
import { getAuthenticationState, isUserAuthenticated } from '@/services/basebase.service';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const { sidebarMinimized, currentUser, setCurrentUser } = useAppState();
  const [sourceSettingsOpen, setSourceSettingsOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [sourceListVersion, setSourceListVersion] = useState(0);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Load user data from BaseBase SDK when the app starts
  useEffect(() => {
    const loadUser = async () => {
      if (currentUser) {
        setIsLoadingUser(false);
        return;
      }

      if (!isUserAuthenticated()) {
        setIsLoadingUser(false);
        return;
      }

      try {
        const authState = getAuthenticationState();
        if (authState.isAuthenticated && authState.user) {
          const baseUser = authState.user;
          
          // Parse the name into first and last
          const nameParts = baseUser.name?.split(' ') || [];
          const first = nameParts[0] || '';
          const last = nameParts.slice(1).join(' ') || '';

          // Create user object from BaseBase auth state
          const user = {
            id: baseUser.id,
            first,
            last,
            phone: baseUser.phone || '',
            email: '', // BaseBase SDK doesn't provide email in auth state
            imageUrl: undefined,
            isAdmin: false,
            sourceIds: [], // Will be loaded separately
            denseMode: false,
            darkMode: false,
          };

          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Error loading user from BaseBase SDK:', error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    // Only run once on mount, not when currentUser changes
    if (!currentUser) {
      loadUser();
    } else {
      setIsLoadingUser(false);
    }
  }, []); // Empty dependency array to prevent infinite loops

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