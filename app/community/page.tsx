'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Toaster, toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import { ArrowLeft, Search, Filter, MessageCircle, User, Ban } from 'lucide-react';
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
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<{[key: string]: any[]}>({});
  const [loadingComments, setLoadingComments] = useState<{[key: string]: boolean}>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isBanned, setIsBanned] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkUser();
    loadPosts();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Load comments for all posts and expand them by default
    if (posts.length > 0) {
      const newExpanded = new Set<string>();
      posts.forEach(post => {
        newExpanded.add(post.id);
        if (!comments[post.id]) {
          loadComments(post.id);
        }
      });
      setExpandedComments(newExpanded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts.length]);

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterTags]);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSearchQuery]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    // Check if user is banned
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('is_banned')
        .eq('id', user.id)
        .single();
      
      setIsBanned((userData as any)?.is_banned || false);
    }
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

  const loadUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams();
      if (userSearchQuery) params.append('search', userSearchQuery);
      
      const response = await fetch(`/api/users?${params.toString()}`, {
        headers: session ? { 'Authorization': `Bearer ${session.access_token}` } : {},
      });
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleStartChat = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to chat');
        return;
      }

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ otherUserId: userId }),
      });

      const data = await response.json();
      if (response.ok) {
        router.push(`/chat?conversation=${data.conversationId}`);
      } else {
        toast.error('Failed to start chat');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
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
      <div className="flex-1 ml-48 mr-72 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Banned User Warning */}
          {isBanned && (
            <div className="bg-red-100 border-2 border-red-600 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <Ban className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="font-bold text-red-900">Account Suspended</h3>
                  <p className="text-sm text-red-800">
                    Your account has been suspended due to violations of community guidelines. 
                    You cannot create posts or comments. Please contact an administrator to appeal this decision.
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* Header */}
          <div className="bg-white border-2 border-black rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <button 
                onClick={() => router.back()}
                className="p-2 border-2 border-black rounded hover:bg-black hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border-2 border-black rounded bg-white text-sm"
                  />
                </div>
              </div>

              {user.user_metadata?.avatar_url ? (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="Profile"
                  className="w-9 h-9 rounded-full border-2 border-black object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full border-2 border-black bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  {user.user_metadata?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>

            {/* Community Title and Filter */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Community</h1>
              <div className="relative">
                <button 
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className="px-3 py-1.5 border-2 border-black rounded hover:bg-black hover:text-white transition-colors flex items-center gap-2 text-sm"
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
                  <div className="absolute right-0 mt-2 w-56 bg-white border-2 border-black rounded-lg shadow-lg p-3 z-10">
                    <h3 className="font-bold mb-2 text-sm">Filter by Tags</h3>
                    <div className="space-y-1.5">
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
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setFilterTags([])}
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => setShowFilterMenu(false)}
                        className="flex-1 px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* All Posts Feed */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-700 text-sm">Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-700 text-sm">No posts yet. Be the first to post!</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-white border-2 border-black rounded-lg p-4">
                  {/* User Info */}
                  <div className="flex items-center mb-3">
                    <button
                      onClick={() => router.push(`/profile/${post.user.id}`)}
                      className="flex-shrink-0"
                    >
                      {post.user.avatar_url ? (
                        <img 
                          src={post.user.avatar_url} 
                          alt={post.user.full_name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-black hover:opacity-80 transition-opacity"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold border-2 border-black hover:opacity-80 transition-opacity">
                          {post.user.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </button>
                    <div className="ml-3">
                      <button
                        onClick={() => router.push(`/profile/${post.user.id}`)}
                        className="font-semibold text-gray-900 text-sm hover:underline text-left"
                      >
                        {post.user.full_name}
                      </button>
                      <p className="text-xs text-gray-600">
                        {new Date(post.created_at).toLocaleDateString()} at {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="mb-3 text-gray-900 whitespace-pre-wrap text-sm">{post.content}</p>

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {post.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full border border-blue-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Images */}
                  {post.image_urls.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {post.image_urls.map((url, i) => (
                        <img key={i} src={url} alt="" className="w-full h-48 object-cover rounded border-2 border-black cursor-pointer hover:opacity-90" onClick={() => window.open(url, '_blank')} />
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded border-2 border-black transition-colors text-sm ${
                        post.user_has_liked
                          ? 'bg-red-100 text-red-600'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-4 h-4" fill={post.user_has_liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span className="font-medium">{post.likes_count}</span>
                    </button>

                    <button
                      onClick={() => {
                        const isExpanded = expandedComments.has(post.id);
                        const newExpanded = new Set(expandedComments);
                        if (isExpanded) {
                          newExpanded.delete(post.id);
                        } else {
                          newExpanded.add(post.id);
                          if (!comments[post.id]) {
                            loadComments(post.id);
                          }
                        }
                        setExpandedComments(newExpanded);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded border-2 border-black bg-white text-gray-700 hover:bg-gray-100 transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="font-medium">{post.comments_count}</span>
                    </button>
                  </div>

                  {/* Comments Section */}
                  {expandedComments.has(post.id) && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                      {/* Comment Input */}
                      {isBanned ? (
                        <div className="bg-red-50 border border-red-300 rounded p-2 text-center">
                          <p className="text-xs text-red-700">You cannot comment while your account is suspended.</p>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                            placeholder="Write a comment..."
                            className="flex-1 px-3 py-2 border-2 border-black rounded bg-white text-gray-900 text-sm"
                          />
                          <button
                            onClick={() => handleComment(post.id)}
                            className="px-4 py-2 bg-black text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors"
                          >
                            Post
                          </button>
                        </div>
                      )}

                      {/* Comments List */}
                      {loadingComments[post.id] ? (
                        <p className="text-xs text-gray-600">Loading comments...</p>
                      ) : comments[post.id]?.length > 0 ? (
                        <div className="space-y-2">
                          {comments[post.id].map((comment: any) => (
                            <div key={comment.id} className="flex gap-2 bg-gray-50 p-2 rounded border border-gray-200">
                              {comment.user.avatar_url ? (
                                <img src={comment.user.avatar_url} alt={comment.user.full_name} className="w-7 h-7 rounded-full object-cover border-2 border-black" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold border-2 border-black">
                                  {comment.user.full_name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-900">{comment.user.full_name}</p>
                                <p className="text-xs text-gray-700">{comment.content}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {new Date(comment.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-600">No comments yet. Be the first to comment!</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="fixed right-0 top-0 h-screen w-72 bg-white border-l-2 border-black overflow-y-auto">
          {/* Top Posts Section - Fixed at top */}
          <div className="p-4 border-b-2 border-black bg-[#F5F1E8]">
            <h2 className="text-lg font-bold mb-3 text-gray-900">Top Posts This Week</h2>
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-4">
                  <p className="text-gray-600 text-xs">Loading...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-600 text-xs">No posts yet</p>
                </div>
              ) : (
                posts.slice(0, 3).map((post) => (
                  <div key={post.id} className="bg-white border-2 border-black rounded p-2 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => router.push(`/profile/${post.user.id}`)}
                        className="flex-shrink-0"
                      >
                        {post.user.avatar_url ? (
                          <img 
                            src={post.user.avatar_url} 
                            alt={post.user.full_name}
                            className="w-8 h-8 rounded-full border-2 border-black object-cover hover:opacity-80 transition-opacity"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full border-2 border-black bg-blue-600 flex items-center justify-center text-white font-bold text-xs hover:opacity-80 transition-opacity">
                            {post.user.full_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => router.push(`/profile/${post.user.id}`)}
                          className="font-semibold text-gray-900 text-xs hover:underline text-left"
                        >
                          {post.user.full_name}
                        </button>
                        <p className="text-xs text-gray-700 line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span>❤️ {post.likes_count}</span>
                          <span>💬 {post.comments_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* People Section - Scrollable */}
          <div className="p-4">
            <h2 className="text-lg font-bold mb-3 text-gray-900">People</h2>
            
            {/* User Search */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search people..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border-2 border-black rounded bg-white text-sm"
              />
            </div>

            {/* Users List */}
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.id} className="bg-white border-2 border-black rounded-lg p-2.5">
                  <div className="flex items-center gap-2 mb-2">
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.full_name}
                        className="w-9 h-9 rounded-full object-cover border-2 border-black"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold border-2 border-black">
                        {user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate text-sm">
                        {user.full_name || user.email}
                      </p>
                      {user.full_name && (
                        <p className="text-xs text-gray-600 truncate">{user.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleStartChat(user.id)}
                      className="flex-1 px-2 py-1.5 bg-black text-white text-xs rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Chat
                    </button>
                    <button
                      className="px-2 py-1.5 border-2 border-black text-black text-xs rounded hover:bg-gray-100 transition-colors"
                      title="View Profile"
                    >
                      <User className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <p className="text-center text-gray-600 py-6 text-sm">No users found</p>
              )}
            </div>
          </div>
        </div>

        {/* Floating Create Post Button */}
        {!isBanned && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="fixed bottom-6 right-[19rem] w-14 h-14 bg-black text-white rounded-full shadow-lg hover:bg-gray-800 transition-colors flex items-center justify-center text-2xl z-10"
          >
            +
          </button>
        )}

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
