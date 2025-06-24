'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { formatTimeAgo } from '@/lib/utils';
import LoadingSpinner from './LoadingSpinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';

interface SearchStory {
  id: string;
  headline: string;
  summary: string;
  url: string;
  imageUrl?: string | null;
  source: {
    name: string;
    imageUrl?: string;
  };
  createdAt: string;
}

interface SearchResultsProps {
  searchTerm: string;
}

export default function SearchResults({ searchTerm }: SearchResultsProps) {
  const [stories, setStories] = useState<SearchStory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchStories = async () => {
      if (!searchTerm.trim()) {
        setStories([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetchApi(`/api/stories/search?query=${encodeURIComponent(searchTerm)}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to search stories');
        }

        const searchResults = await response.json();
        setStories(Array.isArray(searchResults) ? searchResults : []);
      } catch (err) {
        console.error('Search error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while searching');
        setStories([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce the search to avoid too many API calls
    const timeoutId = setTimeout(searchStories, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleStoryClick = async (story: SearchStory) => {
    // Mark as read when clicked
    try {
      await fetchApi('/api/users/me/readids', {
        method: 'POST',
        body: JSON.stringify({ storyId: story.id }),
      });
    } catch (error) {
      console.error('Failed to mark story as read:', error);
    }
    
    // Open in new tab
    window.open(story.url, '_blank');
  };



  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner message="Searching stories..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 dark:text-red-400 mb-2">Search Error</div>
        <div className="text-gray-600 dark:text-gray-400">{error}</div>
      </div>
    );
  }

  if (!searchTerm.trim()) {
    return null;
  }

  if (stories.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 dark:text-gray-400 text-lg mb-2">No results found</div>
        <div className="text-gray-400 dark:text-gray-500 text-sm">
          Try different keywords or check your spelling
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Search Results
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Found {stories.length} result{stories.length !== 1 ? 's' : ''} for &quot;{searchTerm}&quot;
        </p>
      </div>
      
      <div className="space-y-4">
        {stories.map((story) => (
          <article 
            key={story.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleStoryClick(story)}
          >
            <div className="p-4">
              <div className="flex items-start gap-4">
                {/* Story image - 1x1 aspect ratio */}
                {story.imageUrl ? (
                  <img 
                    src={story.imageUrl} 
                    alt={story.headline}
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex-shrink-0 flex items-center justify-center">
                    <FontAwesomeIcon 
                      icon={faExternalLinkAlt} 
                      className="w-6 h-6 text-gray-400 dark:text-gray-500"
                    />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5 line-clamp-2 leading-tight">
                    {story.headline}
                  </h3>
                  
                  {story.summary && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2 leading-relaxed">
                      {story.summary}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1.5">
                        {story.source.imageUrl && (
                          <img 
                            src={story.source.imageUrl} 
                            alt={story.source.name}
                            className="w-3.5 h-3.5 object-contain"
                          />
                        )}
                        <span>{story.source.name}</span>
                      </div>
                      <span>{formatTimeAgo(story.createdAt)}</span>
                    </div>
                    
                    <FontAwesomeIcon 
                      icon={faExternalLinkAlt} 
                      className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
} 