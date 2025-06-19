'use client';

import { useState } from 'react';
import GlobalNavigationBar from '@/components/GlobalNavigationBar';
import SideBar from '@/components/SideBar';
import { useAppState } from '@/lib/state/AppContext';
import SourceSettings from './SourceSettings';
import SignInModal from './SignInModal';
import { Source } from '@/types';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const { sidebarMinimized } = useAppState();
  const [sourceSettingsOpen, setSourceSettingsOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [sourceListVersion, setSourceListVersion] = useState(0);

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

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <SideBar isOpen={isSidebarOpen} onClose={handleCloseSidebar} />
      <GlobalNavigationBar onToggleSidebar={handleToggleSidebar} />
      <main className={`pt-16 ${mainPadding} transition-all duration-300 ease-in-out`}>
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