'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import PostBox from './PostBox';
import PostComposer from './PostComposer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faPen } from '@fortawesome/free-solid-svg-icons';

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
  storyId?: {
    _id: string;
    fullHeadline: string;
    articleUrl: string;
    summary?: string;
    imageUrl?: string;
    source: {
      _id: string;
      name: string;
      homepageUrl: string;
      imageUrl?: string;
    }
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

export default function Feed() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showPostComposer, setShowPostComposer] = useState(false);

  const fetchPosts = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      console.log('[Feed] Fetching posts...');
      
      const response = await fetch('/api/posts', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      console.log('[Feed] API response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch posts');
      }

      if (data.status === 'ok' && Array.isArray(data.posts)) {
        console.log('[Feed] Setting posts:', data.posts.length);
        setPosts(data.posts);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('[Feed] Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handlePostCreated = () => {
    setShowPostComposer(false);
    fetchPosts();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white shrink-0">Feed</h1>
        <div className="relative flex-1 max-w-2xl ml-8">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FontAwesomeIcon icon={faSearch} className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search posts..."
            className="w-full h-12 px-6 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
          />
        </div>
        <button
          className="ml-4 shrink-0 w-12 h-12 flex items-center justify-center text-white bg-primary rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-sm"
          onClick={() => setShowPostComposer(true)}
          title="Create New Post"
        >
          <FontAwesomeIcon icon={faPen} className="h-5 w-5" />
        </button>
      </div>
      {loading ? (
        <LoadingSpinner message="Loading posts..." />
      ) : error ? (
        <div className="text-red-500">Error: {error}</div>
      ) : posts.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No posts yet.</p>
      ) : (
        <div className="space-y-4">
          {posts
            .filter(post => 
              searchTerm === '' || 
              post.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
              post.storyId?.fullHeadline.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((post) => (
              <PostBox key={post._id} post={post} onCommentAdded={fetchPosts} />
            ))}
        </div>
      )}

      {showPostComposer && (
        <PostComposer
          onClose={handlePostCreated}
        />
      )}
    </div>
  );
} 