'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Toaster, toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import { ArrowLeft, Search, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Post {
  id: string;
  user: { id: string; full_name: string; avatar_url?: string; };
  content: string;
  image_urls: string[];
  tags: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_has_liked: boolean;
}

const AVAILABLE_TAGS = ['Placements', 'General', 'Study Material', 'Doubts', 'College', 'Events', 'Clubs'];

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<{[key: string]: any[]}>({});
  const [loadingComments, setLoadingComments] = useState<{[key: string]: boolean}>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkUser();
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterTags]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadPosts = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterTags.length > 0) params.append('tags', filterTags.join(','));
      
      const response = await fetch(`/api/posts/feed?${params.toString()}`);
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
      formData.append('tags', JSON.stringify(selectedTags));
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
        setSelectedTags([]);
        setShowCreateModal(false);
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
      <div className="min-h-screen bg-[#F5F1E8] flex">
        <Sidebar />
        <Toaster position="top-right" />
        <div className="flex-1 ml-48 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4 text-gray-900">Community</h1>
            <p className="text-gray-700">Please log in to view and create posts</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] flex">
      <Sidebar />
      <Toaster position="top-right" richColors />
      
      {/* Main Content */}
      <div className="flex-1 ml-48 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-[#F5F1E8] rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={() => router.back()}
                className="p-2 border-2 border-black rounded hover:bg-black hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="flex-1 mx-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search Anything"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border-2 border-black rounded bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                {user.user_metadata?.avatar_url ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt="Profile"
                    className="w-10 h-10 rounded border-2 border-black object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded border-2 border-black bg-blue-600 flex items-center justify-center text-white font-bold">
                    {user.user_metadata?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            </div>

            {/* Community Title and Filter */}
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">Community</h1>
              <div className="relative">
                <button 
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className="px-4 py-2 border-2 border-black rounded hover:bg-black hover:text-white transition-colors flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filter
                  {filterTags.length > 0 && (
                    <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {filterTags.length}
                    </span>
                  )}
                </button>
                
                {/* Filter Dropdown */}
                {showFilterMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border-2 border-black rounded-lg shadow-lg p-4 z-10">
                    <h3 className="font-bold mb-3">Filter by Tags</h3>
                    <div className="space-y-2">
                      {AVAILABLE_TAGS.map(tag => (
                        <label key={tag} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filterTags.includes(tag)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilterTags([...filterTags, tag]);
                              } else {
                                setFilterTags(filterTags.filter(t => t !== tag));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{tag}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => setFilterTags([])}
                        className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => setShowFilterMenu(false)}
                        className="flex-1 px-3 py-1 text-sm bg-black text-white rounded hover:bg-gray-800"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Posts Section */}
          <div className="bg-white border-4 border-black rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Top Posts This Week</h2>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading posts...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No posts yet. Be the first to post!</p>
                </div>
              ) : (
                posts.slice(0, 3).map((post) => (
                  <div key={post.id} className="bg-gray-200 rounded p-4 min-h-[80px]">
                    <div className="flex items-start gap-3">
                      {post.user.avatar_url ? (
                        <img 
                          src={post.user.avatar_url} 
                          alt={post.user.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                          {post.user.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{post.user.full_name}</p>
                        <p className="text-sm text-gray-700 line-clamp-2">{post.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* All Posts Feed */}
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-700">Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-700">No posts yet. Be the first to post!</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-white border-2 border-black rounded-lg p-6">
                  {/* User Info */}
                  <div className="flex items-center mb-4">
                    {post.user.avatar_url ? (
                      <img 
                        src={post.user.avatar_url} 
                        alt={post.user.full_name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-black"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg border-2 border-black">
                        {post.user.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="ml-3">
                      <p className="font-semibold text-gray-900">{post.user.full_name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(post.created_at).toLocaleDateString()} at {new Date(post.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="mb-4 text-gray-900 whitespace-pre-wrap">{post.content}</p>

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.map((tag, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full border border-blue-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Images */}
                  {post.image_urls.length > 0 && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {post.image_urls.map((url, i) => (
                        <img key={i} src={url} alt="" className="w-full h-64 object-cover rounded border-2 border-black cursor-pointer hover:opacity-90" onClick={() => window.open(url, '_blank')} />
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-6 pt-4 border-t-2 border-gray-300">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded border-2 border-black transition-colors ${
                        post.user_has_liked
                          ? 'bg-red-100 text-red-600'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
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
                      className="flex items-center gap-2 px-4 py-2 rounded border-2 border-black bg-white text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="font-medium">{post.comments_count} {post.comments_count === 1 ? 'Comment' : 'Comments'}</span>
                    </button>
                  </div>

                  {/* Comments Section */}
                  {commentingOn === post.id && (
                    <div className="mt-4 pt-4 border-t-2 border-gray-300 space-y-4">
                      {/* Comment Input */}
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                          placeholder="Write a comment..."
                          className="flex-1 px-4 py-2 border-2 border-black rounded bg-white text-gray-900"
                        />
                        <button
                          onClick={() => handleComment(post.id)}
                          className="px-6 py-2 bg-black text-white font-medium rounded hover:bg-gray-800 transition-colors"
                        >
                          Post
                        </button>
                      </div>

                      {/* Comments List */}
                      {loadingComments[post.id] ? (
                        <p className="text-sm text-gray-600">Loading comments...</p>
                      ) : comments[post.id]?.length > 0 ? (
                        <div className="space-y-3">
                          {comments[post.id].map((comment: any) => (
                            <div key={comment.id} className="flex gap-3 bg-gray-100 p-3 rounded border border-gray-300">
                              {comment.user.avatar_url ? (
                                <img src={comment.user.avatar_url} alt={comment.user.full_name} className="w-8 h-8 rounded-full object-cover border-2 border-black" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold border-2 border-black">
                                  {comment.user.full_name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900">{comment.user.full_name}</p>
                                <p className="text-sm text-gray-700">{comment.content}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(comment.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">No comments yet. Be the first to comment!</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Floating Create Post Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-black text-white rounded-full shadow-lg hover:bg-gray-800 transition-colors flex items-center justify-center text-3xl"
        >
          +
        </button>

        {/* Create Post Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-200 bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#F5F1E8] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border-4 border-black">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Create a Post</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full h-32 px-4 py-3 border-2 border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={5000}
                />

                {/* Tags Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (Optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TAGS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (selectedTags.includes(tag)) {
                            setSelectedTags(selectedTags.filter(t => t !== tag));
                          } else {
                            setSelectedTags([...selectedTags, tag]);
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-sm border-2 transition-colors ${
                          selectedTags.includes(tag)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-600'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Images (Optional)
                  </label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    onChange={handleImageChange}
                    className="text-sm text-gray-600"
                  />
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {imagePreviews.map((preview, i) => (
                        <img key={i} src={preview} alt="" className="w-full h-32 object-cover rounded-lg border-2 border-gray-300" />
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
                >
                  {submitting ? 'Posting...' : 'Post'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
