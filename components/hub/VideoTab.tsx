"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { Play, Upload as UploadIcon, Tag, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Subtitle {
  start: number;
  end: number;
  text: string;
}

interface VideoItem {
  id: string;
  file_path: string;
  file_name: string;
  video_url: string;
  duration: number | null;
  created_at: string;
  subtitles: string | null;
  title: string | null;
  tags: string[] | null;
  uploaded_by: string | null;
}

type VideoJSPlayer = ReturnType<typeof videojs>;

export default function VideoTab() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<Subtitle | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingSubtitles, setIsGeneratingSubtitles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [subtitleOffset, setSubtitleOffset] = useState(0);
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("auto");
  const [translateToEnglish, setTranslateToEnglish] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [inputMode, setInputMode] = useState<"upload" | "youtube">("upload");
  const [uploadedVideos, setUploadedVideos] = useState<VideoItem[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  
  // New states for title and tags
  const [videoTitle, setVideoTitle] = useState("");
  const [videoTags, setVideoTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<VideoJSPlayer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subtitleContainerRef = useRef<HTMLDivElement>(null);

  // Load user role and ID on mount
  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        
        if (userData) {
          setUserRole(userData.role);
        }
      }
    } catch (error) {
      console.error("Error loading user role:", error);
    }
  };

  // Load uploaded videos on mount
  useEffect(() => {
    if (userRole) {
      loadUploadedVideos();
      loadNotes();
    }
    
    // Check if there's a video to auto-load from home page
    const autoLoadVideoData = localStorage.getItem('autoLoadVideo');
    if (autoLoadVideoData) {
      try {
        const videoData = JSON.parse(autoLoadVideoData);
        localStorage.removeItem('autoLoadVideo');
        handleVideoSelect(videoData as VideoItem);
      } catch (error) {
        console.error('Error auto-loading video:', error);
      }
    }
  }, [userRole]);

  // Filter videos when tag filter or videos change
  useEffect(() => {
    if (selectedTagFilter) {
      setFilteredVideos(
        uploadedVideos.filter(video => 
          video.tags && video.tags.includes(selectedTagFilter)
        )
      );
    } else {
      setFilteredVideos(uploadedVideos);
    }
  }, [selectedTagFilter, uploadedVideos]);

  // Extract all unique tags
  useEffect(() => {
    const tags = new Set<string>();
    uploadedVideos.forEach(video => {
      if (video.tags) {
        video.tags.forEach(tag => tags.add(tag));
      }
    });
    setAllTags(Array.from(tags).sort());
  }, [uploadedVideos]);

  const loadNotes = async () => {
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setNotes(data);
      }
    } catch (error) {
      console.error("Error loading notes:", error);
    }
  };

  const loadUploadedVideos = async () => {
    try {
      setLoadingVideos(true);
      let query = supabase
        .from("videos")
        .select("*")
        .order("created_at", { ascending: false });

      // Faculty only sees their own videos
      if (userRole === "faculty" && userId) {
        query = query.eq("uploaded_by", userId);
      }
      // Students see all videos

      const { data, error } = await query;

      if (error) {
        console.error("Error loading videos:", error);
      } else {
        setUploadedVideos((data || []) as unknown as VideoItem[]);
      }
    } catch (error) {
      console.error("Error loading videos:", error);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleVideoSelect = async (video: VideoItem) => {
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }

    setVideoId(video.file_path);
    setVideoUrl(video.video_url);
    setShowUploadForm(false);

    if (video.subtitles) {
      try {
        const parsedSubtitles = JSON.parse(video.subtitles);
        setSubtitles(parsedSubtitles);
      } catch (error) {
        console.error("Error parsing subtitles:", error);
        setSubtitles([]);
      }
    } else {
      setSubtitles([]);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
          .from("users")
          .update({ last_watched_video_id: video.id })
          .eq("id", user.id);
      }
    } catch (error) {
      console.error("Error updating last watched video:", error);
    }
  };

  // Tag management functions
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !videoTags.includes(tag)) {
      setVideoTags([...videoTags, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setVideoTags(videoTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  // Handle file upload with title and tags
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("video/")) {
      alert("Please select a valid video file");
      return;
    }

    // Validate title for faculty
    if (userRole === "faculty" && !videoTitle.trim()) {
      alert("Please enter a title for the video");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setSubtitles([]);
    setCurrentSubtitle(null);
    setSearchQuery("");
    setSearchResults([]);

    try {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }

      console.log("📤 Uploading video to Supabase Storage...");

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("videos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("❌ Upload error:", uploadError);
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("videos").getPublicUrl(filePath);

      // Save video metadata with title and tags
      const { data: videoData, error: dbError } = await supabase
        .from("videos")
        .insert({
          file_path: filePath,
          file_name: file.name,
          video_url: publicUrl,
          title: videoTitle.trim() || file.name,
          tags: videoTags.length > 0 ? videoTags : null,
          uploaded_by: userId,
        })
        .select()
        .single();

      if (dbError) {
        console.error("❌ Database error:", dbError);
      } else {
        console.log("✅ Video metadata saved:", videoData);
      }

      setVideoId(filePath);
      setVideoUrl(publicUrl);
      
      // Reset form
      setVideoTitle("");
      setVideoTags([]);
      setTagInput("");

      await loadSubtitles(filePath);
      await loadUploadedVideos();
      
      alert("Video uploaded successfully!");
    } catch (error) {
      console.error("💥 Error uploading video:", error);
      alert(
        `Failed to upload video: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle YouTube URL
  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl.trim()) {
      alert("Please enter a YouTube URL");
      return;
    }

    if (userRole === "faculty" && !videoTitle.trim()) {
      alert("Please enter a title for the video");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setSubtitles([]);
    setCurrentSubtitle(null);
    setSearchQuery("");
    setSearchResults([]);

    try {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }

      const response = await fetch("/api/download-youtube", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          youtubeUrl: youtubeUrl.trim(),
          title: videoTitle.trim(),
          tags: videoTags.length > 0 ? videoTags : null,
          uploadedBy: userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to download YouTube video");
      }

      const data = await response.json();
      setVideoId(data.videoId);
      setVideoUrl(data.videoPath);
      setYoutubeUrl("");
      setVideoTitle("");
      setVideoTags([]);
      setTagInput("");

      await loadSubtitles(data.videoId);
      await loadUploadedVideos();
      
      alert("YouTube video downloaded successfully!");
    } catch (error) {
      console.error("Error downloading YouTube video:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to download video. Please try again."
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const loadSubtitles = async (filePath: string) => {
    try {
      const { data: videoData, error: videoError } = await supabase
        .from("videos")
        .select("subtitles")
        .eq("file_path", filePath)
        .single();

      if (videoError || !videoData) {
        return;
      }

      if (videoData.subtitles) {
        try {
          const parsedSubtitles = JSON.parse(videoData.subtitles);
          setSubtitles(parsedSubtitles);
        } catch (parseError) {
          console.error("❌ Error parsing subtitles:", parseError);
        }
      }
    } catch (error) {
      console.error("💥 Error loading subtitles:", error);
    }
  };

  const generateSubtitles = async () => {
    if (!videoId || !videoUrl) return;

    setIsGeneratingSubtitles(true);
    setSubtitles([]);
    setCurrentSubtitle(null);

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoId: videoId,
          language: selectedLanguage === "auto" ? null : selectedLanguage,
          translate: translateToEnglish,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate subtitles");
      }

      const data = await response.json();
      setSubtitles(data.subtitles);

      await saveSubtitlesToDatabase(videoId, data.subtitles);

      try {
        const { error: updateError } = await supabase
          .from("videos")
          .update({ subtitles: JSON.stringify(data.subtitles) } as any)
          .eq("file_path", videoId);
        
        if (updateError) {
          console.error("Error updating videos table:", updateError);
        }
      } catch (error) {
        console.error("Error updating videos table:", error);
      }

      if (playerRef.current && !playerRef.current.paused()) {
        const currentTime = playerRef.current.currentTime();
        if (currentTime !== null && currentTime !== undefined) {
          updateSubtitleDisplay(currentTime + subtitleOffset);
        }
      }

      await loadUploadedVideos();
    } catch (error) {
      console.error("Error generating subtitles:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to generate subtitles. Please try again."
      );
    } finally {
      setIsGeneratingSubtitles(false);
    }
  };

  const saveSubtitlesToDatabase = async (
    filePath: string,
    subtitles: Subtitle[]
  ) => {
    try {
      const { error: updateError } = await supabase
        .from("videos")
        .update({ subtitles: JSON.stringify(subtitles) } as any)
        .eq("file_path", filePath);

      if (updateError) {
        console.error("❌ Error saving subtitles:", updateError);
      }
    } catch (error) {
      console.error("💥 Error saving subtitles:", error);
    }
  };

  const updateSubtitleDisplay = useCallback(
    (currentTime: number) => {
      const subtitle = subtitles.find(
        (sub) => currentTime >= sub.start && currentTime <= sub.end
      );
      setCurrentSubtitle(subtitle || null);
    },
    [subtitles]
  );

  useEffect(() => {
    if (videoRef.current && videoUrl && !playerRef.current) {
      const player = videojs(videoRef.current, {
        controls: true,
        responsive: true,
        fluid: true,
        playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
      });

      playerRef.current = player;

      return () => {
        if (playerRef.current) {
          playerRef.current.dispose();
          playerRef.current = null;
        }
      };
    }
  }, [videoUrl]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handleTimeUpdate = () => {
      const currentTime = player.currentTime();
      if (currentTime !== null && currentTime !== undefined) {
        updateSubtitleDisplay(currentTime + subtitleOffset);
      }
    };

    player.on("timeupdate", handleTimeUpdate);

    return () => {
      player.off("timeupdate", handleTimeUpdate);
    };
  }, [subtitles, subtitleOffset, updateSubtitleDisplay]);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = notes.filter((note) =>
      note.title?.toLowerCase().includes(query) ||
      note.content?.toLowerCase().includes(query) ||
      note.subject?.toLowerCase().includes(query)
    );
    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  }, [searchQuery, notes]);

  useEffect(() => {
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [handleSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!playerRef.current || !videoUrl) return;

      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowLeft':
          seek(-5);
          break;
        case 'ArrowRight':
          seek(5);
          break;
        case 'ArrowUp':
          const currentVolume = playerRef.current.volume();
          if (currentVolume !== null && currentVolume !== undefined) {
            playerRef.current.volume(Math.min(1, currentVolume + 0.1));
          }
          break;
        case 'ArrowDown':
          const volume = playerRef.current.volume();
          if (volume !== null && volume !== undefined) {
            playerRef.current.volume(Math.max(0, volume - 0.1));
          }
          break;
        case ' ':
          if (playerRef.current.paused()) {
            playerRef.current.play();
          } else {
            playerRef.current.pause();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videoUrl]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const seek = (seconds: number) => {
    if (playerRef.current) {
      const currentTime = playerRef.current.currentTime();
      const duration = playerRef.current.duration();
      if (
        currentTime !== null &&
        currentTime !== undefined &&
        duration !== null &&
        duration !== undefined
      ) {
        const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
        playerRef.current.currentTime(newTime);
      }
    }
  };

  const adjustSubtitleOffset = (seconds: number) => {
    setSubtitleOffset((prev) => prev + seconds);
  };

  if (!userRole) {
    return (
      <div className="bg-[#FFF7E4] border-2 border-black p-12 text-center shadow-[8px_8px_0px_#000] min-h-[75vh]">
        <p className="text-gray-600 font-bold">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Video Library Grid */}
      {!videoUrl && !showUploadForm && (
        <div className="bg-[#FFF7E4] border-2 border-black p-6 shadow-[8px_8px_0px_#000] min-h-[75vh]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tight">
              {userRole === "faculty" ? "My Videos" : "Video Library"}
            </h2>
            {userRole === "faculty" && (
              <button
                onClick={() => setShowUploadForm(true)}
                className="px-6 py-3 bg-[#F4C430] border-2 border-black font-bold uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
              >
                Upload New Video
              </button>
            )}
          </div>

          {/* Tag Filter for Students */}
          {userRole === "student" && allTags.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                Filter by Tag:
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedTagFilter(null)}
                  className={`px-4 py-2 border-2 border-black font-bold text-sm uppercase tracking-wider transition-all ${
                    selectedTagFilter === null
                      ? "bg-[#6B9BD1] text-white shadow-[4px_4px_0px_#000] translate-x-[-2px] translate-y-[-2px]"
                      : "bg-white hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000]"
                  }`}
                >
                  All
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTagFilter(tag)}
                    className={`px-4 py-2 border-2 border-black font-bold text-sm uppercase tracking-wider transition-all ${
                      selectedTagFilter === tag
                        ? "bg-[#6B9BD1] text-white shadow-[4px_4px_0px_#000] translate-x-[-2px] translate-y-[-2px]"
                        : "bg-white hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000]"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loadingVideos ? (
            <div className="bg-white border-2 border-black p-12 text-center shadow-[4px_4px_0px_#000]">
              <p className="text-gray-600 font-bold">Loading videos...</p>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="bg-white border-2 border-black p-12 text-center shadow-[4px_4px_0px_#000]">
              <p className="text-gray-600 font-bold mb-4">
                {userRole === "faculty" 
                  ? "No videos uploaded yet" 
                  : selectedTagFilter 
                    ? `No videos found with tag "${selectedTagFilter}"` 
                    : "No videos available yet"}
              </p>
              {userRole === "faculty" && (
                <button
                  onClick={() => setShowUploadForm(true)}
                  className="px-6 py-3 bg-[#F4C430] border-2 border-black font-bold uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
                >
                  Upload Your First Video
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredVideos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => handleVideoSelect(video)}
                  className="bg-white border-2 border-black overflow-hidden cursor-pointer hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
                >
                  <div className="relative aspect-video bg-gray-900 flex items-center justify-center group">
                    <video
                      src={video.video_url}
                      className="w-full h-full object-cover"
                      preload="metadata"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors flex items-center justify-center">
                      <div className="w-16 h-16 bg-[#F4C430] border-2 border-black flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 text-black ml-1" fill="currentColor" />
                      </div>
                    </div>
                    {video.subtitles && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-[#A8D7B7] border border-black text-xs font-bold uppercase tracking-wider">
                        CC
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t-2 border-black">
                    <h3 className="font-bold text-gray-900 truncate mb-1">
                      {video.title || video.file_name}
                    </h3>
                    {video.tags && video.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {video.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-[#6B9BD1] text-white text-xs font-bold border border-black"
                          >
                            {tag}
                          </span>
                        ))}
                        {video.tags.length > 3 && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-bold border border-black">
                            +{video.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-sm text-gray-600 font-medium">
                      {new Date(video.created_at).toLocaleDateString()}
                    </p>
                    {video.duration && (
                      <p className="text-xs text-gray-500 mt-1 font-medium">
                        {Math.floor(video.duration / 60)}:{String(Math.floor(video.duration % 60)).padStart(2, "0")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* File Upload / YouTube - Faculty Only */}
      {!videoUrl && showUploadForm && userRole === "faculty" && (
        <div className="bg-[#FFF7E4] border-2 border-black p-8 shadow-[8px_8px_0px_#000]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tight">Upload Video</h2>
            <button
              onClick={() => {
                setShowUploadForm(false);
                setVideoTitle("");
                setVideoTags([]);
                setTagInput("");
              }}
              className="px-4 py-2 bg-white border-2 border-black font-bold hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
            >
              Back to Library
            </button>
          </div>

          {/* Title and Tags Input */}
          <div className="mb-6 space-y-4 bg-white border-2 border-black p-6">
            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                Video Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="Enter video title"
                className="w-full px-4 py-3 border-2 border-black bg-white font-medium focus:outline-none focus:shadow-[4px_4px_0px_#000] transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                Tags (Optional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="Add a tag and press Enter"
                  className="flex-1 px-4 py-3 border-2 border-black bg-white font-medium focus:outline-none focus:shadow-[4px_4px_0px_#000] transition-all"
                />
                <button
                  onClick={addTag}
                  className="px-6 py-3 bg-[#6B9BD1] text-white border-2 border-black font-bold uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
                >
                  <Tag className="w-5 h-5" />
                </button>
              </div>
              {videoTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {videoTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-[#6B9BD1] text-white border-2 border-black font-bold text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Toggle Buttons */}
          <div className="flex gap-2 mb-6 justify-center">
            <button
              onClick={() => setInputMode("upload")}
              className={`px-6 py-2 border-2 border-black font-bold uppercase tracking-wider transition-all ${
                inputMode === "upload"
                  ? "bg-[#F4C430] shadow-[4px_4px_0px_#000] translate-x-[-2px] translate-y-[-2px]"
                  : "bg-white hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000]"
              }`}
            >
              Upload File
            </button>
            <button
              onClick={() => setInputMode("youtube")}
              className={`px-6 py-2 border-2 border-black font-bold uppercase tracking-wider transition-all ${
                inputMode === "youtube"
                  ? "bg-[#F4C430] shadow-[4px_4px_0px_#000] translate-x-[-2px] translate-y-[-2px]"
                  : "bg-white hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000]"
              }`}
            >
              YouTube URL
            </button>
          </div>

          {/* Upload Mode */}
          {inputMode === "upload" && (
            <div className="border-2 border-dashed border-black bg-white p-12 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-6 py-3 bg-[#F4C430] border-2 border-black font-bold uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
              >
                {isUploading ? "Uploading..." : "Choose Video File"}
              </button>
              <p className="mt-4 text-gray-600 font-medium">
                Select a video file to upload and play
              </p>
            </div>
          )}

          {/* YouTube Mode */}
          {inputMode === "youtube" && (
            <div className="border-2 border-dashed border-black bg-white p-12">
              <div className="max-w-2xl mx-auto">
                <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wider">
                  YouTube Video URL
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      !isUploading &&
                      handleYoutubeSubmit()
                    }
                    placeholder="https://www.youtube.com/watch?v=..."
                    disabled={isUploading}
                    className="flex-1 px-4 py-3 border-2 border-black bg-white text-gray-900 font-medium focus:outline-none focus:shadow-[4px_4px_0px_#000] transition-all"
                  />
                  <button
                    onClick={handleYoutubeSubmit}
                    disabled={isUploading || !youtubeUrl.trim()}
                    className="px-6 py-3 bg-[#F4C430] border-2 border-black font-bold uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] disabled:bg-gray-400 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                  >
                    {isUploading ? "Downloading..." : "Load Video"}
                  </button>
                </div>
                <p className="mt-4 text-sm text-gray-600 font-medium text-center">
                  Paste a YouTube video URL to download and process it
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Video Player - Simplified for both roles */}
      {videoUrl && (
        <div className="space-y-6">
          <div
            className="bg-black rounded-lg overflow-hidden relative"
            style={{ aspectRatio: "16/9" }}
          >
            <div data-vjs-player>
              <video
                ref={videoRef}
                className="video-js vjs-big-play-centered"
                playsInline
              >
                <source src={videoUrl} type="video/mp4" />
              </video>
            </div>

            {currentSubtitle && (
              <div
                ref={subtitleContainerRef}
                className="absolute bottom-20 left-0 right-0 flex justify-center px-4 pointer-events-none z-10"
                style={{
                  fontSize: `${fontSize}px`,
                  fontFamily: fontFamily,
                }}
              >
                <div className="bg-black/75 text-white px-4 py-2 rounded-lg max-w-4xl text-center">
                  {currentSubtitle.text}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border-2 border-black p-6 shadow-[4px_4px_0px_#000]">
              <h2 className="text-xl font-bold mb-4 uppercase tracking-tight">
                Controls
              </h2>

              {subtitles.length === 0 && userRole === "faculty" && (
                <div className="space-y-3 mb-6 pb-6 border-b-2 border-gray-200">
                  <h3 className="text-lg font-bold uppercase tracking-wider">
                    Generate Subtitles
                  </h3>
                  <button
                    onClick={generateSubtitles}
                    disabled={isGeneratingSubtitles}
                    className="w-full px-4 py-2 bg-[#6B9BD1] text-white border-2 border-black font-bold uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                  >
                    {isGeneratingSubtitles
                      ? "Generating..."
                      : "Generate Subtitles"}
                  </button>
                </div>
              )}

              {subtitles.length > 0 && (
                <div className="p-3 bg-green-50 border-2 border-green-500 mb-6">
                  <p className="text-sm text-green-800 font-bold">
                    ✓ Subtitles loaded ({subtitles.length} segments)
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  if (playerRef.current) {
                    playerRef.current.dispose();
                    playerRef.current = null;
                  }
                  if (videoUrl && videoUrl.startsWith("blob:")) {
                    URL.revokeObjectURL(videoUrl);
                  }
                  setVideoUrl(null);
                  setVideoId(null);
                  setSubtitles([]);
                  setCurrentSubtitle(null);
                  setSearchQuery("");
                  setSearchResults([]);
                  setShowUploadForm(false);
                }}
                className="w-full px-4 py-2 bg-white border-2 border-black font-bold uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
              >
                Back to Library
              </button>
            </div>

            <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_#000]">
              <h2 className="text-xl font-bold mb-4 uppercase tracking-tight">
                Subtitle Settings
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                    Font Size: {fontSize}px
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="48"
                    value={fontSize}
                    onChange={(e) =>
                      setFontSize(parseInt(e.target.value, 10))
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                    Font Family:
                  </label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black bg-white font-medium"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Georgia">Georgia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                    Timing Offset: {subtitleOffset > 0 ? "+" : ""}
                    {subtitleOffset.toFixed(1)}s
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => adjustSubtitleOffset(-0.5)}
                      className="px-3 py-2 bg-white border-2 border-black font-bold hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[2px_2px_0px_#000] transition-all"
                    >
                      -0.5s
                    </button>
                    <button
                      onClick={() => adjustSubtitleOffset(0.5)}
                      className="px-3 py-2 bg-white border-2 border-black font-bold hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[2px_2px_0px_#000] transition-all"
                    >
                      +0.5s
                    </button>
                  </div>
                  <button
                    onClick={() => setSubtitleOffset(0)}
                    className="w-full mt-2 px-3 py-2 bg-white border-2 border-black font-bold hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[2px_2px_0px_#000] transition-all"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
