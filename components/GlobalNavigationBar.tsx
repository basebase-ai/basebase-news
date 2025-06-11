'use client';

import Image from 'next/image';
import { useAppState } from '@/lib/state/AppContext';
import UserMenu from '@/components/UserMenu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';

interface GlobalNavigationBarProps {
  onToggleSidebar: () => void;
}

export default function GlobalNavigationBar({
  onToggleSidebar,
}: GlobalNavigationBarProps) {
  const { sidebarMinimized } = useAppState();
  return (
    <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 z-10 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button onClick={onToggleSidebar} className="lg:hidden p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            <FontAwesomeIcon icon={faBars} className="h-6 w-6" />
          </button>
          <div className="lg:hidden flex items-center space-x-2">
            <Image
              src="/assets/images/logo_150x150.png"
              alt="NewsWithFriends"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white hidden sm:block">NewsWithFriends</h1>
          </div>
        </div>
        <div className="flex items-center">
          <UserMenu />
        </div>
      </div>
    </header>
  );
} 