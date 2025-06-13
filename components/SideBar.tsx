'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAppState } from '@/lib/state/AppContext';
import UserMenu from '@/components/UserMenu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

  const menuItems = [
    { href: '/feed', icon: 'ri-star-line', text: 'Discover' },
    { href: '/reader', icon: 'ri-compass-3-line', text: 'My Sources' },
  { href: '/friends', icon: 'ri-user-heart-line', text: 'Friends' },
  { href: '/sources', icon: 'ri-list-check-2', text: 'All Sources' },
];

interface SideBarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SideBar({ isOpen, onClose }: SideBarProps) {
  const pathname = usePathname();
  const { sidebarMinimized, setSidebarMinimized } = useAppState();

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
          <div className={`${sidebarMinimized ? 'p-2 flex justify-center' : 'p-4'} border-t border-gray-700`}>
            <UserMenu sidebarMinimized={sidebarMinimized} />
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