'use client';

import React from 'react';

interface LinkPreviewProps {
  headline: string;
  summary?: string;
  imageUrl?: string;
  articleUrl: string;
  showFullImage?: boolean;
}

export default function LinkPreview({ 
  headline, 
  summary, 
  imageUrl, 
  articleUrl, 
  showFullImage = true 
}: LinkPreviewProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
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
            <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
              {headline}
            </h3>
            {summary && (
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 mb-2">
                {summary}
              </p>
            )}
            <a
              href={articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block"
            >
              {articleUrl}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 