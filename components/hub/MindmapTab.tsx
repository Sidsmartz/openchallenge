"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
import { toPng } from "html-to-image";
import "reactflow/dist/style.css";
import { Brain, Play } from "lucide-react";

interface MindmapNode {
  id: string;
  label: string;
  type: "main" | "topic" | "subtopic" | "detail";
  timestamp?: number;
}

interface MindmapEdge {
  from: string;
  to: string;
}

interface MindmapData {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
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

function MindmapFlow() {
  const [videoId, setVideoId] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    screenX: number;
    screenY: number;
  } | null>(null);
  const [videosWithSubtitles, setVideosWithSubtitles] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();

  // Load videos with subtitles on mount
  useEffect(() => {
    loadVideosWithSubtitles();
  }, []);

  const loadVideosWithSubtitles = async () => {
    try {
      setLoadingVideos(true);
      const { supabase } = await import("@/lib/supabase");
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .not("subtitles", "is", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading videos:", error);
      } else {
        setVideosWithSubtitles((data || []) as unknown as VideoItem[]);
      }
    } catch (error) {
      console.error("Error loading videos:", error);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleVideoSelect = async (video: VideoItem) => {
    setSelectedVideo(video);
    setVideoId(video.file_path);
    await handleGenerate(video.file_path);
  };

  const getNodeStyle = (type: string) => {
    switch (type) {
      case "main":
        return {
          background: "#3b82f6",
          color: "white",
          border: "2px solid #2563eb",
          borderRadius: "12px",
          padding: "20px",
          fontSize: "18px",
          fontWeight: "bold",
          width: 250,
        };
      case "topic":
        return {
          background: "#10b981",
          color: "white",
          border: "2px solid #059669",
          borderRadius: "10px",
          padding: "15px",
          fontSize: "16px",
          fontWeight: "600",
          width: 200,
        };
      case "subtopic":
        return {
          background: "#f59e0b",
          color: "white",
          border: "2px solid #d97706",
          borderRadius: "8px",
          padding: "12px",
          fontSize: "14px",
          width: 180,
        };
      case "detail":
        return {
          background: "#8b5cf6",
          color: "white",
          border: "2px solid #7c3aed",
          borderRadius: "8px",
          padding: "10px",
          fontSize: "13px",
          width: 160,
        };
      default:
        return {
          background: "#6b7280",
          color: "white",
          border: "2px solid #4b5563",
          borderRadius: "8px",
          padding: "10px",
          width: 150,
        };
    }
  };

  const layoutNodes = (mindmapData: MindmapData): { nodes: Node[]; edges: Edge[] } => {
    const nodeMap = new Map<string, MindmapNode>();
    mindmapData.nodes.forEach((node) => nodeMap.set(node.id, node));

    // Build hierarchy
    const children = new Map<string, string[]>();
    mindmapData.edges.forEach((edge) => {
      if (!children.has(edge.from)) {
        children.set(edge.from, []);
      }
      children.get(edge.from)!.push(edge.to);
    });

    // Find root (node with no incoming edges)
    const hasParent = new Set(mindmapData.edges.map((e) => e.to));
    const roots = mindmapData.nodes.filter((n) => !hasParent.has(n.id));
    const root = roots[0] || mindmapData.nodes[0];

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    const levelHeight = 150;
    const nodeSpacing = 50;

    const processNode = (
      nodeId: string,
      level: number,
      xOffset: number,
      parentWidth: number
    ): number => {
      const node = nodeMap.get(nodeId);
      if (!node) return xOffset;

      const childIds = children.get(nodeId) || [];
      const childCount = childIds.length;

      let currentX = xOffset;
      const nodeWidth = 200;

      if (childCount > 0) {
        // Process children first to calculate total width
        let childrenWidth = 0;
        const childPositions: number[] = [];

        childIds.forEach((childId) => {
          childPositions.push(currentX);
          const width = processNode(childId, level + 1, currentX, nodeWidth);
          childrenWidth += width;
          currentX += width + nodeSpacing;
        });

        // Center parent over children
        const totalChildrenWidth = childrenWidth + (childCount - 1) * nodeSpacing;
        const parentX = childPositions[0] + (totalChildrenWidth - nodeWidth) / 2;

        flowNodes.push({
          id: nodeId,
          data: { label: node.label },
          position: { x: parentX, y: level * levelHeight },
          style: getNodeStyle(node.type),
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });

        return totalChildrenWidth;
      } else {
        // Leaf node
        flowNodes.push({
          id: nodeId,
          data: { label: node.label },
          position: { x: xOffset, y: level * levelHeight },
          style: getNodeStyle(node.type),
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });

        return nodeWidth;
      }
    };

    processNode(root.id, 0, 100, 200);

    // Create edges
    mindmapData.edges.forEach((edge) => {
      flowEdges.push({
        id: `${edge.from}-${edge.to}`,
        source: edge.from,
        target: edge.to,
        type: "smoothstep",
        animated: true,
        style: { stroke: "#94a3b8", strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#94a3b8",
        },
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  };

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...params, animated: true, style: { stroke: "#94a3b8", strokeWidth: 2 } },
          eds
        )
      ),
    [setEdges]
  );

  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();

    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!bounds) return;

    setContextMenu({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      screenX: event.clientX,
      screenY: event.clientY,
    });
  }, []);

  const addNodeAtPosition = (type: "main" | "topic" | "subtopic" | "detail") => {
    if (!contextMenu) return;

    const position = project({ x: contextMenu.x, y: contextMenu.y });

    const newNode: Node = {
      id: `custom-${Date.now()}`,
      data: { label: "New Node" },
      position,
      style: getNodeStyle(type),
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    };

    setNodes((nds) => [...nds, newNode]);
    setContextMenu(null);
  };

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const onNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const newLabel = prompt("Edit node text:", node.data.label);
      if (newLabel !== null && newLabel.trim()) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id ? { ...n, data: { ...n.data, label: newLabel.trim() } } : n
          )
        );
      }
    },
    [setNodes]
  );

  useEffect(() => {
    if (contextMenu) {
      document.addEventListener("click", closeContextMenu);
      return () => document.removeEventListener("click", closeContextMenu);
    }
  }, [contextMenu, closeContextMenu]);

  const exportAsImage = useCallback(() => {
    if (reactFlowWrapper.current === null) {
      return;
    }

    toPng(reactFlowWrapper.current, {
      backgroundColor: "#ffffff",
      width: reactFlowWrapper.current.offsetWidth,
      height: reactFlowWrapper.current.offsetHeight,
    })
      .then((dataUrl) => {
        const a = document.createElement("a");
        a.setAttribute("download", `mindmap-${Date.now()}.png`);
        a.setAttribute("href", dataUrl);
        a.click();
      })
      .catch((err) => {
        console.error("Error exporting image:", err);
        alert("Failed to export image");
      });
  }, []);

  const handleGenerate = async (videoIdToUse?: string) => {
    const idToUse = videoIdToUse || videoId;
    
    if (!idToUse.trim()) {
      setError("Please select a video");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-mindmap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videoId: idToUse.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate mindmap");
      }

      const data = await response.json();
      const { nodes: flowNodes, edges: flowEdges } = layoutNodes(data.mindmap);

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Video Library or Mindmap View */}
      {!selectedVideo ? (
        <div className="bg-[#FFF7E4] border-2 border-black p-6 shadow-[8px_8px_0px_#000] min-h-[75vh]">
          <div className="mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-2">
              Select a Video to Generate Mindmap
            </h2>
            <p className="text-sm text-gray-600 font-medium">
              Choose from videos with subtitles to create an interactive mindmap
            </p>
          </div>

          {loadingVideos ? (
            <div className="bg-white border-2 border-black p-12 text-center shadow-[4px_4px_0px_#000]">
              <p className="text-gray-600 font-bold">Loading videos...</p>
            </div>
          ) : videosWithSubtitles.length === 0 ? (
            <div className="bg-white border-2 border-black p-12 text-center shadow-[4px_4px_0px_#000]">
              <div className="w-24 h-24 bg-[#E9D5FF] border-2 border-black rounded-full flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_#000]">
                <Brain className="h-12 w-12 text-black" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight mb-2">
                No Videos with Subtitles
              </h3>
              <p className="text-gray-600 font-medium mb-4">
                Upload a video and generate subtitles first on the Videos tab to create mindmaps
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videosWithSubtitles.map((video) => (
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
                      <div className="w-16 h-16 bg-[#E9D5FF] border-2 border-black flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Brain className="w-8 h-8 text-black" />
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-1 bg-[#E9D5FF] border border-black text-xs font-bold uppercase tracking-wider">
                      MINDMAP
                    </div>
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
                        {Math.floor(video.duration / 60)}:
                        {String(Math.floor(video.duration % 60)).padStart(2, "0")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Back Button and Video Info */}
          <div className="bg-[#FFF7E4] border-2 border-black p-6 shadow-[8px_8px_0px_#000]">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setSelectedVideo(null);
                    setVideoId("");
                    setNodes([]);
                    setEdges([]);
                    setError(null);
                  }}
                  className="px-4 py-2 bg-white border-2 border-black font-bold hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
                >
                  ← Back to Videos
                </button>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">
                    {selectedVideo.file_name}
                  </h2>
                  <p className="text-sm text-gray-600 font-medium">
                    {loading ? "Generating mindmap..." : "Interactive Mindmap"}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-[#FEE2E2] border-2 border-black shadow-[4px_4px_0px_#000]">
                <p className="text-red-800 font-bold">{error}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Export Button */}
      {selectedVideo && nodes.length > 0 && (
        <div className="bg-[#FFF7E4] border-2 border-black p-4 flex justify-between items-center shadow-[8px_8px_0px_#000]">
          <p className="text-sm text-gray-600 font-medium">
            <strong className="font-black">Tip:</strong> Right-click on canvas to add nodes • Drag to connect • Double-click
            nodes to edit
          </p>
          <button
            onClick={exportAsImage}
            className="px-6 py-2 bg-[#E9D5FF] border-2 border-black font-bold uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
          >
            Export as Image
          </button>
        </div>
      )}

      {/* Mindmap Visualization */}
      {selectedVideo && nodes.length > 0 && (
        <div
          ref={reactFlowWrapper}
          className="bg-white border-2 border-black shadow-[8px_8px_0px_#000] overflow-hidden relative"
          style={{ height: "700px" }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onPaneContextMenu={onPaneContextMenu}
            onNodeDoubleClick={onNodeDoubleClick}
            fitView
            attributionPosition="bottom-left"
          >
            <Background />
            <Controls />
          </ReactFlow>

          {/* Context Menu */}
          {contextMenu && (
            <div
              style={{
                position: "absolute",
                top:
                  contextMenu.screenY -
                  (reactFlowWrapper.current?.getBoundingClientRect().top || 0),
                left:
                  contextMenu.screenX -
                  (reactFlowWrapper.current?.getBoundingClientRect().left || 0),
                zIndex: 1000,
              }}
              className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-[180px]"
            >
              <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Add Node
              </div>
              <button
                onClick={() => addNodeAtPosition("main")}
                className="w-full px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-900 dark:text-white flex items-center gap-2"
              >
                <div className="w-3 h-3 rounded" style={{ background: "#3b82f6" }}></div>
                Main Topic
              </button>
              <button
                onClick={() => addNodeAtPosition("topic")}
                className="w-full px-4 py-2 text-left hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-900 dark:text-white flex items-center gap-2"
              >
                <div className="w-3 h-3 rounded" style={{ background: "#10b981" }}></div>
                Key Topic
              </button>
              <button
                onClick={() => addNodeAtPosition("subtopic")}
                className="w-full px-4 py-2 text-left hover:bg-orange-50 dark:hover:bg-orange-900/20 text-gray-900 dark:text-white flex items-center gap-2"
              >
                <div className="w-3 h-3 rounded" style={{ background: "#f59e0b" }}></div>
                Subtopic
              </button>
              <button
                onClick={() => addNodeAtPosition("detail")}
                className="w-full px-4 py-2 text-left hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-900 dark:text-white flex items-center gap-2"
              >
                <div className="w-3 h-3 rounded" style={{ background: "#8b5cf6" }}></div>
                Detail
              </button>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      {selectedVideo && nodes.length > 0 && (
        <div className="bg-[#FFF7E4] border-2 border-black p-6 shadow-[8px_8px_0px_#000]">
          <h2 className="text-lg font-black uppercase tracking-tight mb-4">Legend</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-black" style={{ background: "#3b82f6" }}></div>
              <span className="text-sm text-gray-700 font-bold">Main Topic</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-black" style={{ background: "#10b981" }}></div>
              <span className="text-sm text-gray-700 font-bold">Key Topic</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-black" style={{ background: "#f59e0b" }}></div>
              <span className="text-sm text-gray-700 font-bold">Subtopic</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-black" style={{ background: "#8b5cf6" }}></div>
              <span className="text-sm text-gray-700 font-bold">Detail</span>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {selectedVideo && loading && nodes.length === 0 && (
        <div className="bg-white border-2 border-black p-12 text-center shadow-[8px_8px_0px_#000]">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-bold">Generating mindmap from video subtitles...</p>
        </div>
      )}
    </div>
  );
}

export default function MindmapTab() {
  return (
    <ReactFlowProvider>
      <MindmapFlow />
    </ReactFlowProvider>
  );
}
