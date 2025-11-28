'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";
import { Search, ArrowLeft, Play } from "lucide-react";

interface LastWatchedVideo {
  id: string;
  file_name: string;
  video_url: string;
  duration: number | null;
  subtitles: string | null;
}

interface Post {
  id: string;
  user: { id: string; full_name: string; avatar_url?: string };
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [lastWatchedVideo, setLastWatchedVideo] = useState<LastWatchedVideo | null>(null);
  const [topPosts, setTopPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    checkAccess();
  }, []);

  const [user, setUser] = useState<any>(null);

  const checkAccess = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push('/login');
        return;
      }

      setUser(authUser);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/check-domain', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!data.hasAccess) {
        router.push('/restricted');
        return;
      }

      setChecking(false);

      // Fetch last watched video and top posts
      await Promise.all([
        fetchLastWatchedVideo(),
        fetchTopPosts()
      ]);
    } catch (error) {
      console.error('Error checking access:', error);
      router.push('/login');
    }
  };

  const fetchTopPosts = async () => {
    try {
      const response = await fetch('/api/posts/top-weekly');
      const data = await response.json();
      setTopPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching top posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchLastWatchedVideo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('last_watched_video_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.last_watched_video_id) {
        console.log('No last watched video found');
        return;
      }

      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('id, file_name, video_url, duration, subtitles')
        .eq('id', userData.last_watched_video_id)
        .single();

      if (!videoError && videoData) {
        setLastWatchedVideo(videoData as LastWatchedVideo);
      }
    } catch (error) {
      console.error('Error fetching last watched video:', error);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen bg-[#9DC4AA] items-center justify-center">
        <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_#000]">
          <p className="text-gray-900 font-bold">Checking access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#9DC4AA]">
      <Sidebar />
      <main className="flex-1 ml-56 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-[#FFF7E4] border-2 border-black p-6 mb-6 shadow-[8px_8px_0px_#000] flex items-center justify-between">
            <button className="p-3 bg-white border-2 border-black hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 mx-6 relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search Anything"
                className="w-full pl-10 pr-4 py-3 border-2 border-black bg-white focus:outline-none focus:shadow-[4px_4px_0px_#000] transition-all placeholder:text-gray-500 font-medium"
              />
            </div>

            <div className="flex gap-3">
              <NotificationBell />
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="w-12 h-12 rounded-full border-2 border-black object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-blue-600 border-2 border-black rounded-full flex items-center justify-center text-white font-bold">
                  {user?.user_metadata?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Jump back in */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#FFF7E4] border-2 border-black p-6 shadow-[8px_8px_0px_#000]">
                <h2 className="text-3xl font-black uppercase tracking-tight mb-6">Jump back in</h2>

                {lastWatchedVideo ? (
                  /* Video Card */
                  <button
                    onClick={() => {
                      // Store video info in localStorage to auto-load it
                      localStorage.setItem('autoLoadVideo', JSON.stringify({
                        id: lastWatchedVideo.id,
                        file_path: lastWatchedVideo.file_name,
                        file_name: lastWatchedVideo.file_name,
                        video_url: lastWatchedVideo.video_url,
                        subtitles: lastWatchedVideo.subtitles,
                        duration: lastWatchedVideo.duration
                      }));
                      router.push('/hub?tab=videos');
                    }}
                    className="w-full bg-white border-2 border-black overflow-hidden shadow-[4px_4px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000] transition-all"
                  >
                    <div className="flex">
                      {/* Video Thumbnail */}
                      <div className="w-2/3 bg-gradient-to-r from-green-600 to-green-700 relative flex items-center justify-center border-r-2 border-black aspect-video">
                        <video
                          src={lastWatchedVideo.video_url}
                          className="absolute inset-0 w-full h-full object-cover opacity-30"
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm border-2 border-white rounded-full flex items-center justify-center">
                            <Play className="w-10 h-10 text-white ml-1" fill="white" />
                          </div>
                        </div>
                        {lastWatchedVideo.subtitles && (
                          <div className="absolute top-4 right-4 bg-[#A8D7B7] border border-black px-2 py-1 text-xs font-bold uppercase tracking-wider">
                            CC
                          </div>
                        )}
                        <div className="absolute bottom-4 left-4 right-4 text-white text-left">
                          <h3 className="text-xl font-bold truncate">{lastWatchedVideo.file_name}</h3>
                          {lastWatchedVideo.duration && (
                            <p className="text-sm mt-1">
                              Duration: {Math.floor(lastWatchedVideo.duration / 60)}:{String(Math.floor(lastWatchedVideo.duration % 60)).padStart(2, "0")}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Continue Watching */}
                      <div className="w-1/3 bg-[#F4C430] flex items-center justify-center p-6">
                        <div className="text-center">
                          <div className="text-2xl font-black uppercase tracking-tight mb-2">Continue</div>
                          <div className="text-sm font-bold uppercase tracking-wider">Watching</div>
                        </div>
                      </div>
                    </div>
                  </button>
                ) : (
                  /* No Video Card */
                  <div className="bg-white border-2 border-black p-12 text-center shadow-[4px_4px_0px_#000]">
                    <Play className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-xl font-black uppercase tracking-tight mb-2">No Videos Watched Yet</h3>
                    <p className="text-gray-600 font-medium mb-4">
                      Start watching videos in the Learning Hub
                    </p>
                    <button
                      onClick={() => router.push('/hub?tab=videos')}
                      className="px-6 py-3 bg-[#F4C430] border-2 border-black font-bold uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
                    >
                      Go to Videos
                    </button>
                  </div>
                )}
              </div>

              {/* Community Points */}
              <div className="bg-[#FFF7E4] border-2 border-black p-6 shadow-[8px_8px_0px_#000]">
                <h3 className="text-xl font-black uppercase tracking-tight mb-4 text-center border-b-2 border-black pb-3">
                  Community Points
                </h3>
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="text-6xl font-black mb-2">0</div>
                    <div className="text-sm font-bold uppercase tracking-wider text-gray-600">
                      Points Earned
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Top Posts */}
            <div className="bg-[#FFF7E4] border-2 border-black p-6 shadow-[8px_8px_0px_#000]">
              <h3 className="text-xl font-black uppercase tracking-tight mb-4 text-center border-b-2 border-black pb-3">
                Top Posts This Week
              </h3>
              <div className="space-y-3">
                {loadingPosts ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 font-medium">Loading posts...</p>
                  </div>
                ) : topPosts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 font-medium">No posts yet</p>
                  </div>
                ) : (
                  topPosts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => router.push('/community')}
                      className="w-full bg-white border-2 border-black p-3 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all text-left"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        {post.user.avatar_url ? (
                          <img
                            src={post.user.avatar_url}
                            alt={post.user.full_name}
                            className="w-8 h-8 rounded-full border-2 border-black object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full border-2 border-black bg-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {post.user.full_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-900 truncate">
                            {post.user.full_name}
                          </p>
                          <p className="text-xs text-gray-700 line-clamp-2 mt-1">
                            {post.content}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600 font-medium">
                        <span className="flex items-center gap-1">
                          <span>❤️</span>
                          {post.likes_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <span>💬</span>
                          {post.comments_count}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
