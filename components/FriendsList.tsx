'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppState } from '@/lib/state/AppContext';
import type { User } from '@/types';
import Avatar from './Avatar';
import LoadingSpinner from './LoadingSpinner';
import FriendSourcesModal from './FriendSourcesModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faUserPlus, faSearch, faEye } from '@fortawesome/free-solid-svg-icons';

interface Connection extends User {
  // Can be extended with connection-specific details if needed
}

export default function FriendsList() {
  const { currentUser, friends, setFriends } = useAppState();
  const [requests, setRequests] = useState<Connection[]>([]);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [friendSourcesModalOpen, setFriendSourcesModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const [requestsRes, suggestionsRes] = await Promise.all([
        fetch('/api/connections?status=REQUESTED'),
        fetch('/api/connections?status=SUGGESTED'),
      ]);

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
        // Also refresh friends in central state
        const friendsRes = await fetch('/api/connections?status=CONNECTED');
        if (friendsRes.ok) {
          const data = await friendsRes.json();
          setFriends(data.connections || []);
        }
      }
    } catch (error) {
      console.error('Failed to add friend:', error);
    }
  };

  const handleViewSources = (friend: User) => {
    setSelectedFriend(friend);
    setFriendSourcesModalOpen(true);
  };

  const renderUserCard = (user: User, type: 'friend' | 'request' | 'suggestion') => (
    <div key={user._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar user={user} size="md" />
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">{user.first} {user.last}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {type === 'friend' && (
            <button
              onClick={() => handleViewSources(user)}
              className="px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors flex items-center space-x-2"
            >
              <FontAwesomeIcon icon={faEye} className="h-4 w-4" />
              <span>View Sources</span>
            </button>
          )}
          {type === 'request' && (
            <button 
              onClick={() => handleAddFriend(user._id)} 
              className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
              <span>Accept</span>
            </button>
          )}
          {type === 'suggestion' && (
            <button 
              onClick={() => handleAddFriend(user._id)} 
              className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors flex items-center space-x-2"
            >
              <FontAwesomeIcon icon={faUserPlus} className="h-4 w-4" />
              <span>Add Friend</span>
            </button>
          )}
        </div>
      </div>
    </div>
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
    <>
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
              <section className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Friends</h3>
                <div className="space-y-3">
                  {filterUsers(friends).map(user => renderUserCard(user, 'friend'))}
                </div>
              </section>
            )}
            {requests.length > 0 && (
              <section className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Friend Requests</h3>
                <div className="space-y-3">
                  {filterUsers(requests).map(user => renderUserCard(user, 'request'))}
                </div>
              </section>
            )}
            {suggestions.length > 0 && (
              <section className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Suggested Friends</h3>
                <div className="space-y-3">
                  {filterUsers(suggestions).map(user => renderUserCard(user, 'suggestion'))}
                </div>
              </section>
            )}
            {!friends.length && !requests.length && !suggestions.length && (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No new friend suggestions.</p>
            )}
          </>
        )}
      </div>

      <FriendSourcesModal
        isOpen={friendSourcesModalOpen}
        onClose={() => {
          setFriendSourcesModalOpen(false);
          setSelectedFriend(null);
        }}
        friend={selectedFriend}
      />
    </>
  );
} 