'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppState } from '@/lib/state/AppContext';
import type { User } from '@/types';
import Avatar from './Avatar';
import LoadingSpinner from './LoadingSpinner';
import FriendSourcesModal from './FriendSourcesModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faUserPlus, faSearch, faEye } from '@fortawesome/free-solid-svg-icons';
import { friendsService } from '@/services/friends.service';

interface Connection extends User {
  // Can be extended with connection-specific details if needed
}

export default function FriendsList() {
  const { currentUser, friends, setFriends } = useAppState();
  const [requests, setRequests] = useState<Connection[]>([]);
  const [outgoingPending, setOutgoingPending] = useState<User[]>([]);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [friendSourcesModalOpen, setFriendSourcesModalOpen] = useState(false);

  const fetchData = useCallback(async (user: any) => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('[FriendsList] Fetching connections for user:', user.id);

      // Fetch friend requests, outgoing pending, and suggestions using the friendsService
      const [requestsData, outgoingPendingData, suggestionsData] = await Promise.all([
        friendsService.getFriendRequests(user.id),
        friendsService.getOutgoingPendingRequests(user.id),
        friendsService.getSuggestedFriends(user.id),
      ]);

      console.log(`[FriendsList] Found ${requestsData.length} friend requests`);
      console.log(`[FriendsList] Found ${outgoingPendingData.length} outgoing pending requests`);
      console.log(`[FriendsList] Found ${suggestionsData.length} suggested friends`);

      // Convert IUser[] to User[] format for the UI
      const convertToUser = (iUser: any): User => {
        const nameParts = iUser.name?.split(' ') || [];
        return {
          id: iUser.id,
          first: nameParts[0] || '',
          last: nameParts.slice(1).join(' ') || '',
          phone: iUser.phone || '',
          email: iUser.email || '',
          imageUrl: iUser.imageUrl,
          sourceIds: [], // Not needed for friends UI
          denseMode: false,
          darkMode: false,
        };
      };

      const requestsArray = requestsData.map(convertToUser);
      const outgoingPendingArray = outgoingPendingData.map(convertToUser);
      const suggestionsArray = suggestionsData.map(convertToUser);

      setRequests(requestsArray);
      setOutgoingPending(outgoingPendingArray);
      setSuggestions(suggestionsArray);
    } catch (error) {
      console.error('Failed to fetch connections:', error);
      // Set empty arrays on error
      setRequests([]);
      setOutgoingPending([]);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchData(currentUser);
    }
  }, [currentUser, fetchData]);

  const handleAddFriend = async (targetUserId: string) => {
    try {
      if (!currentUser) return;
      
      await friendsService.addFriend(currentUser.id, targetUserId);
      
      // Refresh all data to show updated state
      await fetchData(currentUser);
      
      // Refresh friends in central state
      try {
        const updatedFriendsData = await friendsService.getFriends(currentUser.id);
        const updatedFriends: User[] = updatedFriendsData.map(friend => {
          const nameParts = friend.name.split(' ');
          return {
            id: friend.id,
            first: nameParts[0] || '',
            last: nameParts.slice(1).join(' ') || '',
            phone: friend.phone,
            email: friend.email || '',
            imageUrl: friend.imageUrl,
            sourceIds: [],
            denseMode: false,
            darkMode: false,
          };
        });
        setFriends(updatedFriends);
      } catch (error) {
        console.error('Failed to refresh central friends state:', error);
      }
    } catch (error) {
      console.error('Failed to add friend:', error);
    }
  };

  const handleViewSources = (friend: User) => {
    setSelectedFriend(friend);
    setFriendSourcesModalOpen(true);
  };

  const renderUserCard = (user: User, type: 'friend' | 'request' | 'suggestion' | 'pending') => (
    <div key={user.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar user={user} size="md" />
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">{user.first} {user.last}</h3>
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
              onClick={() => handleAddFriend(user.id)} 
              className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
              <span>Accept</span>
            </button>
          )}
          {type === 'pending' && (
            <div className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center space-x-2">
              <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
              <span>Request Sent</span>
            </div>
          )}
          {type === 'suggestion' && (
            <button 
              onClick={() => handleAddFriend(user.id)} 
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-8">
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
            {outgoingPending.length > 0 && (
              <section className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Pending Requests</h3>
                <div className="space-y-3">
                  {filterUsers(outgoingPending).map(user => renderUserCard(user, 'pending'))}
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
            {!friends.length && !requests.length && !outgoingPending.length && !suggestions.length && (
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