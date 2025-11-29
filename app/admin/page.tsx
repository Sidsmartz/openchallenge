'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Toaster, toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';
import { Shield, TrendingUp, Users, MessageSquare, AlertTriangle, CheckCircle, XCircle, Ban, Search, Flag, UserX } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Prevent static generation
export const dynamic = 'force-dynamic';

interface FlaggedPost {
  id: string;
  content: string;
  status: string;
  flagged_reason: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface FlaggedComment {
  id: string;
  content: string;
  status: string;
  flagged_reason: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  post_id: string;
}

interface BannedUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'moderation' | 'statistics' | 'chat-reports' | 'alumni-approval'>('moderation');
  const [chatReports, setChatReports] = useState<any[]>([]);
  const [resourceReports, setResourceReports] = useState<any[]>([]);
  const [flaggedPosts, setFlaggedPosts] = useState<FlaggedPost[]>([]);
  const [flaggedComments, setFlaggedComments] = useState<FlaggedComment[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [pendingAlumni, setPendingAlumni] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadFlaggedContent();
      loadBannedUsers();
      loadAllUsers();
      loadStatistics();
      loadChatReports();
      loadPendingAlumni();
      loadResourceReports();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadAllUsers();
    }
  }, [userSearchQuery]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      // Get session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Check if user email is in admin list
      const response = await fetch('/api/admin/check', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();
      
      console.log('Admin check response:', data);
      
      if (data.isAdmin) {
        setIsAdmin(true);
      } else {
        toast.error('Access denied. Admin privileges required.');
        router.push('/');
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const loadFlaggedContent = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/flagged', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      
      setFlaggedPosts(data.posts || []);
      setFlaggedComments(data.comments || []);
    } catch (error) {
      console.error('Error loading flagged content:', error);
      toast.error('Failed to load flagged content');
    }
  };

  const loadBannedUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/banned-users', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      
      setBannedUsers(data.users || []);
    } catch (error) {
      console.error('Error loading banned users:', error);
      toast.error('Failed to load banned users');
    }
  };

  const loadAllUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams();
      if (userSearchQuery) params.append('search', userSearchQuery);

      const response = await fetch(`/api/users?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      
      setAllUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/statistics', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const loadChatReports = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/chat-reports', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      setChatReports(data.reports || []);
    } catch (error) {
      console.error('Error loading chat reports:', error);
    }
  };

  const loadResourceReports = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/resource-reports', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      setResourceReports(data.flags || []);
    } catch (error) {
      console.error('Error loading resource reports:', error);
    }
  };

  const loadPendingAlumni = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/pending-alumni', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      setPendingAlumni(data.alumni || []);
    } catch (error) {
      console.error('Error loading pending alumni:', error);
    }
  };

  const handleChatReportAction = async (reportId: string, action: 'ban_chat' | 'ban_all' | 'dismiss', notes?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/chat-reports/${reportId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action, notes }),
      });

      if (response.ok) {
        toast.success(`Action completed: ${action.replace('_', ' ')}`);
        loadChatReports();
        loadBannedUsers();
      } else {
        toast.error('Failed to process action');
      }
    } catch (error) {
      console.error('Error processing chat report action:', error);
      toast.error('Failed to process action');
    }
  };

  const handleAlumniApproval = async (alumniId: string, action: 'approve' | 'reject') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/approve-alumni', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ alumniId, action }),
      });

      if (response.ok) {
        toast.success(`Alumni ${action}d successfully`);
        loadPendingAlumni();
      } else {
        toast.error(`Failed to ${action} alumni`);
      }
    } catch (error) {
      console.error(`Error ${action}ing alumni:`, error);
      toast.error(`Failed to ${action} alumni`);
    }
  };

  const handleResourceReportAction = async (flagId: string, action: 'remove_resource' | 'dismiss') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/resource-reports/${flagId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        toast.success(action === 'remove_resource' ? 'Resource removed' : 'Report dismissed');
        loadResourceReports();
      } else {
        toast.error('Failed to process action');
      }
    } catch (error) {
      console.error('Error processing resource report action:', error);
      toast.error('Failed to process action');
    }
  };

  const handleModeratePost = async (postId: string, action: 'approve' | 'reject') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ postId, action, type: 'post' }),
      });

      if (response.ok) {
        toast.success(`Post ${action}d successfully`);
        loadFlaggedContent();
      } else {
        toast.error('Failed to moderate post');
      }
    } catch (error) {
      console.error('Error moderating post:', error);
      toast.error('Failed to moderate post');
    }
  };

  const handleModerateComment = async (commentId: string, action: 'approve' | 'reject') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ commentId, action, type: 'comment' }),
      });

      if (response.ok) {
        toast.success(`Comment ${action}d successfully`);
        loadFlaggedContent();
      } else {
        toast.error('Failed to moderate comment');
      }
    } catch (error) {
      console.error('Error moderating comment:', error);
      toast.error('Failed to moderate comment');
    }
  };

  const handleBanUser = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/ban-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        toast.success('User banned successfully');
        loadFlaggedContent();
        loadBannedUsers();
        loadAllUsers();
      } else {
        toast.error('Failed to ban user');
      }
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/unban-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        toast.success('User unbanned successfully');
        loadBannedUsers();
      } else {
        toast.error('Failed to unban user');
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Failed to unban user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex">
        <Sidebar />
        <Toaster position="top-right" />
        <div className="flex-1 ml-56 flex items-center justify-center">
          <p className="text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] flex">
      <Sidebar />
      <Toaster position="top-right" richColors />
      
      <div className="flex-1 ml-56 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white border-2 border-black rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-8 h-8 text-red-600" />
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('moderation')}
                className={`px-4 py-2 rounded border-2 border-black transition-colors ${
                  activeTab === 'moderation'
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-900 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Moderation
                </div>
              </button>
              <button
                onClick={() => setActiveTab('alumni-approval')}
                className={`px-4 py-2 rounded border-2 border-black transition-colors ${
                  activeTab === 'alumni-approval'
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-900 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Alumni Approval ({pendingAlumni.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('chat-reports')}
                className={`px-4 py-2 rounded border-2 border-black transition-colors ${
                  activeTab === 'chat-reports'
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-900 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4" />
                  Chat Reports ({chatReports.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('resource-reports')}
                className={`px-4 py-2 rounded border-2 border-black transition-colors ${
                  activeTab === 'resource-reports'
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-900 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4" />
                  Resource Reports ({resourceReports.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('statistics')}
                className={`px-4 py-2 rounded border-2 border-black transition-colors ${
                  activeTab === 'statistics'
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-900 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Statistics
                </div>
              </button>
            </div>
          </div>

          {/* Content */}
          {activeTab === 'moderation' ? (
            <div className="space-y-4">
              {/* Flagged Posts */}
              <div className="bg-white border-2 border-black rounded-lg p-4">
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Flagged Posts ({flaggedPosts.length})
                </h2>
                <div className="space-y-3">
                  {flaggedPosts.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-4">No flagged posts</p>
                  ) : (
                    flaggedPosts.map((post) => (
                      <div key={post.id} className="border-2 border-black rounded-lg p-3 bg-red-50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {post.user.avatar_url ? (
                              <img src={post.user.avatar_url} alt={post.user.full_name} className="w-8 h-8 rounded-full border-2 border-black" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs border-2 border-black">
                                {post.user.full_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-sm">{post.user.full_name}</p>
                              <p className="text-xs text-gray-600">{post.user.email}</p>
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-red-600 text-white text-xs rounded">
                            {post.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 mb-2">{post.content}</p>
                        <p className="text-xs text-red-700 mb-3">
                          <strong>Reason:</strong> {post.flagged_reason}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleModeratePost(post.id, 'approve')}
                            className="flex-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleModeratePost(post.id, 'reject')}
                            className="flex-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                          <button
                            onClick={() => handleBanUser(post.user.id)}
                            className="px-3 py-1.5 bg-black text-white text-xs rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-1"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Ban User
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Flagged Comments */}
              <div className="bg-white border-2 border-black rounded-lg p-4">
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Flagged Comments ({flaggedComments.length})
                </h2>
                <div className="space-y-3">
                  {flaggedComments.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-4">No flagged comments</p>
                  ) : (
                    flaggedComments.map((comment) => (
                      <div key={comment.id} className="border-2 border-black rounded-lg p-3 bg-yellow-50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {comment.user.avatar_url ? (
                              <img src={comment.user.avatar_url} alt={comment.user.full_name} className="w-8 h-8 rounded-full border-2 border-black" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs border-2 border-black">
                                {comment.user.full_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-sm">{comment.user.full_name}</p>
                              <p className="text-xs text-gray-600">{comment.user.email}</p>
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded">
                            {comment.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 mb-2">{comment.content}</p>
                        <p className="text-xs text-yellow-700 mb-3">
                          <strong>Reason:</strong> {comment.flagged_reason}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleModerateComment(comment.id, 'approve')}
                            className="flex-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleModerateComment(comment.id, 'reject')}
                            className="flex-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                          <button
                            onClick={() => handleBanUser(comment.user.id)}
                            className="px-3 py-1.5 bg-black text-white text-xs rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-1"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Ban User
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Banned Users */}
              <div className="bg-white border-2 border-black rounded-lg p-4">
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <Ban className="w-5 h-5" />
                  Banned Users ({bannedUsers.length})
                </h2>
                <div className="space-y-3">
                  {bannedUsers.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-4">No banned users</p>
                  ) : (
                    bannedUsers.map((bannedUser) => (
                      <div key={bannedUser.id} className="border-2 border-black rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {bannedUser.avatar_url ? (
                              <img src={bannedUser.avatar_url} alt={bannedUser.full_name} className="w-10 h-10 rounded-full border-2 border-black" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold border-2 border-black">
                                {bannedUser.full_name?.charAt(0).toUpperCase() || bannedUser.email.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-sm">{bannedUser.full_name || bannedUser.email}</p>
                              <p className="text-xs text-gray-600">{bannedUser.email}</p>
                              <p className="text-xs text-gray-500">Banned on {new Date(bannedUser.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnbanUser(bannedUser.id)}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Revoke Ban
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* All Users List */}
              <div className="bg-white border-2 border-black rounded-lg p-4">
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  All Users ({allUsers.length})
                </h2>
                
                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border-2 border-black rounded bg-white text-sm"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {allUsers.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-4">No users found</p>
                  ) : (
                    allUsers.map((userItem) => (
                      <div 
                        key={userItem.id} 
                        onClick={() => router.push(`/profile/${userItem.id}`)}
                        className="border-2 border-black rounded-lg p-2.5 bg-white shadow-[2px_2px_0px_#000] cursor-pointer transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000]"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {userItem.avatar_url ? (
                              <img src={userItem.avatar_url} alt={userItem.full_name} className="w-9 h-9 rounded-full border-2 border-black" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm border-2 border-black">
                                {userItem.full_name?.charAt(0).toUpperCase() || userItem.email.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-sm">{userItem.full_name || userItem.email}</p>
                              <p className="text-xs text-gray-600">{userItem.email}</p>
                            </div>
                          </div>
                          {userItem.is_banned ? (
                            <span className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded border border-red-300">
                              Banned
                            </span>
                          ) : (
                            <button
                              onClick={() => handleBanUser(userItem.id)}
                              className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              Ban
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'statistics' ? (
            <div className="space-y-4">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white border-2 border-black rounded-lg p-4 shadow-[4px_4px_0px_#000] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000]">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-6 h-6 text-blue-600" />
                    <h3 className="font-bold text-lg">Total Users</h3>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
                </div>

                <div className="bg-white border-2 border-black rounded-lg p-4 shadow-[4px_4px_0px_#000] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000]">
                  <div className="flex items-center gap-3 mb-2">
                    <MessageSquare className="w-6 h-6 text-green-600" />
                    <h3 className="font-bold text-lg">Total Posts</h3>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats?.totalPosts || 0}</p>
                </div>

                <div className="bg-white border-2 border-black rounded-lg p-4 shadow-[4px_4px_0px_#000] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000]">
                  <div className="flex items-center gap-3 mb-2">
                    <MessageSquare className="w-6 h-6 text-purple-600" />
                    <h3 className="font-bold text-lg">Total Comments</h3>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats?.totalComments || 0}</p>
                </div>

                <div className="bg-white border-2 border-black rounded-lg p-4 shadow-[4px_4px_0px_#000] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000]">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    <h3 className="font-bold text-lg">Flagged Posts</h3>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats?.flaggedPosts || 0}</p>
                </div>

                <div className="bg-white border-2 border-black rounded-lg p-4 shadow-[4px_4px_0px_#000] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000]">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                    <h3 className="font-bold text-lg">Flagged Comments</h3>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats?.flaggedComments || 0}</p>
                </div>

                <div className="bg-white border-2 border-black rounded-lg p-4 shadow-[4px_4px_0px_#000] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000]">
                  <div className="flex items-center gap-3 mb-2">
                    <Ban className="w-6 h-6 text-gray-600" />
                    <h3 className="font-bold text-lg">Banned Users</h3>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats?.bannedUsers || 0}</p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Content Overview Bar Chart */}
                <div className="bg-white border-2 border-black rounded-lg p-4 shadow-[4px_4px_0px_#000]">
                  <h3 className="font-bold text-lg mb-4">Content Overview</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { name: 'Users', value: stats?.totalUsers || 0, fill: '#3B82F6' },
                      { name: 'Posts', value: stats?.totalPosts || 0, fill: '#10B981' },
                      { name: 'Comments', value: stats?.totalComments || 0, fill: '#8B5CF6' },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Moderation Status Pie Chart */}
                <div className="bg-white border-2 border-black rounded-lg p-4 shadow-[4px_4px_0px_#000]">
                  <h3 className="font-bold text-lg mb-4">Moderation Status</h3>
                  {(stats?.flaggedPosts || 0) + (stats?.flaggedComments || 0) + (stats?.bannedUsers || 0) === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-gray-500">
                      <p className="text-sm">No moderation data yet</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Flagged Posts', value: stats?.flaggedPosts || 0 },
                            { name: 'Flagged Comments', value: stats?.flaggedComments || 0 },
                            { name: 'Banned Users', value: stats?.bannedUsers || 0 },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell key="cell-0" fill="#EF4444" />
                          <Cell key="cell-1" fill="#F59E0B" />
                          <Cell key="cell-2" fill="#6B7280" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'alumni-approval' ? (
            <div className="space-y-4">
              {/* Alumni Approval */}
              <div className="bg-white border-2 border-black rounded-lg p-4">
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Pending Alumni Accounts ({pendingAlumni.length})
                </h2>
                <div className="space-y-3">
                  {pendingAlumni.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-4">No pending alumni accounts</p>
                  ) : (
                    pendingAlumni.map((alumni) => (
                      <div key={alumni.id} className="border-2 border-black rounded-lg p-4 bg-blue-50">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {alumni.avatar_url ? (
                              <img src={alumni.avatar_url} alt={alumni.full_name} className="w-12 h-12 rounded-full border-2 border-black" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold border-2 border-black">
                                {alumni.full_name?.charAt(0).toUpperCase() || alumni.email.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-base">{alumni.full_name || alumni.email}</p>
                              <p className="text-sm text-gray-600">{alumni.email}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Applied: {new Date(alumni.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                          {alumni.graduating_batch && (
                            <div>
                              <p className="text-gray-600 font-medium">Batch</p>
                              <p className="text-gray-900">{alumni.graduating_batch}</p>
                            </div>
                          )}
                          {alumni.current_company && (
                            <div>
                              <p className="text-gray-600 font-medium">Company</p>
                              <p className="text-gray-900">{alumni.current_company}</p>
                            </div>
                          )}
                          {alumni.current_job_title && (
                            <div>
                              <p className="text-gray-600 font-medium">Position</p>
                              <p className="text-gray-900">{alumni.current_job_title}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-gray-300">
                          <button
                            onClick={() => handleAlumniApproval(alumni.id, 'approve')}
                            className="flex-1 px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve Account
                          </button>
                          <button
                            onClick={() => handleAlumniApproval(alumni.id, 'reject')}
                            className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'chat-reports' ? (
            <div className="space-y-4">
              {/* Chat Reports */}
              <div className="bg-white border-2 border-black rounded-lg p-4">
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <Flag className="w-5 h-5" />
                  Chat Reports ({chatReports.length})
                </h2>
                <div className="space-y-3">
                  {chatReports.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-4">No chat reports</p>
                  ) : (
                    chatReports.map((report) => (
                      <div key={report.id} className="border-2 border-black rounded-lg p-4 bg-orange-50">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 text-xs rounded font-bold ${
                                report.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                                report.status === 'reviewed' ? 'bg-blue-200 text-blue-800' :
                                report.status === 'action_taken' ? 'bg-green-200 text-green-800' :
                                'bg-gray-200 text-gray-800'
                              }`}>
                                {report.status.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(report.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 mb-1">
                              Reporter: {report.reporter?.full_name || report.reporter?.email}
                            </p>
                            <p className="text-sm font-semibold text-red-700 mb-1">
                              Reported User: {report.reported_user?.full_name || report.reported_user?.email}
                            </p>
                            <p className="text-sm text-gray-700 mb-2">
                              <strong>Reason:</strong> {report.reason}
                            </p>
                            {report.admin_notes && (
                              <p className="text-xs text-gray-600 italic">
                                <strong>Admin Notes:</strong> {report.admin_notes}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {report.status === 'pending' && (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-300">
                            <button
                              onClick={() => handleChatReportAction(report.id, 'ban_chat', 'User banned from chat')}
                              className="flex-1 px-3 py-2 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors flex items-center justify-center gap-1"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              Ban from Chat
                            </button>
                            <button
                              onClick={() => handleChatReportAction(report.id, 'ban_all', 'User banned from all features')}
                              className="flex-1 px-3 py-2 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              Ban from All
                            </button>
                            <button
                              onClick={() => handleChatReportAction(report.id, 'dismiss', 'Report dismissed - no action needed')}
                              className="flex-1 px-3 py-2 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors flex items-center justify-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'resource-reports' ? (
            <div className="space-y-4">
              {/* Resource Reports */}
              <div className="bg-white border-2 border-black rounded-lg p-4">
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <Flag className="w-5 h-5" />
                  Resource Reports ({resourceReports.length})
                </h2>
                <div className="space-y-3">
                  {resourceReports.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-4">No resource reports</p>
                  ) : (
                    resourceReports.map((flag) => (
                      <div key={flag.id} className="border-2 border-black rounded-lg p-4 bg-orange-50">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 text-xs rounded font-bold ${
                                flag.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                                flag.status === 'reviewed' ? 'bg-green-200 text-green-800' :
                                'bg-gray-200 text-gray-800'
                              }`}>
                                {flag.status.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(flag.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 mb-1">
                              Resource: {flag.resource?.title}
                            </p>
                            <p className="text-sm text-gray-700 mb-1">
                              <strong>Uploader:</strong> {flag.resource?.user?.full_name || flag.resource?.user?.email}
                            </p>
                            <p className="text-sm text-gray-700 mb-1">
                              <strong>Reported by:</strong> {flag.flagger?.full_name || flag.flagger?.email}
                            </p>
                            <p className="text-sm text-gray-700 mb-2">
                              <strong>Reason:</strong> {flag.reason}
                            </p>
                            {flag.resource?.description && (
                              <p className="text-xs text-gray-600 mb-2">
                                <strong>Description:</strong> {flag.resource.description}
                              </p>
                            )}
                            <a
                              href={flag.resource?.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              View Resource File
                            </a>
                          </div>
                        </div>
                        
                        {flag.status === 'pending' && (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-300">
                            <button
                              onClick={() => handleResourceReportAction(flag.id, 'remove_resource')}
                              className="flex-1 px-3 py-2 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Remove Resource
                            </button>
                            <button
                              onClick={() => handleResourceReportAction(flag.id, 'dismiss')}
                              className="flex-1 px-3 py-2 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors flex items-center justify-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Dismiss Report
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
