'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppState } from '@/lib/state/AppContext';
import type { User } from '@/types';
import Avatar from './Avatar';
import LoadingSpinner from './LoadingSpinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faUserPlus, faSearch } from '@fortawesome/free-solid-svg-icons';

interface Connection extends User {
  // Can be extended with connection-specific details if needed
}

export default function FriendsList() {
  const { currentUser } = useAppState();
  const [friends, setFriends] = useState<User[]>([]);
  const [requests, setRequests] = useState<Connection[]>([]);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

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
        setFriends(data.connections || []);
      }
      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setRequests(data.connections || []);
      }
      if (suggestionsRes.ok) {
        const data = await suggestionsRes.json();
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

  const filterUsers = (users: User[]) => {
    if (!searchTerm) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(user => 
      `${user.first} ${user.last}`.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term)
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white shrink-0">Friends</h1>
        <div className="relative flex-1 max-w-2xl ml-8">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FontAwesomeIcon icon={faSearch} className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search friends..."
            className="w-full h-12 px-6 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
          />
        </div>
        <button
          className="ml-4 shrink-0 w-12 h-12 flex items-center justify-center text-white bg-primary rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-sm"
          onClick={() => window.location.href = 'mailto:?subject=Join%20me%20on%20NewsWithFriends&body=I%20think%20you%27d%20enjoy%20using%20NewsWithFriends%20with%20me!%20Check%20it%20out%20at%20https://newswithfriends.com'}
          title="Invite Friends"
        >
          <FontAwesomeIcon icon={faUserPlus} className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading friends..." />
      ) : (
        <>
          {friends.length > 0 && (
            <section className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Friends</h3>
              <ul className="space-y-1">{filterUsers(friends).map(user => renderUser(user, 'friend'))}</ul>
            </section>
          )}
          {requests.length > 0 && (
            <section className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Requests</h3>
              <ul className="space-y-1">{filterUsers(requests).map(user => renderUser(user, 'request'))}</ul>
            </section>
          )}
          {suggestions.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Suggestions</h3>
              <ul className="space-y-1">{filterUsers(suggestions).map(user => renderUser(user, 'suggestion'))}</ul>
            </section>
          )}
          {!friends.length && !requests.length && !suggestions.length && (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No new friend suggestions.</p>
          )}
        </>
      )}
    </div>
  );
} 