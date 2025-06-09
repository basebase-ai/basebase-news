'use client';

import type { User } from '@/types';

const colors = [
  'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500',
  'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500',
  'bg-orange-500', 'bg-cyan-500', 'bg-lime-500', 'bg-emerald-500',
];

const getInitials = (first?: string, last?: string): string => {
  if (!first || !last) return '?';
  const firstInitial = first.charAt(0) || '';
  const lastInitial = last.charAt(0) || '';
  return `${firstInitial}${lastInitial}`.toUpperCase();
};

const colorForString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % colors.length);
  return colors[index];
};

interface AvatarProps {
  user: Partial<User>;
  size?: 'sm' | 'md' | 'lg';
}

export default function Avatar({ user, size = 'md' }: AvatarProps) {
  const { first, last, email, imageUrl } = user;

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const selectedSize = sizeClasses[size];

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={`${first || ''} ${last || ''}`}
        className={`rounded-full object-cover ${selectedSize}`}
      />
    );
  }

  const initials = getInitials(first, last);
  const bgColor = colorForString(email || `${first || ''}${last || ''}`);

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white ${bgColor} ${selectedSize}`}
      title={email || ''}
    >
      {initials}
    </div>
  );
} 