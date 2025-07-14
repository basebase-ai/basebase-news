import Avatar from './Avatar';
import { User } from '@/types';

interface BasicUser {
  id: string;
  first: string;
  last: string;
  email: string;
  imageUrl?: string;
}

interface OverlappingAvatarsProps {
  users: User[] | BasicUser[];
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}

export default function OverlappingAvatars({ 
  users, 
  maxDisplay = 3, 
  size = 'sm',
  showCount = true 
}: OverlappingAvatarsProps) {
  if (users.length === 0) return null;

  const displayedUsers = users.slice(0, maxDisplay);
  const remainingCount = users.length - maxDisplay;

  // Check if user is a full User type or BasicUser
  const isFullUser = (user: User | BasicUser): user is User => {
    return 'isAdmin' in user;
  };

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {displayedUsers.map((user, index) => (
          <div 
            key={user.id}
            className="relative ring-2 ring-white dark:ring-gray-700 rounded-full"
            style={{ zIndex: displayedUsers.length - index }}
            title={`${user.first} ${user.last}`}
          >
            {isFullUser(user) ? (
              <Avatar user={user} size={size} />
            ) : (
              <div className={`${size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : 'w-10 h-10'} rounded-full overflow-hidden`}>
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt={`${user.first} ${user.last}`} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center ${size === 'sm' ? 'text-xs' : 'text-sm'} font-medium text-gray-700 dark:text-gray-300`}>
                    {user.first.charAt(0)}{user.last.charAt(0)}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {showCount && remainingCount > 0 && (
        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
} 