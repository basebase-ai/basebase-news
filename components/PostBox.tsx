'use client';

import React, { useState } from 'react';
import LinkPreview from './LinkPreview';

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
  comments: CommentData[];
}

interface PostBoxProps {
  post: PostData;
  onCommentAdded?: () => void;
}

export default function PostBox({ post, onCommentAdded }: PostBoxProps) {
  const [commentText, setCommentText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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

  const handleSubmitComment = async (): Promise<void> => {
    if (!commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: post._id,
          text: commentText.trim(),
        }),
      });

      if (response.ok) {
        setCommentText('');
        if (onCommentAdded) {
          onCommentAdded();
        }
      } else {
        console.error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
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

      {/* Comments */}
      {post.comments && post.comments.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Comments ({post.comments.length})
          </h4>
          <div className="space-y-2">
            {post.comments.map((comment) => (
              <div key={comment._id} className="flex items-start space-x-2">
                {/* Comment author avatar */}
                {comment.userId.imageUrl ? (
                  <img
                    src={comment.userId.imageUrl}
                    alt={`${comment.userId.first} ${comment.userId.last}`}
                    className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5"
                  />
                ) : (
                  <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {comment.userId.first.charAt(0)}{comment.userId.last.charAt(0)}
                    </span>
                  </div>
                )}
                
                {/* Comment content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {comment.userId.first} {comment.userId.last}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(comment.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {comment.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add comment input */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add comment..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSubmitting}
          />
          <button
            onClick={handleSubmitComment}
            disabled={!commentText.trim() || isSubmitting}
            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </article>
  );
} 