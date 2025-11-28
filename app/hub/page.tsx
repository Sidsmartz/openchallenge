"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import VideoTab from "@/components/hub/VideoTab";
import NotesTab from "@/components/hub/NotesTab";
import MindmapTab from "@/components/hub/MindmapTab";

type TabType = "videos" | "notes" | "mindmap";

export default function HubPage() {
  const [activeTab, setActiveTab] = useState<TabType>("videos");

  return (
    <div className="min-h-screen bg-[#9DC4AA] flex">
      <Sidebar />
      <div className="flex-1 ml-56 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-black text-gray-900 mb-6 uppercase tracking-tight">Learning Hub</h1>

          {/* Tab Navigation */}
          <div className="bg-[#FFF7E4] border-2 border-black mb-6 p-2 flex gap-2 shadow-[8px_8px_0px_#000]">
            <button
              onClick={() => setActiveTab("videos")}
              className={`flex-1 px-6 py-3 border-2 border-black font-bold uppercase tracking-wider transition-all ${
                activeTab === "videos"
                  ? "bg-[#F4C430] shadow-[4px_4px_0px_#000] translate-x-[-2px] translate-y-[-2px]"
                  : "bg-white hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000]"
              }`}
            >
              Videos
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`flex-1 px-6 py-3 border-2 border-black font-bold uppercase tracking-wider transition-all ${
                activeTab === "notes"
                  ? "bg-[#F4C430] shadow-[4px_4px_0px_#000] translate-x-[-2px] translate-y-[-2px]"
                  : "bg-white hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000]"
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab("mindmap")}
              className={`flex-1 px-6 py-3 border-2 border-black font-bold uppercase tracking-wider transition-all ${
                activeTab === "mindmap"
                  ? "bg-[#F4C430] shadow-[4px_4px_0px_#000] translate-x-[-2px] translate-y-[-2px]"
                  : "bg-white hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000]"
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
