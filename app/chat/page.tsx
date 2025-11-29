'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Toaster, toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import { ArrowLeft, Send, Plus, Search, MessageCircle, Paperclip, Flag, X, Image as ImageIcon, FileText, UserX } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

// Prevent static generation
export const dynamic = 'force-dynamic';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  attachment_url?: string;
  attachment_type?: 'image' | 'document';
  attachment_name?: string;
  created_at: string;
}

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  updated_at: string;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [isChatBanned, setIsChatBanned] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    checkUser();
    loadConversations();
    
    const conversationId = searchParams.get('conversation');
    if (conversationId) {
      setSelectedConversation(conversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (showNewChatModal) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNewChatModal, userSearchQuery]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
      
      // Poll for new messages every 3 seconds
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (!user) {
      router.push('/login');
    } else {
      // Check if user is chat banned
      const { data: userData } = await supabase
        .from('users')
        .select('is_chat_banned, chat_ban_reason')
        .eq('id', user.id)
        .single();
      
      if (userData?.is_chat_banned) {
        setIsChatBanned(true);
        toast.error('Chat Access Restricted', {
          description: userData.chat_ban_reason || 'Your account has been restricted from using chat features.',
          duration: 10000,
        });
      }

      // Load blocked users
      const { data: blocks } = await supabase
        .from('blocked_users')
        .select('blocked_user_id')
        .eq('user_id', user.id);
      
      if (blocks) {
        setBlockedUsers(blocks.map(b => b.blocked_user_id));
      }
    }
  };

  const handleBlockUser = async () => {
    if (!selectedConv?.otherUser?.id) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in');
        return;
      }

      const isBlocked = blockedUsers.includes(selectedConv.otherUser.id);

      if (isBlocked) {
        // Unblock
        const { error } = await supabase
          .from('blocked_users')
          .delete()
          .eq('user_id', user.id)
          .eq('blocked_user_id', selectedConv.otherUser.id);

        if (!error) {
          setBlockedUsers(blockedUsers.filter(id => id !== selectedConv.otherUser.id));
          toast.success('User unblocked');
        }
      } else {
        // Block
        const { error } = await supabase
          .from('blocked_users')
          .insert({
            user_id: user.id,
            blocked_user_id: selectedConv.otherUser.id,
          });

        if (!error) {
          setBlockedUsers([...blockedUsers, selectedConv.otherUser.id]);
          toast.success('User blocked. You won\'t see messages from them.');
        }
      }
    } catch (error) {
      console.error('Error blocking/unblocking user:', error);
      toast.error('Failed to update block status');
    }
  };

  const loadConversations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/conversations', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
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
        setShowNewChatModal(false);
        setUserSearchQuery('');
        await loadConversations();
        setSelectedConversation(data.conversationId);
      } else {
        toast.error('Failed to start chat');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    }
  };

  const loadMessages = async () => {
    if (!selectedConversation) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/messages?conversationId=${selectedConversation}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only images and documents (PDF, DOC, DOCX) are allowed');
      return;
    }

    setSelectedFile(file);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageText.trim() && !selectedFile) || !selectedConversation) return;

    setSending(true);
    setUploading(!!selectedFile);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to send messages');
        return;
      }

      let attachmentUrl = null;
      let attachmentType = null;
      let attachmentName = null;

      // Upload file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `chat-attachments/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-files')
          .upload(filePath, selectedFile);

        if (uploadError) {
          toast.error('Failed to upload file');
          console.error('Upload error:', uploadError);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('chat-files')
          .getPublicUrl(filePath);

        attachmentUrl = publicUrl;
        attachmentType = selectedFile.type.startsWith('image/') ? 'image' : 'document';
        attachmentName = selectedFile.name;
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          conversationId: selectedConversation,
          content: messageText || (selectedFile ? `Sent a ${attachmentType}` : ''),
          attachmentUrl,
          attachmentType,
          attachmentName,
        }),
      });

      if (response.ok) {
        setMessageText('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadMessages();
        loadConversations();
      } else {
        const errorData = await response.json();
        if (errorData.isChatBanned) {
          toast.error('Chat Ban', {
            description: errorData.reason || 'You have been banned from chat',
            duration: 5000,
          });
          setIsChatBanned(true);
        } else {
          toast.error('Failed to send message');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleReportChat = async () => {
    if (!reportReason.trim() || !selectedConversation) {
      toast.error('Please provide a reason for reporting');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to report');
        return;
      }

      const response = await fetch('/api/chat/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          conversationId: selectedConversation,
          reportedUserId: selectedConv?.otherUser?.id,
          reason: reportReason,
        }),
      });

      if (response.ok) {
        toast.success('Chat reported successfully. Admins will review it.');
        setShowReportModal(false);
        setReportReason('');
      } else {
        toast.error('Failed to report chat');
      }
    } catch (error) {
      console.error('Error reporting chat:', error);
      toast.error('Failed to report chat');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDownloadAttachment = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex">
        <Sidebar />
        <Toaster position="top-right" />
        <div className="flex-1 sm:ml-56 pt-20 sm:pt-0 flex items-center justify-center p-4">
          <p className="text-sm sm:text-base text-gray-700">Please log in to access chat</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] flex">
      <Sidebar />
      <Toaster position="top-right" richColors />
      
      <div className="flex-1 sm:ml-56 pt-16 sm:pt-0 flex">
        {/* Conversations List - Hidden on mobile when chat is selected */}
        <div className={`${selectedConversation ? 'hidden sm:flex' : 'flex'} w-full sm:w-72 bg-white sm:border-r-2 border-black h-[calc(100vh-4rem)] sm:h-screen overflow-y-auto flex-col`}>
          <div className="px-3 sm:px-4 py-3 sm:py-4 border-b-2 border-black flex items-center bg-[#F4C430]">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => router.back()}
                  className="p-1 sm:p-1.5 border-2 border-black rounded hover:bg-black hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Messages</h1>
              </div>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="p-1.5 sm:p-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
                title="New Chat"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          <div className="p-2 sm:p-3 space-y-1.5 sm:space-y-2">
            {loading ? (
              <p className="text-center text-gray-600 py-4 sm:py-6 text-xs sm:text-sm">Loading...</p>
            ) : conversations.length === 0 ? (
              <p className="text-center text-gray-600 py-4 sm:py-6 text-xs sm:text-sm">No conversations yet</p>
            ) : (
              conversations.map((conv) => {
                if (!conv.otherUser) return null;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`w-full p-2 sm:p-2.5 rounded-lg border-2 transition-all text-left shadow-[2px_2px_0px_#000] ${
                      selectedConversation === conv.id
                        ? 'bg-black text-white border-black'
                        : 'bg-white border-black hover:bg-gray-50 hover:translate-x-[-1px] hover:translate-y-[-1px] sm:hover:translate-x-[-2px] sm:hover:translate-y-[-2px] hover:shadow-[3px_3px_0px_#000] sm:hover:shadow-[4px_4px_0px_#000]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {conv.otherUser?.avatar_url ? (
                        <img 
                          src={conv.otherUser.avatar_url} 
                          alt={conv.otherUser.full_name || 'User'}
                          className="w-9 h-9 rounded-full object-cover border-2 border-black"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm border-2 border-black">
                          {conv.otherUser?.full_name?.charAt(0).toUpperCase() || conv.otherUser?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-sm">
                          {conv.otherUser?.full_name || conv.otherUser?.email || 'Unknown User'}
                        </p>
                        <p className={`text-xs truncate ${selectedConversation === conv.id ? 'text-gray-300' : 'text-gray-600'}`}>
                          {new Date(conv.updated_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area - Full screen on mobile when selected */}
        <div className={`${selectedConversation ? 'flex' : 'hidden sm:flex'} flex-1 flex-col`}>
          {selectedConv && selectedConv.otherUser ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b-2 border-black px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  {/* Back button on mobile */}
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="sm:hidden p-1 border-2 border-black rounded hover:bg-black hover:text-white transition-colors flex-shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  
                  {selectedConv.otherUser?.avatar_url ? (
                    <img 
                      src={selectedConv.otherUser.avatar_url} 
                      alt={selectedConv.otherUser.full_name || 'User'}
                      className="w-9 h-9 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-black flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm sm:text-lg border-2 border-black flex-shrink-0">
                      {selectedConv.otherUser?.full_name?.charAt(0).toUpperCase() || selectedConv.otherUser?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => router.push(`/profile/${selectedConv.otherUser?.id}`)}
                      className="font-bold text-sm sm:text-lg md:text-xl text-gray-900 hover:underline text-left truncate block w-full"
                    >
                      {selectedConv.otherUser?.full_name || selectedConv.otherUser?.email || 'Unknown User'}
                    </button>
                    {selectedConv.otherUser?.full_name && (
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{selectedConv.otherUser.email}</p>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                  <button
                    onClick={handleBlockUser}
                    className={`p-1.5 sm:p-2 border-2 border-black rounded-lg transition-colors ${
                      blockedUsers.includes(selectedConv.otherUser?.id || '')
                        ? 'bg-gray-200 hover:bg-gray-300'
                        : 'hover:bg-orange-50 hover:border-orange-600'
                    }`}
                    title={blockedUsers.includes(selectedConv.otherUser?.id || '') ? 'Unblock User' : 'Block User'}
                  >
                    <UserX className={`w-4 h-4 sm:w-5 sm:h-5 ${blockedUsers.includes(selectedConv.otherUser?.id || '') ? 'text-gray-600' : 'text-orange-600'}`} />
                  </button>
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="p-1.5 sm:p-2 border-2 border-black rounded-lg hover:bg-red-50 hover:border-red-600 transition-colors"
                    title="Report Chat"
                  >
                    <Flag className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3">
                {blockedUsers.includes(selectedConv.otherUser?.id || '') && (
                  <div className="bg-orange-100 border-2 border-orange-600 rounded-lg p-2 sm:p-3 text-center">
                    <p className="text-xs sm:text-sm text-orange-800 font-medium">
                      You have blocked this user. They cannot send you new messages.
                    </p>
                  </div>
                )}
                {messages.map((message) => {
                  const isOwn = message.sender_id === user.id;
                  return (
                    <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] sm:max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                        <div className={`p-2 sm:p-3 rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] ${
                          isOwn ? 'bg-blue-600 text-white' : 'bg-white text-gray-900'
                        }`}>
                          {message.attachment_url && (
                            <div className="mb-2">
                              {message.attachment_type === 'image' ? (
                                <div className="relative group">
                                  <img 
                                    src={message.attachment_url} 
                                    alt="Attachment"
                                    className="max-w-full rounded border-2 border-black cursor-pointer hover:opacity-90"
                                    onClick={() => window.open(message.attachment_url, '_blank')}
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadAttachment(
                                        message.attachment_url!,
                                        message.attachment_name || `image-${message.id}.jpg`
                                      );
                                    }}
                                    className={`absolute top-2 right-2 p-1.5 rounded ${isOwn ? 'bg-blue-700 hover:bg-blue-800' : 'bg-gray-700 hover:bg-gray-800'} text-white opacity-0 group-hover:opacity-100 transition-opacity`}
                                    title="Download"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                  </button>
                                </div>
                              ) : (
                                <div className={`flex items-center justify-between gap-2 p-2 rounded border ${isOwn ? 'border-white/30 hover:bg-blue-700' : 'border-gray-300 hover:bg-gray-50'}`}>
                                  <a 
                                    href={message.attachment_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 flex-1 min-w-0"
                                  >
                                    <FileText className="w-5 h-5 flex-shrink-0" />
                                    <span className="text-sm truncate">{message.attachment_name || 'Document'}</span>
                                  </a>
                                  <button
                                    onClick={() => handleDownloadAttachment(
                                      message.attachment_url!,
                                      message.attachment_name || `document-${message.id}.pdf`
                                    )}
                                    className={`p-1 rounded ${isOwn ? 'hover:bg-blue-800' : 'hover:bg-gray-200'} transition-colors`}
                                    title="Download"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          {message.content && (
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          )}
                        </div>
                        <p className={`text-xs text-gray-600 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="bg-white border-t-2 border-black p-3">
                {isChatBanned && (
                  <div className="mb-2 p-3 bg-red-100 border-2 border-red-600 rounded-lg">
                    <p className="text-sm text-red-800 font-bold">
                      ⚠️ You have been banned from chat. You cannot send messages.
                    </p>
                  </div>
                )}
                {selectedFile && (
                  <div className="mb-2 p-2 bg-gray-50 border-2 border-black rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectedFile.type.startsWith('image/') ? (
                        <ImageIcon className="w-5 h-5 text-blue-600" />
                      ) : (
                        <FileText className="w-5 h-5 text-blue-600" />
                      )}
                      <span className="text-sm font-medium truncate max-w-xs">{selectedFile.name}</span>
                      <span className="text-xs text-gray-500">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending || uploading || isChatBanned}
                    className="p-2 border-2 border-black rounded-lg hover:bg-gray-100 disabled:bg-gray-200 transition-colors"
                    title="Attach file"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={isChatBanned ? "You are banned from chat" : "Type a message..."}
                    className="flex-1 px-3 py-2 border-2 border-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    disabled={sending || isChatBanned}
                  />
                  <button
                    type="submit"
                    disabled={sending || (!messageText.trim() && !selectedFile) || isChatBanned}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors flex items-center gap-2 text-sm"
                  >
                    {uploading ? (
                      <>Uploading...</>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-600 text-sm">Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-gray-200 bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto p-4 border-2 border-black">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-bold">New Chat</h2>
              <button
                onClick={() => {
                  setShowNewChatModal(false);
                  setUserSearchQuery('');
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

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
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.map((user) => (
                <div 
                  key={user.id} 
                  onClick={() => handleStartChat(user.id)}
                  className="bg-white border-2 border-black rounded-lg p-2.5 shadow-[2px_2px_0px_#000] cursor-pointer hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.full_name}
                        className="w-9 h-9 rounded-full object-cover border-2 border-black"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm border-2 border-black">
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartChat(user.id);
                    }}
                    className="w-full px-2 py-1.5 bg-black text-white text-xs rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Start Chat
                  </button>
                </div>
              ))}
              {users.length === 0 && (
                <p className="text-center text-gray-600 py-6 text-sm">No users found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Chat Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-gray-200 bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 border-2 border-black shadow-[4px_4px_0px_#000]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
                <Flag className="w-6 h-6" />
                Report Chat
              </h2>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason('');
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-700 mb-4">
              Reporting this chat will notify admins who can take action including blocking the user from chat and posts.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for reporting *
              </label>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Please describe why you're reporting this chat..."
                className="w-full px-3 py-2 border-2 border-black rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm resize-none"
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason('');
                }}
                className="flex-1 px-4 py-2 border-2 border-black rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReportChat}
                disabled={!reportReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
