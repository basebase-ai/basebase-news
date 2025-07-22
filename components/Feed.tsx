'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import PostBox from './PostBox';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { storyService } from '@/services/story.service';
import { friendsService } from '@/services/friends.service';
import { useAppState } from '@/lib/state/AppContext';

interface CommentData {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  userId: {
    id: string;
    first: string;
    last: string;
    email: string;
    imageUrl?: string;
  };
}

interface StoryData {
  id: string;
  fullHeadline: string;
  articleUrl: string;
  summary?: string;
  imageUrl?: string;
  createdAt?: string;
  source: {
    id: string;
    name: string;
    homepageUrl: string;
    imageUrl?: string;
  };
  starCount: number;
  starredBy: {
    id: string;
    first: string;
    last: string;
    email: string;
    imageUrl?: string;
  }[];
  comments: CommentData[];
}

export default function Feed() {
  const [stories, setStories] = useState<StoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { currentUser } = useAppState();

  const fetchStories = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      if (!currentUser) {
        console.log('[Feed] No current user, showing empty feed');
        setStories([]);
        return;
      }

      console.log('[Feed] Fetching recently starred stories by friends...');
      
      // Get user's friends
      const friends = await friendsService.getFriends(currentUser.id);
      const friendIds = friends.map(friend => friend.id);
      
      console.log(`[Feed] Found ${friends.length} friends:`, friendIds);
      
      if (friendIds.length === 0) {
        console.log('[Feed] No friends found, showing empty feed');
        setStories([]);
        return;
      }

      // Get recently starred stories by friends
      const storiesWithDetails = await storyService.getRecentlyStarredStoriesByFriends(friendIds, 50);
      
             // Transform to match UI expected format
       const transformedStories: StoryData[] = storiesWithDetails.map(story => ({
        id: story.id || '',
        fullHeadline: story.headline,
        articleUrl: story.url || '',
        summary: story.summary,
        imageUrl: story.imageUrl,
        createdAt: story.publishedAt,
        source: story.source,
        starCount: story.starCount,
        starredBy: story.starredBy || [],
        comments: story.comments || [],
      }));

      console.log(`[Feed] Setting ${transformedStories.length} stories from friends`);
      setStories(transformedStories);
    } catch (err) {
      console.error('[Feed] Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const handlePostCreated = () => {
    fetchStories();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white shrink-0">Discover</h1>
        <div className="relative flex-1 max-w-2xl ml-8">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FontAwesomeIcon icon={faSearch} className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search stories..."
            className="w-full h-12 px-6 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
          />
        </div>
      </div>
      {loading ? (
        <LoadingSpinner message="Loading stories..." />
      ) : error ? (
        <div className="text-red-500">Error: {error}</div>
      ) : stories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No recommended stories yet.</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            Stories your friends recommend will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {stories
            .filter(story => 
              searchTerm === '' || 
              story.fullHeadline.toLowerCase().includes(searchTerm.toLowerCase()) ||
              story.summary?.toLowerCase().includes(searchTerm.toLowerCase())
            )

            .map((story) => (
              <PostBox key={story.id} story={story} onCommentAdded={fetchStories} />
            ))}
        </div>
      )}
    </div>
  );
} 