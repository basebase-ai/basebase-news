'use client';

import React, { useState } from 'react';
import LinkPreview from './LinkPreview';
import { useAppState } from '@/lib/state/AppContext';
import { Source } from '@/types';
import OverlappingAvatars from './OverlappingAvatars';
import StoryReactionModal from './StoryReactionModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faStar } from '@fortawesome/free-solid-svg-icons';

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

interface PostBoxProps {
  story: StoryData;
  onCommentAdded?: () => void;
}

export default function PostBox({ story, onCommentAdded }: PostBoxProps) {
  const [commentText, setCommentText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showReactionModal, setShowReactionModal] = useState<boolean>(false);
  const [reactionStory, setReactionStory] = useState<StoryData | null>(null);
  const { currentUser, setCurrentUser, currentSources, setCurrentSources } = useAppState();

  const isSourceAdded = (sourceId: string): boolean => {
    return currentUser?.sourceIds.includes(sourceId) || false;
  };

  const handleAddSource = async (sourceId: string) => {
    if (!currentUser) return;

    try {
      const updatedSourceIds = currentUser.sourceIds.includes(sourceId)
        ? currentUser.sourceIds
        : [sourceId, ...currentUser.sourceIds];

      const response = await fetch('/api/users/me/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: updatedSourceIds }),
      });

      if (response.ok) {
        const { user } = await response.json();
        setCurrentUser(user);
        
        const sourceResponse = await fetch(`/api/sources/${sourceId}`);
        if (sourceResponse.ok) {
          const { source } = await sourceResponse.json();
          if (source && !currentSources?.some(s => s._id === source._id)) {
            setCurrentSources(prev => [...(prev || []), source]);
          }
        }
      } else {
        throw new Error('Failed to update user sources');
      }
    } catch (error) {
      console.error('Failed to add source:', error);
    }
  };

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
          storyId: story._id,
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

  const getRecommendationText = (): string => {
    if (story.starredBy.length === 0) return '';
    
    const names = story.starredBy.slice(0, 3).map(user => user.first);
    const remainingCount = story.starredBy.length - 3;
    
    if (story.starredBy.length === 1) {
      return `${names[0]} recommended this`;
    } else if (story.starredBy.length === 2) {
      return `${names[0]} and ${names[1]} recommended this`;
    } else if (story.starredBy.length === 3) {
      return `${names[0]}, ${names[1]} and ${names[2]} recommended this`;
    } else {
      return `${names[0]}, ${names[1]}, ${names[2]} and ${remainingCount} other${remainingCount > 1 ? 's' : ''} recommended this`;
    }
  };

  const handleStoryClick = (storyId: string) => {
    setReactionStory(story);
    
    // Show reaction modal when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setShowReactionModal(true);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
  };

  const handleRecommend = async (comment?: string) => {
    if (!reactionStory) return;
    
    try {
      const response = await fetch('/api/users/me/stories/star', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          storyId: reactionStory._id,
          comment 
        }),
        credentials: 'include'
      });
      
      if (response.ok) {
        // Could update UI state here if needed
        console.log('Story recommended successfully');
      }
    } catch (error) {
      console.error('Failed to recommend story:', error);
    } finally {
      setShowReactionModal(false);
      setReactionStory(null);
    }
  };

  return (
    <article className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-3 max-w-[500px]">
      {/* Recommendation header */}
      {story.starredBy.length > 0 && (
        <div className="flex items-center space-x-3 pb-2 border-b border-gray-100 dark:border-gray-700">
          <OverlappingAvatars users={story.starredBy} maxDisplay={3} size="sm" showCount={false} />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {getRecommendationText()}
          </p>
        </div>
      )}
      {/* Story preview */}
      <div className="space-y-2">
        <LinkPreview
          headline={story.fullHeadline}
          summary={story.summary}
          imageUrl={story.imageUrl}
          articleUrl={story.articleUrl}
          showFullImage={true}
          createdAt={story.createdAt}
          storyId={story._id}
          onStoryClick={handleStoryClick}
        />
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            {story.source.imageUrl && (
              <img src={story.source.imageUrl} alt={story.source.name} className="w-4 h-4 object-contain" />
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">{story.source.name}</span>
          </div>
          {!isSourceAdded(story.source._id) && (
            <button
              onClick={() => handleAddSource(story.source._id)}
              className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded-full hover:bg-green-700"
            >
              Add
            </button>
          )}
        </div>
      </div>

      {/* Comments */}
      {story.comments && story.comments.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Comments ({story.comments.length})
          </h4>
          <div className="space-y-2">
            {story.comments.map((comment) => (
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
        <div className="flex items-stretch space-x-2">
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
            className="flex-shrink-0 w-10 flex items-center justify-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={isSubmitting ? "Adding comment..." : "Add comment"}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
            ) : (
              <FontAwesomeIcon icon={faPaperPlane} className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {showReactionModal && reactionStory && (
        <StoryReactionModal
          story={{
            id: reactionStory._id,
            articleUrl: reactionStory.articleUrl,
            fullHeadline: reactionStory.fullHeadline,
            sourceName: reactionStory.source.name,
            sourceUrl: reactionStory.source.homepageUrl,
            summary: reactionStory.summary,
            imageUrl: reactionStory.imageUrl,
            createdAt: reactionStory.createdAt
          }}
          onClose={() => {
            setShowReactionModal(false);
            setReactionStory(null);
          }}
          onRecommend={handleRecommend}
        />
      )}
    </article>
  );
} 