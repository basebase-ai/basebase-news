import { useState, useEffect } from 'react';
import { Story } from '@/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faXmark } from '@fortawesome/free-solid-svg-icons';

interface StoryReactionModalProps {
  story: Story;
  onClose: () => void;
  onRecommend: (comment?: string) => void;
}

export default function StoryReactionModal({ story, onClose, onRecommend }: StoryReactionModalProps) {
  const [showComment, setShowComment] = useState<boolean>(false);
  const [comment, setComment] = useState<string>('');
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    // Animate in after a short delay
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleRecommend = () => {
    if (showComment) {
      onRecommend(comment);
    } else {
      setShowComment(true);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200); // Wait for animation to complete
  };

  return (
    <div 
      className={`fixed bottom-4 right-4 z-50 transition-all duration-200 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-80 max-w-[calc(100vw-2rem)]">
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Recommend this story?
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
            </button>
          </div>
          
          <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
            {story.fullHeadline}
          </div>

          {!showComment ? (
            <div className="flex space-x-2">
              <button
                onClick={handleRecommend}
                className="flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
              >
                <FontAwesomeIcon icon={faStar} className="w-3 h-3" />
                <span>Recommend</span>
              </button>
              <button
                onClick={handleClose}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Skip
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment (optional)"
                className="w-full h-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                maxLength={200}
              />
              <div className="flex space-x-2">
                <button
                  onClick={() => onRecommend(comment)}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors flex-1"
                >
                  Recommend
                </button>
                <button
                  onClick={handleClose}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 