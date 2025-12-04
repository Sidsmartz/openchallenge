"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { Play, Upload as UploadIcon, Tag, X, Search, BookOpen } from "lucide-react";
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
  const [fontSize, setFontSize] = useState(24);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [subtitleSearchQuery, setSubtitleSearchQuery] = useState("");
  const [subtitleSearchResults, setSubtitleSearchResults] = useState<any[]>([]);
  const [showSubtitleSearch, setShowSubtitleSearch] = useState(false);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);
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
  
  // Translation states
  const [isTranslating, setIsTranslating] = useState(false);
  const [originalSubtitles, setOriginalSubtitles] = useState<Subtitle[]>([]);
  const [currentSubtitleLanguage, setCurrentSubtitleLanguage] =
    useState<string>("original");
  const [generatedLanguages, setGeneratedLanguages] = useState<Set<string>>(
    new Set(["original"])
  );
  const [hindiSubtitles, setHindiSubtitles] = useState<Subtitle[]>([]);
  const [teluguSubtitles, setTeluguSubtitles] = useState<Subtitle[]>([]);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState<string | null>(null);

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
      
      // Check if there's a video to auto-load from home page
      const autoLoadVideoData = localStorage.getItem('autoLoadVideo');
      if (autoLoadVideoData) {
        try {
          const videoData = JSON.parse(autoLoadVideoData);
          localStorage.removeItem('autoLoadVideo');
          // Use setTimeout to ensure component is fully mounted
          setTimeout(() => {
            handleVideoSelect(videoData as VideoItem);
          }, 100);
        } catch (error) {
          console.error('Error auto-loading video:', error);
        }
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

    const languages = new Set<string>(["original"]);

    if (video.subtitles) {
      try {
        const parsedSubtitles = JSON.parse(video.subtitles);
        setSubtitles(parsedSubtitles);
        setOriginalSubtitles(parsedSubtitles);
        setCurrentSubtitleLanguage("original");
      } catch (error) {
        console.error("Error parsing subtitles:", error);
        setSubtitles([]);
        setOriginalSubtitles([]);
      }
    } else {
      setSubtitles([]);
      setOriginalSubtitles([]);
    }

    // Load translated subtitles if they exist
    try {
      const { data: videoDetails } = await supabase
        .from("videos")
        .select("subtitles_hindi, subtitles_telugu")
        .eq("id", video.id)
        .single();

      if (videoDetails && (videoDetails as any).subtitles_hindi) {
        const parsedHindi = JSON.parse((videoDetails as any).subtitles_hindi);
        setHindiSubtitles(parsedHindi);
        languages.add("hi");
      } else {
        setHindiSubtitles([]);
      }

      if (videoDetails && (videoDetails as any).subtitles_telugu) {
        const parsedTelugu = JSON.parse((videoDetails as any).subtitles_telugu);
        setTeluguSubtitles(parsedTelugu);
        languages.add("te");
      } else {
        setTeluguSubtitles([]);
      }
    } catch (error) {
      console.error("Error loading translated subtitles:", error);
    }

    setGeneratedLanguages(languages);

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
        .select("subtitles, subtitles_hindi, subtitles_telugu")
        .eq("file_path", filePath)
        .single();

      if (videoError || !videoData) {
        return;
      }

      const languages = new Set<string>(["original"]);

      if ((videoData as any).subtitles) {
        try {
          const parsedSubtitles = JSON.parse((videoData as any).subtitles);
          setSubtitles(parsedSubtitles);
          setOriginalSubtitles(parsedSubtitles);
          setCurrentSubtitleLanguage("original");
        } catch (parseError) {
          console.error("❌ Error parsing subtitles:", parseError);
        }
      }

      if ((videoData as any).subtitles_hindi) {
        try {
          const parsedHindi = JSON.parse((videoData as any).subtitles_hindi);
          setHindiSubtitles(parsedHindi);
          languages.add("hi");
        } catch (parseError) {
          console.error("❌ Error parsing Hindi subtitles:", parseError);
        }
      }

      if ((videoData as any).subtitles_telugu) {
        try {
          const parsedTelugu = JSON.parse((videoData as any).subtitles_telugu);
          setTeluguSubtitles(parsedTelugu);
          languages.add("te");
        } catch (parseError) {
          console.error("❌ Error parsing Telugu subtitles:", parseError);
        }
      }

      setGeneratedLanguages(languages);
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
      setOriginalSubtitles(data.subtitles); // Store original for translation
      setCurrentSubtitleLanguage("original");

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
          updateSubtitleDisplay(currentTime);
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

  // Generate translated subtitles
  const generateTranslatedSubtitles = async (targetLanguage: "hi" | "te", forceRegenerate = false) => {
    if (originalSubtitles.length === 0) {
      alert("No subtitles to translate. Generate subtitles first.");
      return;
    }

    if (generatedLanguages.has(targetLanguage) && !forceRegenerate) {
      // Already generated, just switch to it
      switchSubtitleLanguage(targetLanguage);
      return;
    }

    setIsTranslating(true);
    setShowRegenerateConfirm(null);

    try {
      const response = await fetch("/api/translate-subtitles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subtitles: originalSubtitles,
          targetLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to translate subtitles");
      }

      const data = await response.json();
      
      // Store translated subtitles
      if (targetLanguage === "hi") {
        setHindiSubtitles(data.subtitles);
      } else {
        setTeluguSubtitles(data.subtitles);
      }
      
      setGeneratedLanguages(new Set([...generatedLanguages, targetLanguage]));
      setSubtitles(data.subtitles);
      setCurrentSubtitleLanguage(targetLanguage);

      // Save to database
      if (videoId) {
        try {
          const columnName = targetLanguage === "hi" ? "subtitles_hindi" : "subtitles_telugu";
          const { error: updateError } = await supabase
            .from("videos")
            .update({ [columnName]: JSON.stringify(data.subtitles) } as any)
            .eq("file_path", videoId);
          
          if (updateError) {
            console.error("Error saving translated subtitles:", updateError);
          } else {
            console.log(`✅ ${targetLanguage === "hi" ? "Hindi" : "Telugu"} subtitles saved to database`);
          }
        } catch (error) {
          console.error("Error saving translated subtitles:", error);
        }
      }

      // Update subtitle display if video is playing
      if (playerRef.current && !playerRef.current.paused()) {
        const currentTime = playerRef.current.currentTime();
        if (currentTime !== null && currentTime !== undefined) {
          updateSubtitleDisplay(currentTime);
        }
      }
    } catch (error) {
      console.error("Error translating subtitles:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to generate translated subtitles. Please try again."
      );
    } finally {
      setIsTranslating(false);
    }
  };

  // Switch between generated subtitle languages
  const switchSubtitleLanguage = (language: string) => {
    if (language === "original") {
      setSubtitles(originalSubtitles);
    } else if (language === "hi" && hindiSubtitles.length > 0) {
      setSubtitles(hindiSubtitles);
    } else if (language === "te" && teluguSubtitles.length > 0) {
      setSubtitles(teluguSubtitles);
    }
    setCurrentSubtitleLanguage(language);
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

  // Update Video.js text track for fullscreen support
  useEffect(() => {
    const player = playerRef.current;
    if (!player || subtitles.length === 0) return;

    // Remove existing text tracks
    const tracks = player.remoteTextTracks();
    const trackArray = Array.from(tracks as any);
    trackArray.forEach((track: any) => {
      player.removeRemoteTextTrack(track);
    });

    // Create VTT content from subtitles
    const vttContent = subtitles.map((sub, index) => {
      const startTime = formatVTTTime(sub.start);
      const endTime = formatVTTTime(sub.end);
      return `${index + 1}\n${startTime} --> ${endTime}\n${sub.text}\n`;
    }).join('\n');

    // Create blob URL for VTT
    const vttBlob = new Blob([`WEBVTT\n\n${vttContent}`], { type: 'text/vtt' });
    const vttUrl = URL.createObjectURL(vttBlob);

    // Add text track
    player.addRemoteTextTrack({
      kind: 'subtitles',
      label: currentSubtitleLanguage === 'hi' ? 'Hindi' : currentSubtitleLanguage === 'te' ? 'Telugu' : 'English',
      srclang: currentSubtitleLanguage === 'hi' ? 'hi' : currentSubtitleLanguage === 'te' ? 'te' : 'en',
      src: vttUrl,
      mode: 'showing'
    }, false);

    return () => {
      URL.revokeObjectURL(vttUrl);
    };
  }, [subtitles, currentSubtitleLanguage]);

  // Helper function to format time for VTT
  const formatVTTTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  // Apply custom styling to Video.js text tracks
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    // Style the text track display
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .video-js .vjs-text-track-display {
        font-size: ${fontSize}px !important;
      }
      .video-js .vjs-text-track-cue {
        background-color: rgba(0, 0, 0, 0.8) !important;
        padding: 0.5em 1em !important;
        border-radius: 0.5em !important;
        font-weight: bold !important;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3) !important;
      }
    `;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, [fontSize]);

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

  const handleSubtitleSearch = useCallback(() => {
    if (!subtitleSearchQuery.trim() || subtitles.length === 0) {
      setSubtitleSearchResults([]);
      return;
    }

    const query = subtitleSearchQuery.toLowerCase();
    const results = subtitles
      .map((subtitle, index) => ({ ...subtitle, index }))
      .filter((subtitle) => subtitle.text.toLowerCase().includes(query));
    
    setSubtitleSearchResults(results);
  }, [subtitleSearchQuery, subtitles]);

  const jumpToSubtitle = (timestamp: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime(timestamp);
      playerRef.current.play();
    }
  };

  const generateFlashcards = async () => {
    if (subtitles.length === 0) {
      alert("No subtitles available. Please generate subtitles first.");
      return;
    }

    setIsGeneratingFlashcards(true);
    try {
      const response = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subtitles }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate flashcards");
      }

      const data = await response.json();
      setFlashcards(data.flashcards);
      setShowFlashcards(true);
      setCurrentFlashcardIndex(0);
      setShowFlashcardAnswer(false);
    } catch (error) {
      console.error("Error generating flashcards:", error);
      alert("Failed to generate flashcards. Please try again.");
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  const nextFlashcard = () => {
    if (currentFlashcardIndex < flashcards.length - 1) {
      setCurrentFlashcardIndex(currentFlashcardIndex + 1);
      setShowFlashcardAnswer(false);
    }
  };

  const previousFlashcard = () => {
    if (currentFlashcardIndex > 0) {
      setCurrentFlashcardIndex(currentFlashcardIndex - 1);
      setShowFlashcardAnswer(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [handleSearch]);

  useEffect(() => {
    const timer = setTimeout(handleSubtitleSearch, 300);
    return () => clearTimeout(timer);
  }, [handleSubtitleSearch]);

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



  if (!userRole) {
    return (
      <div className="bg-[#FFF7E4] border-2 border-black p-12 text-center shadow-[8px_8px_0px_#000] min-h-[75vh]">
        <p className="text-gray-600 font-bold">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Video Library Grid */}
      {!videoUrl && !showUploadForm && (
        <div className="bg-[#FFF7E4] border-2 border-black p-3 sm:p-4 md:p-6 shadow-[4px_4px_0px_#000] sm:shadow-[8px_8px_0px_#000] min-h-[75vh]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
              {userRole === "faculty" ? "My Videos" : "Video Library"}
            </h2>
            {userRole === "faculty" && (
              <button
                onClick={() => setShowUploadForm(true)}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-[#F4C430] border-2 border-black font-bold text-sm sm:text-base uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[2px_2px_0px_#000] sm:hover:shadow-[4px_4px_0px_#000] transition-all"
              >
                Upload New Video
              </button>
            )}
          </div>

          {/* Tag Filter for Students */}
          {userRole === "student" && allTags.length > 0 && (
            <div className="mb-4 sm:mb-6">
              <label className="block text-xs sm:text-sm font-bold mb-2 uppercase tracking-wider">
                Filter by Tag:
              </label>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                <button
                  onClick={() => setSelectedTagFilter(null)}
                  className={`px-3 sm:px-4 py-1 sm:py-2 border-2 border-black font-bold text-xs sm:text-sm uppercase tracking-wider transition-all ${
                    selectedTagFilter === null
                      ? "bg-[#6B9BD1] text-white shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000] translate-x-[-1px] translate-y-[-1px] sm:translate-x-[-2px] sm:translate-y-[-2px]"
                      : "bg-white hover:translate-x-[-1px] hover:translate-y-[-1px] sm:hover:translate-x-[-2px] sm:hover:translate-y-[-2px] hover:shadow-[2px_2px_0px_#000] sm:hover:shadow-[4px_4px_0px_#000]"
                  }`}
                >
                  All
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTagFilter(tag)}
                    className={`px-3 sm:px-4 py-1 sm:py-2 border-2 border-black font-bold text-xs sm:text-sm uppercase tracking-wider transition-all ${
                      selectedTagFilter === tag
                        ? "bg-[#6B9BD1] text-white shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000] translate-x-[-1px] translate-y-[-1px] sm:translate-x-[-2px] sm:translate-y-[-2px]"
                        : "bg-white hover:translate-x-[-1px] hover:translate-y-[-1px] sm:hover:translate-x-[-2px] sm:hover:translate-y-[-2px] hover:shadow-[2px_2px_0px_#000] sm:hover:shadow-[4px_4px_0px_#000]"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loadingVideos ? (
            <div className="bg-white border-2 border-black p-6 sm:p-12 text-center shadow-[4px_4px_0px_#000]">
              <p className="text-sm sm:text-base text-gray-600 font-bold">Loading videos...</p>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="bg-white border-2 border-black p-6 sm:p-12 text-center shadow-[4px_4px_0px_#000]">
              <p className="text-sm sm:text-base text-gray-600 font-bold mb-3 sm:mb-4">
                {userRole === "faculty" 
                  ? "No videos uploaded yet" 
                  : selectedTagFilter 
                    ? `No videos found with tag "${selectedTagFilter}"` 
                    : "No videos available yet"}
              </p>
              {userRole === "faculty" && (
                <button
                  onClick={() => setShowUploadForm(true)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-[#F4C430] border-2 border-black font-bold text-sm sm:text-base uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[2px_2px_0px_#000] sm:hover:shadow-[4px_4px_0px_#000] transition-all"
                >
                  Upload Your First Video
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
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
          <div className="bg-[#FFF7E4] border-2 border-black p-6 shadow-[8px_8px_0px_#000]">
            <div
              className="bg-black overflow-hidden relative w-full"
              style={{ aspectRatio: "16/9" }}
            >
              <div data-vjs-player className="w-full h-full">
                <video
                  ref={videoRef}
                  className="video-js vjs-big-play-centered w-full h-full"
                  playsInline
                >
                  <source src={videoUrl} type="video/mp4" />
                </video>
              </div>


            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_#000]">
                <h2 className="text-xl font-bold mb-4 uppercase tracking-tight">
                  Controls
                </h2>

                {userRole === "faculty" && (
                  <div className="space-y-4 mb-6 pb-6 border-b-2 border-gray-200">
                    {/* Language Selector - Show first if subtitles exist */}
                    {generatedLanguages.size > 1 && (
                      <div>
                        <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                          Subtitle Language
                        </label>
                        <select
                          value={currentSubtitleLanguage}
                          onChange={(e) => switchSubtitleLanguage(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-black bg-white font-bold uppercase tracking-wider"
                        >
                          <option value="original">English (Original)</option>
                          {generatedLanguages.has("hi") && (
                            <option value="hi">Hindi (हिंदी)</option>
                          )}
                          {generatedLanguages.has("te") && (
                            <option value="te">Telugu (తెలుగు)</option>
                          )}
                        </select>
                      </div>
                    )}

                    {/* Subtitle Status */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">
                        Subtitle Status
                      </h3>
                      
                      {/* Original Subtitles */}
                      {subtitles.length === 0 ? (
                        <button
                          onClick={generateSubtitles}
                          disabled={isGeneratingSubtitles}
                          className="w-full px-4 py-2 bg-[#6B9BD1] text-white border-2 border-black font-bold uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                        >
                          {isGeneratingSubtitles
                            ? "Generating..."
                            : "Generate English Subtitles"}
                        </button>
                      ) : (
                        <div className="p-3 bg-green-50 border-2 border-green-500">
                          <p className="text-sm text-green-800 font-bold">
                            ✓ English Subtitles Available
                          </p>
                        </div>
                      )}

                      {/* Hindi Subtitles */}
                      {subtitles.length > 0 && (
                        <>
                          {generatedLanguages.has("hi") ? (
                            <div className="space-y-2">
                              <div className="p-3 bg-purple-50 border-2 border-purple-500 flex items-center justify-between">
                                <p className="text-sm text-purple-800 font-bold">
                                  ✓ Hindi Subtitles Available
                                </p>
                                <button
                                  onClick={() => setShowRegenerateConfirm("hi")}
                                  className="text-xs px-2 py-1 bg-purple-600 text-white border border-black font-bold hover:bg-purple-700"
                                >
                                  Regenerate
                                </button>
                              </div>
                              {showRegenerateConfirm === "hi" && (
                                <div className="p-3 bg-yellow-50 border-2 border-yellow-500">
                                  <p className="text-xs text-yellow-800 font-bold mb-2">
                                    Are you sure you want to regenerate Hindi subtitles?
                                  </p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => generateTranslatedSubtitles("hi", true)}
                                      disabled={isTranslating}
                                      className="flex-1 px-3 py-1 bg-red-600 text-white border border-black font-bold text-xs hover:bg-red-700 disabled:bg-gray-400"
                                    >
                                      Yes, Regenerate
                                    </button>
                                    <button
                                      onClick={() => setShowRegenerateConfirm(null)}
                                      className="flex-1 px-3 py-1 bg-gray-600 text-white border border-black font-bold text-xs hover:bg-gray-700"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => generateTranslatedSubtitles("hi")}
                              disabled={isTranslating}
                              className="w-full px-4 py-2 bg-purple-600 text-white border-2 border-black font-bold uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                            >
                              {isTranslating ? "Generating..." : "Generate Hindi Subtitles"}
                            </button>
                          )}

                          {/* Telugu Subtitles */}
                          {generatedLanguages.has("te") ? (
                            <div className="space-y-2">
                              <div className="p-3 bg-indigo-50 border-2 border-indigo-500 flex items-center justify-between">
                                <p className="text-sm text-indigo-800 font-bold">
                                  ✓ Telugu Subtitles Available
                                </p>
                                <button
                                  onClick={() => setShowRegenerateConfirm("te")}
                                  className="text-xs px-2 py-1 bg-indigo-600 text-white border border-black font-bold hover:bg-indigo-700"
                                >
                                  Regenerate
                                </button>
                              </div>
                              {showRegenerateConfirm === "te" && (
                                <div className="p-3 bg-yellow-50 border-2 border-yellow-500">
                                  <p className="text-xs text-yellow-800 font-bold mb-2">
                                    Are you sure you want to regenerate Telugu subtitles?
                                  </p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => generateTranslatedSubtitles("te", true)}
                                      disabled={isTranslating}
                                      className="flex-1 px-3 py-1 bg-red-600 text-white border border-black font-bold text-xs hover:bg-red-700 disabled:bg-gray-400"
                                    >
                                      Yes, Regenerate
                                    </button>
                                    <button
                                      onClick={() => setShowRegenerateConfirm(null)}
                                      className="flex-1 px-3 py-1 bg-gray-600 text-white border border-black font-bold text-xs hover:bg-gray-700"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => generateTranslatedSubtitles("te")}
                              disabled={isTranslating}
                              className="w-full px-4 py-2 bg-indigo-600 text-white border-2 border-black font-bold uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                            >
                              {isTranslating ? "Generating..." : "Generate Telugu Subtitles"}
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {isTranslating && (
                      <div className="p-3 bg-blue-50 border-2 border-blue-500">
                        <p className="text-sm text-blue-800 font-bold">
                          ⏳ Generating translation...
                        </p>
                      </div>
                    )}
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
                    setSubtitleSearchQuery("");
                    setSubtitleSearchResults([]);
                    setShowSubtitleSearch(false);
                    setFlashcards([]);
                    setShowFlashcards(false);
                  }}
                  className="w-full px-4 py-2 bg-white border-2 border-black font-bold uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
                >
                  Back to Library
                </button>
              </div>

              {/* Subtitle Search - Both Faculty and Students */}
              {subtitles.length > 0 && (
                <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_#000]">
                  <h2 className="text-xl font-bold mb-4 uppercase tracking-tight">
                    Search in Video
                  </h2>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={subtitleSearchQuery}
                      onChange={(e) => setSubtitleSearchQuery(e.target.value)}
                      placeholder="Search subtitles to jump to timestamp..."
                      className="w-full px-4 py-3 border-2 border-black bg-white font-medium focus:outline-none focus:shadow-[4px_4px_0px_#000] transition-all"
                    />
                    
                    {subtitleSearchResults.length > 0 && (
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {subtitleSearchResults.map((result, idx) => (
                          <div
                            key={idx}
                            onClick={() => jumpToSubtitle(result.start)}
                            className="p-3 bg-[#FFF7E4] border-2 border-black cursor-pointer hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-sm font-bold text-[#6B9BD1]">
                                {formatTime(result.start)}
                              </span>
                              <span className="text-xs text-gray-500 font-medium">
                                Click to jump
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 font-medium">
                              {result.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {subtitleSearchQuery && subtitleSearchResults.length === 0 && (
                      <div className="p-4 bg-gray-50 border-2 border-gray-300 text-center">
                        <p className="text-sm text-gray-600 font-medium">
                          No results found for "{subtitleSearchQuery}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Flashcards - Students Only */}
              {userRole === "student" && subtitles.length > 0 && (
                <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_#000]">
                  <h2 className="text-xl font-bold mb-4 uppercase tracking-tight">
                    Study Flashcards
                  </h2>
                  
                  {!showFlashcards ? (
                    <button
                      onClick={generateFlashcards}
                      disabled={isGeneratingFlashcards}
                      className="w-full px-4 py-3 bg-[#A8D7B7] border-2 border-black font-bold uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                    >
                      {isGeneratingFlashcards
                        ? "Generating Flashcards..."
                        : "Generate Flashcards from Video"}
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-gray-600">
                          Card {currentFlashcardIndex + 1} of {flashcards.length}
                        </span>
                        <button
                          onClick={() => {
                            setShowFlashcards(false);
                            setFlashcards([]);
                            setCurrentFlashcardIndex(0);
                            setShowFlashcardAnswer(false);
                          }}
                          className="text-sm font-bold text-red-600 hover:text-red-800"
                        >
                          Close
                        </button>
                      </div>

                      <div className="min-h-[200px] p-6 bg-[#FFF7E4] border-2 border-black">
                        <div className="mb-4">
                          <h3 className="text-sm font-bold text-gray-600 mb-2 uppercase tracking-wider">
                            Question:
                          </h3>
                          <p className="text-lg font-bold text-gray-900">
                            {flashcards[currentFlashcardIndex]?.question}
                          </p>
                        </div>

                        {showFlashcardAnswer && (
                          <div className="mt-4 pt-4 border-t-2 border-black">
                            <h3 className="text-sm font-bold text-gray-600 mb-2 uppercase tracking-wider">
                              Answer:
                            </h3>
                            <p className="text-base text-gray-800 font-medium">
                              {flashcards[currentFlashcardIndex]?.answer}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {!showFlashcardAnswer ? (
                          <button
                            onClick={() => setShowFlashcardAnswer(true)}
                            className="flex-1 px-4 py-3 bg-[#6B9BD1] text-white border-2 border-black font-bold uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
                          >
                            Show Answer
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={previousFlashcard}
                              disabled={currentFlashcardIndex === 0}
                              className="flex-1 px-4 py-3 bg-white border-2 border-black font-bold uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] disabled:bg-gray-200 disabled:cursor-not-allowed transition-all"
                            >
                              Previous
                            </button>
                            <button
                              onClick={nextFlashcard}
                              disabled={currentFlashcardIndex === flashcards.length - 1}
                              className="flex-1 px-4 py-3 bg-[#F4C430] border-2 border-black font-bold uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] disabled:bg-gray-200 disabled:cursor-not-allowed transition-all"
                            >
                              Next
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_#000]">
              <h2 className="text-xl font-bold mb-4 uppercase tracking-tight">
                Settings
              </h2>

              <div className="space-y-4">
                {/* Language Selector for Students (if translations exist) */}
                {userRole === "student" && subtitles.length > 0 && generatedLanguages.size > 1 && (
                  <div>
                    <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                      Subtitle Language
                    </label>
                    <select
                      value={currentSubtitleLanguage}
                      onChange={(e) => switchSubtitleLanguage(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-black bg-white font-bold uppercase tracking-wider"
                    >
                      <option value="original">English (Original)</option>
                      {generatedLanguages.has("hi") && (
                        <option value="hi">Hindi (हिंदी)</option>
                      )}
                      {generatedLanguages.has("te") && (
                        <option value="te">Telugu (తెలుగు)</option>
                      )}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                    Subtitle Size: {fontSize}px
                  </label>
                  <input
                    type="range"
                    min="16"
                    max="36"
                    value={fontSize}
                    onChange={(e) =>
                      setFontSize(parseInt(e.target.value, 10))
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>Small</span>
                    <span>Large</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
