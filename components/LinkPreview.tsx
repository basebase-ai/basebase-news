'use client';

import React from 'react';

interface LinkPreviewProps {
  headline: string;
  summary?: string;
  imageUrl?: string;
  articleUrl: string;
  showFullImage?: boolean;
  createdAt?: string;
  storyId?: string;
  onStoryClick?: (storyId: string) => void;
}

export default function LinkPreview({ 
  headline, 
  summary, 
  imageUrl, 
  articleUrl, 
  showFullImage = true,
  createdAt,
  storyId,
  onStoryClick
}: LinkPreviewProps) {
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Unknown date';
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(articleUrl, '_blank');
    
    // Call the callback if provided (for marking as read, etc.)
    if (storyId && onStoryClick) {
      onStoryClick(storyId);
    }
  };

  return (
    <div 
      className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
      onClick={handleClick}
    >
      <div className="space-y-3">
        {imageUrl && showFullImage && (
          <div className="w-full">
            <img
              src={imageUrl}
              alt=""
              className="w-full h-32 object-cover rounded-md"
            />
          </div>
        )}
        <div className={showFullImage ? '' : 'flex space-x-3'}>
          {imageUrl && !showFullImage && (
            <div className="flex-shrink-0">
              <img
                src={imageUrl}
                alt=""
                className="w-16 h-16 object-cover rounded-md"
              />
            </div>
          )}
          <div className={showFullImage ? '' : 'flex-1 min-w-0'}>
            <h3 className="text-base font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
              {headline}
            </h3>
            {createdAt && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {formatDate(createdAt)}
              </p>
            )}
            {summary && (
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 mb-2">
                {summary}
              </p>
            )}
            <span className="text-xs text-blue-600 dark:text-blue-400 truncate block">
              {articleUrl}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 