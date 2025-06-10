'use client';

import Image from 'next/image';
import { useAppState } from '@/lib/state/AppContext';
import UserMenu from '@/components/UserMenu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserGroup } from '@fortawesome/free-solid-svg-icons';

interface GlobalNavigationBarProps {
  friendsListOpen: boolean;
  onToggleFriendsList: () => void;
  onEditSources: () => void;
}

export default function GlobalNavigationBar({
  friendsListOpen,
  onToggleFriendsList,
  onEditSources,
}: GlobalNavigationBarProps) {
  const { searchTerm, setSearchTerm } = useAppState();

  return (
    <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 z-50 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Image
            src="/assets/images/logo_150x150.png"
            alt="StoryList"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">StoryList</h1>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search..."
            className="w-32 md:w-32 h-9 px-4 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            onClick={onToggleFriendsList}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
              friendsListOpen
                ? 'bg-primary/10 text-primary dark:bg-primary/20'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            <FontAwesomeIcon icon={faUserGroup} className="h-6 w-6" />
          </button>
          <UserMenu onEditSources={onEditSources} />
        </div>
      </div>
    </header>
  );
} 