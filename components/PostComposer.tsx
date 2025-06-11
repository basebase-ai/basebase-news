'use client';

import React, { useState } from 'react';
import { Story } from '@/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import LinkPreview from './LinkPreview';

interface PostComposerProps {
  story: Story;
  onClose: () => void;
}

export default function PostComposer({ story, onClose }: PostComposerProps) {
  const [text, setText] = useState<string>('');
  const [isPosting, setIsPosting] = useState<boolean>(false);

  const handlePost = async () => {
    if (!text.trim() || !story.id) {
      return;
    }

    setIsPosting(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId: story.id,
          text: text.trim(),
        }),
        credentials: 'include',
      });

      if (response.ok) {
        onClose();
      } else {
        const errorData = await response.json();
        console.error('Failed to create post:', errorData);
        alert('Failed to create post. Please try again.');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Share Story
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Text Input */}
          <div>
            <label htmlFor="post-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your thoughts
            </label>
            <textarea
              id="post-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your thoughts about this story..."
              className="w-full h-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
              maxLength={500}
              disabled={isPosting}
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">
              {text.length}/500
            </div>
          </div>

          {/* Link Preview */}
          <LinkPreview
            headline={story.fullHeadline}
            summary={story.summary}
            imageUrl={story.imageUrl}
            articleUrl={story.articleUrl}
            showFullImage={true}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isPosting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePost}
            disabled={!text.trim() || isPosting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 rounded-md transition-colors disabled:cursor-not-allowed"
          >
            {isPosting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
} 