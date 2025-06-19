'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import PostBox from './PostBox';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { fetchApi } from '@/lib/api';

interface CommentData {
  _id: string;
  text: string;
  createdAt: string;
  userId: {
    _id: string;
    first: string;
    last: string;
    email: string;
    imageUrl?: string;
  };
}

interface StoryData {
  _id: string;
  fullHeadline: string;
  articleUrl: string;
  summary?: string;
  imageUrl?: string;
  createdAt?: string;
  source: {
    _id: string;
    name: string;
    homepageUrl: string;
    imageUrl?: string;
  };
  starCount: number;
  starredBy: {
    _id: string;
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

  const fetchStories = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      console.log('[Feed] Fetching recommended stories...');
      
      const response = await fetchApi('/api/stories/recommended');
      const data = await response.json();
      console.log('[Feed] API response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stories');
      }

      if (data.status === 'ok' && Array.isArray(data.stories)) {
        console.log('[Feed] Setting stories:', data.stories.length);
        setStories(data.stories);
      } else {
        throw new Error('Invalid response format');
      }
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8">
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
        <p className="text-gray-500 dark:text-gray-400">No stories yet.</p>
      ) : (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {stories
            .filter(story => 
              searchTerm === '' || 
              story.fullHeadline.toLowerCase().includes(searchTerm.toLowerCase()) ||
              story.summary?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => {
              const dateA = new Date(a.createdAt || '').getTime();
              const dateB = new Date(b.createdAt || '').getTime();
              return dateB - dateA; // Most recent first
            })
            .map((story) => (
              <PostBox key={story._id} story={story} onCommentAdded={fetchStories} />
            ))}
        </div>
      )}
    </div>
  );
} 