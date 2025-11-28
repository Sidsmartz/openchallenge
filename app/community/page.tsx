'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Toaster, toast } from 'sonner';

interface Post {
  id: string;
  user: { id: string; full_name: string; avatar_url?: string; };
  content: string;
  image_urls: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_has_liked: boolean;
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<{[key: string]: any[]}>({});
  const [loadingComments, setLoadingComments] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    checkUser();
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadPosts = async () => {
    try {
      const response = await fetch('/api/posts/feed');
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages(files);
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error('Please enter some content');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in to create posts');
        return;
      }

      const formData = new FormData();
      formData.append('content', content);
      images.forEach(image => formData.append('images', image));

      const response = await fetch('/api/posts/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        if (data.post.status === 'flagged') {
          toast.warning('Post flagged for review', {
            description: 'Your post contains potentially offensive content and will be reviewed by moderators.',
          });
        } else {
          toast.success('Post published successfully!');
        }
        setContent('');
        setImages([]);
        setImagePreviews([]);
        loadPosts();
      } else {
        toast.error('Failed to create post', {
          description: data.details || data.error,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast.error('Please log in to like posts');
      return;
    }

    // Optimistic update
    setPosts(prevPosts => prevPosts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          user_has_liked: !post.user_has_liked,
          likes_count: post.user_has_liked ? post.likes_count - 1 : post.likes_count + 1,
        };
      }
      return post;
    }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/posts/like', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ postId }),
      });

      if (!response.ok) {
        // Revert on error
        setPosts(prevPosts => prevPosts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              user_has_liked: !post.user_has_liked,
              likes_count: post.user_has_liked ? post.likes_count - 1 : post.likes_count + 1,
            };
          }
          return post;
        }));
        toast.error('Failed to like post');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to like post');
    }
  };

  const loadComments = async (postId: string) => {
    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    try {
      const response = await fetch(`/api/posts/${postId}/comments`);
      const data = await response.json();
      setComments(prev => ({ ...prev, [postId]: data.comments || [] }));
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleComment = async (postId: string) => {
    if (!commentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to comment');
        return;
      }

      const response = await fetch('/api/posts/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ postId, content: commentText }),
      });

      const data = await response.json();
      if (response.ok) {
        if (data.comment.status === 'flagged') {
          toast.warning('Comment flagged for review');
        } else {
          toast.success('Comment posted!');
        }
        setCommentText('');
        loadComments(postId);
        loadPosts(); // Refresh to update comment count
      } else {
        toast.error('Failed to post comment');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to post comment');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black py-12 px-4">
        <Toaster position="top-right" />
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Community</h1>
          <p className="text-gray-600 dark:text-gray-400">Please log in to view and create posts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
      <Toaster position="top-right" richColors />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Community</h1>

        {/* Post Creation */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Create a Post</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full h-32 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-zinc-800 text-gray-900 dark:text-white resize-none
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={5000}
            />
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              onChange={handleImageChange}
              className="text-sm text-gray-600 dark:text-gray-400"
            />
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {imagePreviews.map((preview, i) => (
                  <img key={i} src={preview} alt="" className="w-full h-32 object-cover rounded-lg" />
                ))}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                       text-white font-medium rounded-lg transition-colors"
            >
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </form>
        </div>

        {/* Posts Feed */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">No posts yet. Be the first to post!</p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
                {/* User Info */}
                <div className="flex items-center mb-4">
                  {post.user.avatar_url ? (
                    <img 
                      src={post.user.avatar_url} 
                      alt={post.user.full_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                      {post.user.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="ml-3">
                    <p className="font-semibold text-gray-900 dark:text-white">{post.user.full_name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(post.created_at).toLocaleDateString()} at {new Date(post.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <p className="mb-4 text-gray-900 dark:text-white whitespace-pre-wrap">{post.content}</p>

                {/* Images */}
                {post.image_urls.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {post.image_urls.map((url, i) => (
                      <img key={i} src={url} alt="" className="w-full h-64 object-cover rounded-lg cursor-pointer hover:opacity-90" onClick={() => window.open(url, '_blank')} />
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      post.user_has_liked
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <svg className="w-5 h-5" fill={post.user_has_liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="font-medium">{post.likes_count} {post.likes_count === 1 ? 'Like' : 'Likes'}</span>
                  </button>

                  <button
                    onClick={() => {
                      const isOpening = commentingOn !== post.id;
                      setCommentingOn(isOpening ? post.id : null);
                      if (isOpening && !comments[post.id]) {
                        loadComments(post.id);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="font-medium">{post.comments_count} {post.comments_count === 1 ? 'Comment' : 'Comments'}</span>
                  </button>
                </div>

                {/* Comments Section */}
                {commentingOn === post.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                    {/* Comment Input */}
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                        placeholder="Write a comment..."
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => handleComment(post.id)}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                      >
                        Post
                      </button>
                    </div>

                    {/* Comments List */}
                    {loadingComments[post.id] ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading comments...</p>
                    ) : comments[post.id]?.length > 0 ? (
                      <div className="space-y-3">
                        {comments[post.id].map((comment: any) => (
                          <div key={comment.id} className="flex gap-3 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                            {comment.user.avatar_url ? (
                              <img src={comment.user.avatar_url} alt={comment.user.full_name} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                                {comment.user.full_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{comment.user.full_name}</p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {new Date(comment.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No comments yet. Be the first to comment!</p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
