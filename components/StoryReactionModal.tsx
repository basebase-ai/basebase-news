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

  const handleRecommend = () => {
    if (showComment) {
      onRecommend(comment);
    } else {
      setShowComment(true);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-auto">
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center">
            Recommend this to friends?
          </h2>
          
          <div className="text-gray-700 dark:text-gray-300 text-center">
            {story.fullHeadline}
          </div>

          {!showComment ? (
            <div className="flex justify-center space-x-4 mt-6">
              <button
                onClick={handleRecommend}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FontAwesomeIcon icon={faStar} />
                <span>Recommend</span>
              </button>
              <button
                onClick={handleSkip}
                className="flex items-center space-x-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} />
                <span>Skip</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Comment (optional)"
                className="w-full h-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                maxLength={500}
              />
              <div className="flex justify-end">
                <button
                  onClick={() => onRecommend(comment)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 