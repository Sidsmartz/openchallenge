"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { Play } from "lucide-react";

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
}

type VideoJSPlayer = ReturnType<typeof videojs>;

export default function VideoTab() {
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
  const [searchResults, setSearchResults] = useState<Subtitle[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("auto");
  const [translateToEnglish, setTranslateToEnglish] = useState(false);
  const [translateToLanguage, setTranslateToLanguage] = useState<string>("none");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [inputMode, setInputMode] = useState<"upload" | "youtube">("upload");
  const [uploadedVideos, setUploadedVideos] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<VideoJSPlayer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subtitleContainerRef = useRef<HTMLDivElement>(null);

  // Load uploaded videos on mount
  useEffect(() => {
    loadUploadedVideos();
    
    // Check if there's a video to auto-load from home page
    const autoLoadVideoData = localStorage.getItem('autoLoadVideo');
    if (autoLoadVideoData) {
      try {
        const videoData = JSON.parse(autoLoadVideoData);
        // Clear the localStorage item
        localStorage.removeItem('autoLoadVideo');
        // Auto-select the video
        handleVideoSelect(videoData as VideoItem);
      } catch (error) {
        console.error('Error auto-loading video:', error);
      }
    }
  }, []);

  const loadUploadedVideos = async () => {
    try {
      setLoadingVideos(true);
      const { supabase } = await import("@/lib/supabase");
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("created_at", { ascending: false });

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
    // Clean up old player
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }

    setVideoId(video.file_path);
    setVideoUrl(video.video_url);
    setShowUploadForm(false);

    // Load subtitles from the subtitles column
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

    // Update last watched video for the user
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
          .from("users")
          .update({ last_watched_video_id: video.id })
          .eq("id", user.id);
        console.log("✅ Updated last watched video");
      }
    } catch (error) {
      console.error("Error updating last watched video:", error);
    }
  };

  // Update subtitle display
  const updateSubtitleDisplay = useCallback(
    (currentTime: number) => {
      const subtitle = subtitles.find(
        (sub) => currentTime >= sub.start && currentTime <= sub.end
      );
      setCurrentSubtitle(subtitle || null);
    },
    [subtitles]
  );

  // Initialize video.js player
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

  // Handle subtitle updates on timeupdate
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

  // Handle YouTube URL
  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl.trim()) {
      alert("Please enter a YouTube URL");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setSubtitles([]);
    setCurrentSubtitle(null);
    setSearchQuery("");
    setSearchResults([]);

    try {
      // Clean up old player
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }

      const response = await fetch("/api/download-youtube", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ youtubeUrl: youtubeUrl.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to download YouTube video");
      }

      const data = await response.json();
      setVideoId(data.videoId);
      setVideoUrl(data.videoPath);
      setYoutubeUrl("");

      // Try to load existing subtitles
      await loadSubtitles(data.videoId);

      // Reload video library
      await loadUploadedVideos();
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

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("video/")) {
      alert("Please select a valid video file");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setSubtitles([]);
    setCurrentSubtitle(null);
    setSearchQuery("");
    setSearchResults([]);

    try {
      // Clean up old player
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }

      console.log("📤 Uploading video to Supabase Storage...");

      // Upload video to Supabase Storage
      const { supabase } = await import("@/lib/supabase");
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      console.log("📁 File path:", filePath);

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

      console.log("✅ Upload successful:", uploadData);

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("videos").getPublicUrl(filePath);

      console.log("🔗 Public URL:", publicUrl);

      // Save video metadata to database
      const { data: videoData, error: dbError } = await supabase
        .from("videos")
        .insert({
          file_path: filePath,
          file_name: file.name,
          video_url: publicUrl,
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

      // Try to load existing subtitles from database
      await loadSubtitles(filePath);

      // Reload video library
      await loadUploadedVideos();
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

  // Load subtitles from database
  const loadSubtitles = async (filePath: string) => {
    try {
      console.log("📥 Loading subtitles for:", filePath);
      const { supabase } = await import("@/lib/supabase");

      // Get the video with subtitles
      const { data: videoData, error: videoError } = await supabase
        .from("videos")
        .select("subtitles")
        .eq("file_path", filePath)
        .single();

      if (videoError || !videoData) {
        console.log("ℹ️ No video found in database");
        return;
      }

      // Parse subtitles from JSON
      if (videoData.subtitles) {
        try {
          const parsedSubtitles = JSON.parse(videoData.subtitles);
          console.log("✅ Loaded subtitles:", parsedSubtitles.length);
          setSubtitles(parsedSubtitles);
        } catch (parseError) {
          console.error("❌ Error parsing subtitles:", parseError);
        }
      } else {
        console.log("ℹ️ No subtitles found for this video");
      }
    } catch (error) {
      console.error("💥 Error loading subtitles:", error);
    }
  };

  // Generate subtitles using Whisper
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

      // Save subtitles to database
      await saveSubtitlesToDatabase(videoId, data.subtitles);

      // Update the videos table with subtitles
      try {
        const { supabase } = await import("@/lib/supabase");
        const { error: updateError } = await supabase
          .from("videos")
          .update({ subtitles: JSON.stringify(data.subtitles) } as any)
          .eq("file_path", videoId);
        
        if (updateError) {
          console.error("Error updating videos table:", updateError);
        } else {
          console.log("✅ Subtitles saved to videos table");
        }
      } catch (error) {
        console.error("Error updating videos table:", error);
      }

      // Update subtitle display if video is playing
      if (playerRef.current && !playerRef.current.paused()) {
        const currentTime = playerRef.current.currentTime();
        if (currentTime !== null && currentTime !== undefined) {
          updateSubtitleDisplay(currentTime + subtitleOffset);
        }
      }

      // Reload video library to show CC badge
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

  // Save subtitles to database (now stored in videos table)
  const saveSubtitlesToDatabase = async (
    filePath: string,
    subtitles: Subtitle[]
  ) => {
    try {
      console.log("💾 Saving subtitles to database...");
      const { supabase } = await import("@/lib/supabase");

      // Update the videos table with subtitles
      const { error: updateError } = await supabase
        .from("videos")
        .update({ subtitles: JSON.stringify(subtitles) } as any)
        .eq("file_path", filePath);

      if (updateError) {
        console.error("❌ Error saving subtitles:", updateError);
      } else {
        console.log("✅ Subtitles saved successfully");
      }
    } catch (error) {
      console.error("💥 Error saving subtitles:", error);
    }
  };

  // Search subtitles
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = subtitles.filter((sub) =>
      sub.text.toLowerCase().includes(query)
    );
    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  }, [searchQuery, subtitles]);

  useEffect(() => {
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [handleSearch]);

  // Jump to subtitle
  const jumpToSubtitle = (subtitle: Subtitle) => {
    if (playerRef.current) {
      playerRef.current.currentTime(subtitle.start - subtitleOffset);
      setSearchQuery("");
      setShowSearchResults(false);
    }
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Seek controls
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

  const jumpTo = (time: number) => {
    if (playerRef.current) {
      const duration = playerRef.current.duration();
      if (duration !== null && duration !== undefined) {
        playerRef.current.currentTime(Math.max(0, Math.min(duration, time)));
      }
    }
  };

  const adjustSubtitleOffset = (seconds: number) => {
    setSubtitleOffset((prev) => prev + seconds);
  };

  return (
    <div className="space-y-6">
      {/* Video Library Grid */}
      {!videoUrl && !showUploadForm && (
        <div className="bg-[#FFF7E4] border-2 border-black p-6 shadow-[8px_8px_0px_#000] min-h-[75vh]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tight">Video Library</h2>
            <button
              onClick={() => setShowUploadForm(true)}
              className="px-6 py-3 bg-[#F4C430] border-2 border-black font-bold uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
            >
              Upload New Video
            </button>
          </div>

          {loadingVideos ? (
            <div className="bg-white border-2 border-black p-12 text-center shadow-[4px_4px_0px_#000]">
              <p className="text-gray-600 font-bold">Loading videos...</p>
            </div>
          ) : uploadedVideos.length === 0 ? (
            <div className="bg-white border-2 border-black p-12 text-center shadow-[4px_4px_0px_#000]">
              <p className="text-gray-600 font-bold mb-4">No videos uploaded yet</p>
              <button
                onClick={() => setShowUploadForm(true)}
                className="px-6 py-3 bg-[#F4C430] border-2 border-black font-bold uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
              >
                Upload Your First Video
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {uploadedVideos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => handleVideoSelect(video)}
                  className="bg-white border-2 border-black overflow-hidden cursor-pointer hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
                >
                  {/* Video Thumbnail */}
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

                  {/* Video Info */}
                  <div className="p-4 border-t-2 border-black">
                    <h3 className="font-bold text-gray-900 truncate mb-1">
                      {video.file_name}
                    </h3>
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

      {/* File Upload / YouTube */}
      {!videoUrl && showUploadForm && (
        <div className="bg-[#FFF7E4] border-2 border-black p-8 shadow-[8px_8px_0px_#000]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tight">Upload Video</h2>
            <button
              onClick={() => setShowUploadForm(false)}
              className="px-4 py-2 bg-white border-2 border-black font-bold hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
            >
              Back to Library
            </button>
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

      {/* Video Player */}
      {videoUrl && (
        <div className="space-y-6">
          {/* Video Container */}
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
                <p className="vjs-no-js">
                  To view this video please enable JavaScript, and consider
                  upgrading to a web browser that
                  <a
                    href="https://videojs.com/html5-video-support/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    supports HTML5 video
                  </a>
                  .
                </p>
              </video>
            </div>

            {/* Custom Subtitle Overlay */}
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

          {/* Control Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Controls */}
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Player Controls
              </h2>

              {/* Seconds Up/Down */}
              <div className="flex gap-4 items-center flex-wrap">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Seek Time:
                </label>
                <button
                  onClick={() => seek(-10)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-900 dark:text-white transition-colors"
                >
                  -10s
                </button>
                <button
                  onClick={() => seek(-5)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-900 dark:text-white transition-colors"
                >
                  -5s
                </button>
                <button
                  onClick={() => seek(5)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-900 dark:text-white transition-colors"
                >
                  +5s
                </button>
                <button
                  onClick={() => seek(10)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-900 dark:text-white transition-colors"
                >
                  +10s
                </button>
              </div>

              {/* Jump to Time */}
              <div className="flex gap-4 items-center flex-wrap">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Jump to Time:
                </label>
                <input
                  type="text"
                  placeholder="MM:SS"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const value = e.currentTarget.value;
                      const parts = value.split(":");
                      if (parts.length === 2) {
                        const mins = parseInt(parts[0], 10);
                        const secs = parseInt(parts[1], 10);
                        if (!isNaN(mins) && !isNaN(secs)) {
                          jumpTo(mins * 60 + secs);
                          e.currentTarget.value = "";
                        }
                      }
                    }
                  }}
                />
              </div>

              {/* Generate Subtitles */}
              {subtitles.length === 0 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Transcription Language:
                    </label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      disabled={isGeneratingSubtitles}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                    >
                      <option value="auto">Auto-detect</option>
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="it">Italian</option>
                      <option value="pt">Portuguese</option>
                      <option value="ru">Russian</option>
                      <option value="ja">Japanese</option>
                      <option value="ko">Korean</option>
                      <option value="zh">Chinese</option>
                      <option value="ar">Arabic</option>
                      <option value="hi">Hindi</option>
                      <option value="tr">Turkish</option>
                      <option value="pl">Polish</option>
                      <option value="nl">Dutch</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="translate"
                      checked={translateToEnglish}
                      onChange={(e) =>
                        setTranslateToEnglish(e.target.checked)
                      }
                      disabled={isGeneratingSubtitles}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label
                      htmlFor="translate"
                      className="text-sm text-gray-700 dark:text-gray-300"
                    >
                      Translate to English
                    </label>
                  </div>

                  <button
                    onClick={generateSubtitles}
                    disabled={isGeneratingSubtitles}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                  >
                    {isGeneratingSubtitles
                      ? "Generating Subtitles with Local Whisper..."
                      : "Generate Subtitles"}
                  </button>
                </div>
              )}

              {subtitles.length > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    ✓ Subtitles loaded ({subtitles.length} segments)
                  </p>
                </div>
              )}

              {/* Change Video */}
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
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
              >
                Back to Library
              </button>
            </div>

            {/* Subtitle Controls */}
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Subtitle Settings
              </h2>

              {/* Font Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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

              {/* Font Family */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Font Family:
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                >
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Georgia">Georgia</option>
                </select>
              </div>

              {/* Subtitle Offset */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subtitle Timing Offset: {subtitleOffset > 0 ? "+" : ""}
                  {subtitleOffset.toFixed(1)}s
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => adjustSubtitleOffset(-1)}
                    className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-900 dark:text-white transition-colors"
                  >
                    -1s
                  </button>
                  <button
                    onClick={() => adjustSubtitleOffset(-0.5)}
                    className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-900 dark:text-white transition-colors"
                  >
                    -0.5s
                  </button>
                  <button
                    onClick={() => adjustSubtitleOffset(0.5)}
                    className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-900 dark:text-white transition-colors"
                  >
                    +0.5s
                  </button>
                  <button
                    onClick={() => adjustSubtitleOffset(1)}
                    className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-900 dark:text-white transition-colors"
                  >
                    +1s
                  </button>
                </div>
                <button
                  onClick={() => setSubtitleOffset(0)}
                  className="w-full mt-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-900 dark:text-white transition-colors"
                >
                  Reset Offset
                </button>
              </div>
            </div>
          </div>

          {/* Search */}
          {subtitles.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Search Subtitles
              </h2>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in subtitles..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white mb-4"
              />

              {showSearchResults && searchResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      onClick={() => jumpToSubtitle(result)}
                      className="p-3 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        {formatTime(result.start)} -{" "}
                        {formatTime(result.end)}
                      </div>
                      <div className="text-gray-900 dark:text-white">
                        {result.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400">
                  No results found
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
