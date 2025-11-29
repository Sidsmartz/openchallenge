"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import VideoTab from "@/components/hub/VideoTab";
import NotesTab from "@/components/hub/NotesTab";
import MindmapTab from "@/components/hub/MindmapTab";

type TabType = "videos" | "notes" | "mindmap";

export default function HubPage() {
  const [activeTab, setActiveTab] = useState<TabType>("videos");
  const router = useRouter();

  useEffect(() => {
    checkApprovalStatus();
    
    // Check for tab query parameter
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as TabType;
    if (tab && ['videos', 'notes', 'mindmap'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  const checkApprovalStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('approval_status, role')
        .eq('id', user.id)
        .single();

      if (userData && userData.role === 'alumni' && userData.approval_status !== 'approved') {
        router.push('/pending');
      }
    } catch (error) {
      console.error('Error checking approval status:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#9DC4AA] flex">
      <Sidebar />
      <div className="flex-1 sm:ml-56 pt-20 sm:pt-0 py-4 sm:py-8 px-3 sm:px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4 sm:mb-6 uppercase tracking-tight">Learning Hub</h1>

          {/* Tab Navigation */}
          <div className="bg-[#FFF7E4] border-2 border-black mb-4 sm:mb-6 p-1 sm:p-2 flex gap-1 sm:gap-2 shadow-[4px_4px_0px_#000] sm:shadow-[8px_8px_0px_#000]">
            <button
              onClick={() => setActiveTab("videos")}
              className={`flex-1 px-3 sm:px-6 py-2 sm:py-3 border-2 border-black font-bold text-xs sm:text-sm uppercase tracking-wider transition-all ${
                activeTab === "videos"
                  ? "bg-[#F4C430] shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000] translate-x-[-1px] translate-y-[-1px] sm:translate-x-[-2px] sm:translate-y-[-2px]"
                  : "bg-white hover:translate-x-[-1px] hover:translate-y-[-1px] sm:hover:translate-x-[-2px] sm:hover:translate-y-[-2px] hover:shadow-[2px_2px_0px_#000] sm:hover:shadow-[4px_4px_0px_#000]"
              }`}
            >
              Videos
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`flex-1 px-3 sm:px-6 py-2 sm:py-3 border-2 border-black font-bold text-xs sm:text-sm uppercase tracking-wider transition-all ${
                activeTab === "notes"
                  ? "bg-[#F4C430] shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000] translate-x-[-1px] translate-y-[-1px] sm:translate-x-[-2px] sm:translate-y-[-2px]"
                  : "bg-white hover:translate-x-[-1px] hover:translate-y-[-1px] sm:hover:translate-x-[-2px] sm:hover:translate-y-[-2px] hover:shadow-[2px_2px_0px_#000] sm:hover:shadow-[4px_4px_0px_#000]"
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab("mindmap")}
              className={`flex-1 px-3 sm:px-6 py-2 sm:py-3 border-2 border-black font-bold text-xs sm:text-sm uppercase tracking-wider transition-all ${
                activeTab === "mindmap"
                  ? "bg-[#F4C430] shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000] translate-x-[-1px] translate-y-[-1px] sm:translate-x-[-2px] sm:translate-y-[-2px]"
                  : "bg-white hover:translate-x-[-1px] hover:translate-y-[-1px] sm:hover:translate-x-[-2px] sm:hover:translate-y-[-2px] hover:shadow-[2px_2px_0px_#000] sm:hover:shadow-[4px_4px_0px_#000]"
              }`}
            >
              Mindmap
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === "videos" && <VideoTab />}
            {activeTab === "notes" && <NotesTab />}
            {activeTab === "mindmap" && <MindmapTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
