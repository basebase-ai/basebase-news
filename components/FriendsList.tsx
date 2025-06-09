'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Transition } from '@headlessui/react';
import { useAppState } from '@/lib/state/AppContext';
import type { User } from '@/types';
import Avatar from './Avatar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faUserPlus } from '@fortawesome/free-solid-svg-icons';

interface FriendsListProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Connection extends User {
  // Can be extended with connection-specific details if needed
}

export default function FriendsList({ isOpen, onClose }: FriendsListProps) {
  const { currentUser } = useAppState();
  const [friends, setFriends] = useState<User[]>([]);
  const [requests, setRequests] = useState<Connection[]>([]);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const [friendsRes, requestsRes, suggestionsRes] = await Promise.all([
        fetch('/api/connections?status=CONNECTED'),
        fetch('/api/connections?status=REQUESTED'),
        fetch('/api/connections?status=SUGGESTED'),
      ]);

      if (friendsRes.ok) {
        const data = await friendsRes.json();
        console.log('[FriendsList] Friends data:', data.connections);
        setFriends(data.connections || []);
      }
      if (requestsRes.ok) {
        const data = await requestsRes.json();
        console.log('[FriendsList] Requests data:', data.connections);
        setRequests(data.connections || []);
      }
      if (suggestionsRes.ok) {
        const data = await suggestionsRes.json();
        console.log('[FriendsList] Suggestions data:', data.connections);
        setSuggestions(data.connections || []);
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddFriend = async (targetUserId: string) => {
    try {
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      if (response.ok) {
        // Refresh all data to reflect the new connection status
        fetchData();
      }
    } catch (error) {
      console.error('Failed to add friend:', error);
    }
  };

  const renderUser = (user: User, type: 'friend' | 'request' | 'suggestion') => (
    <li key={user._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
      <div className="flex items-center space-x-3">
        <Avatar user={user} size="sm" />
        <span className="font-medium text-gray-800 dark:text-gray-200">{user.first} {user.last}</span>
      </div>
      {type === 'request' && (
        <button onClick={() => handleAddFriend(user._id)} className="p-1 text-primary hover:bg-primary/10 rounded-full">
          <FontAwesomeIcon icon={faCheck} className="w-5 h-5" />
        </button>
      )}
      {type === 'suggestion' && (
        <button onClick={() => handleAddFriend(user._id)} className="p-1 text-primary hover:bg-primary/10 rounded-full">
          <FontAwesomeIcon icon={faUserPlus} className="w-5 h-5" />
        </button>
      )}
    </li>
  );

  console.log('[Render] loading:', loading, 'suggestions:', suggestions.length);

  return (
    <Transition
      show={isOpen}
      as={React.Fragment}
      enter="transition ease-out duration-200"
      enterFrom="opacity-0 translate-x-full"
      enterTo="opacity-100 translate-x-0"
      leave="transition ease-in duration-150"
      leaveFrom="opacity-100 translate-x-0"
      leaveTo="opacity-0 translate-x-full"
    >
      <div className="fixed top-16 right-0 w-64 h-[calc(100%-4rem)] bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 z-50">
        <div className="overflow-y-auto h-full p-4">
          {loading ? (
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          ) : (
            <>
              {friends.length > 0 && (
                <section className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Friends</h3>
                  <ul className="space-y-1">{friends.map(user => renderUser(user, 'friend'))}</ul>
                </section>
              )}
              {requests.length > 0 && (
                <section className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Requests</h3>
                  <ul className="space-y-1">{requests.map(user => renderUser(user, 'request'))}</ul>
                </section>
              )}
              {suggestions.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Suggestions</h3>
                  <ul className="space-y-1">{suggestions.map(user => renderUser(user, 'suggestion'))}</ul>
                </section>
              )}
              {!friends.length && !requests.length && !suggestions.length && (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No new friend suggestions.</p>
              )}
            </>
          )}
        </div>
      </div>
    </Transition>
  );
} 