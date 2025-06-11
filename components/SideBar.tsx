import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const menuItems = [
  { href: '/discover', icon: 'ri-compass-3-line', text: 'Discover' },
  { href: '/feed', icon: 'ri-star-line', text: 'Feed' },
  { href: '/friends', icon: 'ri-user-heart-line', text: 'Friends' },
  { href: '/sources', icon: 'ri-list-check-2', text: 'All Sources' },
];

interface SideBarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SideBar({ isOpen, onClose }: SideBarProps) {
  const pathname = usePathname();

  return (
    <>
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>
      <aside className={`fixed top-0 left-0 h-full bg-gray-800 text-white w-52 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out z-40`}>
        <div className="p-4 flex items-center space-x-2">
          <Image
            src="/assets/images/logo_150x150.png"
            alt="StoryList"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <h2 className="text-xl font-bold">StoryList</h2>
        </div>
        <nav>
          <ul>
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={`flex items-center p-4 hover:bg-gray-700 ${pathname === item.href ? 'bg-gray-900' : ''}`} onClick={onClose}>
                    <i className={`${item.icon} mr-3`}></i>
                    <span>{item.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
} 