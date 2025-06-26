'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useAppState } from '@/lib/state/AppContext';
import { fetchApi } from '@/lib/api';
import Avatar from '@/components/Avatar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faGear, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

  const menuItems = [
    { href: '/reader', icon: 'ri-compass-3-line', text: 'My News' },
    { href: '/feed', icon: 'ri-star-line', text: 'Discover' },
    { href: '/friends', icon: 'ri-user-heart-line', text: 'Friends' },
    { href: '/sources', icon: 'ri-list-check-2', text: 'Sources' },
];

interface SideBarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SideBar({ isOpen, onClose }: SideBarProps) {
  const pathname = usePathname();
  const { sidebarMinimized, setSidebarMinimized, currentUser, setCurrentUser, setDarkMode, setDenseMode, setSignInModalOpen } = useAppState();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setCurrentUser(null);
        window.location.reload();
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const updateUserPreferences = async (preferences: { denseMode?: boolean; darkMode?: boolean }) => {
    try {
      console.log('Updating preferences:', preferences);
      const response = await fetchApi('/api/users/me/preferences', {
        method: 'PUT',
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        const { user } = await response.json();
        console.log('Updated user:', user);
        setCurrentUser(user);
        if (preferences.denseMode !== undefined) setDenseMode(preferences.denseMode);
        if (preferences.darkMode !== undefined) setDarkMode(preferences.darkMode);
      } else {
        console.error('Failed to update preferences:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  return (
    <>
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>
      <aside className={`fixed top-0 left-0 h-full bg-gray-800 text-white transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out z-40 ${sidebarMinimized ? 'w-16' : 'w-[228px]'} border-r border-gray-700 flex flex-col`}>
        <div className={`p-4 flex items-center mb-4 ${sidebarMinimized ? 'justify-center' : 'space-x-2'}`}>
          <Image
            src="/assets/images/logo_150x150.png"
            alt="NewsWithFriends"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          {!sidebarMinimized && (
            <Image
              src="/assets/images/logotype_white.png"
              alt="NewsWithFriends"
              width={132}
              height={26}
              className="h-[26px] w-auto"
            />
          )}
        </div>
        <nav className="flex-1">
          <ul>
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link 
                  href={item.href} 
                  className={`flex items-center ${sidebarMinimized ? 'justify-center px-4' : 'px-4'} py-4 hover:bg-gray-700 ${pathname === item.href ? 'bg-gray-900' : ''}`} 
                  onClick={onClose}
                  title={sidebarMinimized ? item.text : undefined}
                >
                  <i className={`${item.icon} ${sidebarMinimized ? '' : 'mr-3'} text-[1.3em]`}></i>
                  {!sidebarMinimized && <span>{item.text}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="relative">
          <div className="border-t border-gray-700">
            {!currentUser ? (
              <button
                onClick={() => setSignInModalOpen(true)}
                className={`w-full flex items-center ${sidebarMinimized ? 'justify-center px-4' : 'px-4'} py-3 hover:bg-gray-700 transition-colors duration-200 text-gray-300`}
                title={sidebarMinimized ? 'Sign In' : undefined}
              >
                <FontAwesomeIcon icon={faGear} className={`${sidebarMinimized ? '' : 'mr-3'} text-[1.1em]`} />
                {!sidebarMinimized && <span>Sign In</span>}
              </button>
            ) : (
              <button
                onClick={() => setDropdownVisible(!dropdownVisible)}
                className={`w-full flex items-center ${sidebarMinimized ? 'justify-center px-4' : 'px-4'} py-3 hover:bg-gray-700 transition-colors duration-200`}
                title={sidebarMinimized ? 'Settings' : undefined}
              >
                <FontAwesomeIcon icon={faGear} className={`text-gray-300 ${sidebarMinimized ? '' : 'mr-3'} text-[1.1em]`} />
                {!sidebarMinimized && <span className="text-gray-300">Settings</span>}
              </button>
            )}

            {currentUser && (
              <div className={`${sidebarMinimized ? 'px-4 py-2 flex justify-center' : 'px-4 py-3'}`}>
                <div className={`${sidebarMinimized ? 'flex flex-col items-center space-y-1' : 'flex items-center space-x-3 w-full'}`}>
                  <Avatar user={currentUser} size="md" />
                  {!sidebarMinimized && (
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {currentUser.first} {currentUser.last}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {dropdownVisible && currentUser && (
              <div
                ref={dropdownRef}
                className={`absolute ${sidebarMinimized ? 'left-14 bottom-0' : 'right-0 bottom-full mb-2'} w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 border border-gray-200 dark:border-gray-700`}
              >
                <div className="py-1">
                  <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    {currentUser.first} {currentUser.last}
                  </div>

                  <div className="px-4 py-2 flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Dense Mode</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentUser.denseMode || false}
                        onChange={(e) => updateUserPreferences({ denseMode: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="px-4 py-2 flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Dark Mode</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentUser.darkMode || false}
                        onChange={(e) => updateUserPreferences({ darkMode: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" />Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarMinimized(!sidebarMinimized)}
            className="absolute -right-4 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center border border-gray-700 hover:bg-gray-700 transition-colors duration-200 hidden lg:flex"
          >
            <FontAwesomeIcon icon={sidebarMinimized ? faChevronRight : faChevronLeft} className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
} 