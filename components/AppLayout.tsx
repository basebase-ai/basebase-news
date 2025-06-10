'use client';

import { useState } from 'react';
import SideBar from './SideBar';
import GlobalNavigationBar from './GlobalNavigationBar';
import { useAppState } from '@/lib/state/AppContext';
import SourceSettings from './SourceSettings';
import SignInModal from './SignInModal';
import { Source } from '@/types';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser } = useAppState();
  const [sourceSettingsOpen, setSourceSettingsOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [sourceListVersion, setSourceListVersion] = useState(0);

  const handleSourceSave = () => {
    setSourceListVersion(v => v + 1);
  };
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <SideBar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-52 flex flex-col flex-1">
        <GlobalNavigationBar
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 p-4 pt-20">
            {children}
        </main>
      </div>

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