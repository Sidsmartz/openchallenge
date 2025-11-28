'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Toaster, toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import { ArrowLeft, Send, Plus, Search, MessageCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to send messages');
        return;
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          conversationId: selectedConversation,
          content: messageText,
        }),
      });

      if (response.ok) {
        setMessageText('');
        loadMessages();
        loadConversations(); // Refresh to update timestamps
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex">
        <Sidebar />
        <Toaster position="top-right" />
        <div className="flex-1 ml-48 flex items-center justify-center">
          <p className="text-gray-700">Please log in to access chat</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] flex">
      <Sidebar />
      <Toaster position="top-right" richColors />
      
      <div className="flex-1 ml-48 flex">
        {/* Conversations List */}
        <div className="w-80 bg-white border-r-4 border-black h-screen overflow-y-auto">
          <div className="p-6 border-b-4 border-black">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="p-2 border-2 border-black rounded hover:bg-black hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
              </div>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="p-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
                title="New Chat"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-2">
            {loading ? (
              <p className="text-center text-gray-600 py-8">Loading...</p>
            ) : conversations.length === 0 ? (
              <p className="text-center text-gray-600 py-8">No conversations yet</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={`w-full p-3 rounded-lg border-2 transition-colors text-left ${
                    selectedConversation === conv.id
                      ? 'bg-black text-white border-black'
                      : 'bg-white border-gray-300 hover:border-black'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {conv.otherUser.avatar_url ? (
                      <img 
                        src={conv.otherUser.avatar_url} 
                        alt={conv.otherUser.full_name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-black"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold border-2 border-black">
                        {conv.otherUser.full_name?.charAt(0).toUpperCase() || conv.otherUser.email?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {conv.otherUser.full_name || conv.otherUser.email}
                      </p>
                      <p className={`text-xs truncate ${selectedConversation === conv.id ? 'text-gray-300' : 'text-gray-600'}`}>
                        {new Date(conv.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b-4 border-black p-6">
                <div className="flex items-center gap-3">
                  {selectedConv.otherUser.avatar_url ? (
                    <img 
                      src={selectedConv.otherUser.avatar_url} 
                      alt={selectedConv.otherUser.full_name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-black"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg border-2 border-black">
                      {selectedConv.otherUser.full_name?.charAt(0).toUpperCase() || selectedConv.otherUser.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-lg text-gray-900">
                      {selectedConv.otherUser.full_name || selectedConv.otherUser.email}
                    </p>
                    {selectedConv.otherUser.full_name && (
                      <p className="text-sm text-gray-600">{selectedConv.otherUser.email}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => {
                  const isOwn = message.sender_id === user.id;
                  return (
                    <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                        <div className={`p-3 rounded-lg border-2 border-black ${
                          isOwn ? 'bg-blue-600 text-white' : 'bg-white text-gray-900'
                        }`}>
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                        <p className={`text-xs text-gray-600 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                          {new Date(message.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="bg-white border-t-4 border-black p-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 border-2 border-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending || !messageText.trim()}
                    className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors flex items-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-600 text-lg">Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-gray-200 bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#F5F1E8] rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto p-6 border-4 border-black">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">New Chat</h2>
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
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search people..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-black rounded bg-white"
              />
            </div>

            {/* Users List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {users.map((user) => (
                <div key={user.id} className="bg-white border-2 border-black rounded-lg p-3">
                  <div className="flex items-center gap-3 mb-2">
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.full_name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-black"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold border-2 border-black">
                        {user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {user.full_name || user.email}
                      </p>
                      {user.full_name && (
                        <p className="text-xs text-gray-600 truncate">{user.email}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartChat(user.id)}
                    className="w-full px-3 py-2 bg-black text-white text-sm rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Start Chat
                  </button>
                </div>
              ))}
              {users.length === 0 && (
                <p className="text-center text-gray-600 py-8">No users found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
