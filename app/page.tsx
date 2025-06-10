'use client';

import { useEffect, useCallback, useState } from 'react';
import { useAppState } from '@/lib/state/AppContext';
import SourceGrid from '@/components/SourceGrid';
import SourceSettings from '@/components/SourceSettings';
import SignInModal from '@/components/SignInModal';
import EditSources from '@/components/EditSources';
import FriendsList from '@/components/FriendsList';
import GlobalNavigationBar from '@/components/GlobalNavigationBar';
import { Source, Story } from '@/types';

export default function Home() {
  const { currentUser, setCurrentUser, setCurrentSources } = useAppState();
  const [editSourcesModalOpen, setEditSourcesModalOpen] = useState(false);
  const [sourceSettingsOpen, setSourceSettingsOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [sourceHeadlines, setSourceHeadlines] = useState<Map<string, Story[]>>(new Map());
  const [friendsListOpen, setFriendsListOpen] = useState(false);
  const [sourceListVersion, setSourceListVersion] = useState(0);

  const handleSourceSave = () => {
    setSourceListVersion(v => v + 1);
  };

  const initializeUser = useCallback(async () => {
    try {
      const response = await fetch('/api/users/me');
      if (response.ok) {
        const { user } = await response.json();
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  }, [setCurrentUser]);

  const loadSources = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const response = await fetch('/api/sources');
      if (response.ok) {
        const sources = await response.json();
        setCurrentSources(sources);
      }
    } catch (error) {
      console.error('Failed to fetch sources:', error);
    }
  }, [currentUser, setCurrentSources]);

  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  useEffect(() => {
    if (currentUser) {
      loadSources();
    }
  }, [currentUser, loadSources]);

  return (
    <div className="min-h-screen flex flex-col">
      <GlobalNavigationBar
        friendsListOpen={friendsListOpen}
        onToggleFriendsList={() => setFriendsListOpen(!friendsListOpen)}
        onEditSources={() => setEditSourcesModalOpen(true)}
      />

      <div className="flex-1 pt-16">
        <main className={`w-full ${friendsListOpen ? 'lg:pr-64' : ''}`}>
          <div className="max-w-7xl mx-auto px-4 py-6">
            <SourceGrid friendsListOpen={friendsListOpen} />
          </div>
        </main>
      </div>
      
      {currentUser && (
        <FriendsList 
          isOpen={friendsListOpen}
          onClose={() => setFriendsListOpen(false)}
        />
      )}

      <EditSources
        isOpen={editSourcesModalOpen}
        onClose={() => setEditSourcesModalOpen(false)}
        setSourceHeadlines={setSourceHeadlines}
        onEditSource={(source: Source | null) => {
          setEditingSource(source);
          setSourceSettingsOpen(true);
        }}
        sourceListVersion={sourceListVersion}
      />

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