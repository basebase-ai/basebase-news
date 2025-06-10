'use client';

import { useState, useEffect } from 'react';
import { Story } from '@/types';
import LoadingSpinner from './LoadingSpinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar as faStarSolid } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons';

interface StarredStoryData {
  story: {
    id: string;
    fullHeadline: string;
    articleUrl: string;
    createdAt: string | Date;
    sourceId: string;
    sourceName: string;
    imageUrl?: string;
  };
  user: {
    _id: string;
    first: string;
    last: string;
    imageUrl?: string;
    email: string;
  };
}

export default function Feed() {
  const [starredData, setStarredData] = useState<StarredStoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStarredStories = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('[StarredStories] Fetching starred stories...');
        
        const response = await fetch('/api/users/me/stories/starred', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        console.log('[StarredStories] API response:', data);

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch starred stories');
        }

        if (data.status === 'ok' && Array.isArray(data.starredStories)) {
          console.log('[StarredStories] Setting stories:', data.starredStories.length);
          setStarredData(data.starredStories);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('[StarredStories] Error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStarredStories();
  }, []);

  const handleToggleStar = async (storyId: string, starred?: boolean) => {
    // TODO: Implement API call to star/unstar story
    setStarredData(starredData.map(item => 
      item.story.id === storyId 
        ? { ...item, story: { ...item.story } } 
        : item
    ));
  };

  const formatDate = (dateValue: string | Date): string => {
    try {
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
      return date.toLocaleDateString();
    } catch {
      return 'Unknown date';
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading your starred stories..." />;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div>
        <h2 className="text-2xl font-bold mb-4">Feed</h2>
        {starredData.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No starred stories yet.</p>
        ) : (
          <div className="space-y-4">
              {starredData.map((item) => (
              <article key={item.story.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex gap-4">
                    {item.story.imageUrl && (
                      <div className="flex-shrink-0">
                        <img 
                          src={item.story.imageUrl} 
                          alt=""
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <a 
                        href={item.story.articleUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary dark:hover:text-primary hover:underline block mb-2"
                      >
                          {item.story.fullHeadline}
                      </a>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-medium">{item.story.sourceName}</span>
                            <span className="mx-2">·</span>
                            <span>{formatDate(item.story.createdAt)}</span>
                            <span className="mx-2">·</span>
                            <span>Starred by {item.user.first} {item.user.last}</span>
                        </div>
                        <button 
                          onClick={() => handleToggleStar(item.story.id, true)} 
                          className="text-yellow-500 hover:text-yellow-600 transition-colors"
                        >
                            <FontAwesomeIcon icon={faStarSolid} className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
              </article>
              ))}
        </div>
        )}
    </div>
  );
} 