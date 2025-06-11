'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import PostBox from './PostBox';

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

export default function Feed() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return <LoadingSpinner message="Loading posts..." />;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Feed</h2>
      {posts.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No posts yet.</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostBox key={post._id} post={post} onCommentAdded={fetchPosts} />
          ))}
        </div>
      )}
    </div>
  );
} 