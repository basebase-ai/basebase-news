'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import PostBox from './PostBox';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { storyService } from '@/services/story.service';
import { sourceService } from '@/services/source.service';
import { IStory } from '@/services/story.service';

interface CommentData {
  _id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
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
      
      const result = await storyService.searchStories(null, {
        limit: 50,
        page: 1,
      });
      console.log('[Feed] API response:', result);

      // Transform stories to match the UI's expected format
      const transformedStories = await Promise.all(result.stories.map(async story => {
        let source = {
          _id: story.newsSource || '',
          name: '', // Default value
          homepageUrl: '',
          imageUrl: undefined,
        };

        // Fetch source details if we have a source ID
        if (story.newsSource) {
          try {
            const sourceDetails = await sourceService.getSource(story.newsSource);
            if (sourceDetails) {
              source = {
                _id: sourceDetails.id || '',
                name: sourceDetails.name,
                homepageUrl: sourceDetails.homepageUrl || '',
                imageUrl: undefined,
              };
            }
          } catch (error) {
            console.error(`Failed to fetch source details for ${story.newsSource}:`, error);
          }
        }

        return {
          _id: story.id || '',
          fullHeadline: story.headline,
          articleUrl: story.url || '',
          summary: story.summary,
          imageUrl: story.imageUrl,
          createdAt: story.publishedAt,
          source,
          starCount: 0, // We'll need to implement star functionality in BaseBase
          starredBy: [], // We'll need to implement star functionality in BaseBase
          comments: [], // We'll need to implement comments in BaseBase
        };
      }));

      console.log('[Feed] Setting stories:', transformedStories.length);
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