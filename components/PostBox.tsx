'use client';

import React from 'react';
import LinkPreview from './LinkPreview';

interface PostData {
  _id: string;
  text: string;
  createdAt: string;
  storyId: {
    _id: string;
    fullHeadline: string;
    articleUrl: string;
    summary?: string;
    imageUrl?: string;
  };
  userId: {
    _id: string;
    first: string;
    last: string;
    email: string;
    imageUrl?: string;
  };
}

interface PostBoxProps {
  post: PostData;
}

export default function PostBox({ post }: PostBoxProps) {
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <article className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-3">
      {/* User info and date */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {post.userId.imageUrl ? (
            <img
              src={post.userId.imageUrl}
              alt={`${post.userId.first} ${post.userId.last}`}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {post.userId.first.charAt(0)}{post.userId.last.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {post.userId.first} {post.userId.last}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(post.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Post text */}
      <div className="text-gray-900 dark:text-white whitespace-pre-wrap">
        {post.text}
      </div>

      {/* Link preview */}
      <LinkPreview
        headline={post.storyId.fullHeadline}
        summary={post.storyId.summary}
        imageUrl={post.storyId.imageUrl}
        articleUrl={post.storyId.articleUrl}
        showFullImage={true}
      />
    </article>
  );
} 