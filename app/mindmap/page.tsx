'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
  Panel,
} from 'reactflow';
import { toPng } from 'html-to-image';
import 'reactflow/dist/style.css';
import Sidebar from '@/components/Sidebar';

interface MindmapNode {
  id: string;
  label: string;
  type: 'main' | 'topic' | 'subtopic' | 'detail';
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

function MindmapFlow() {
  const [videoId, setVideoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; screenX: number; screenY: number } | null>(null);
  const [newNodeText, setNewNodeText] = useState('');
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project, getViewport } = useReactFlow();

  const getNodeStyle = (type: string) => {
    switch (type) {
      case 'main':
        return {
          background: '#3b82f6',
          color: 'white',
          border: '2px solid #2563eb',
          borderRadius: '12px',
          padding: '20px',
          fontSize: '18px',
          fontWeight: 'bold',
          width: 250,
        };
      case 'topic':
        return {
          background: '#10b981',
          color: 'white',
          border: '2px solid #059669',
          borderRadius: '10px',
          padding: '15px',
          fontSize: '16px',
          fontWeight: '600',
          width: 200,
        };
      case 'subtopic':
        return {
          background: '#f59e0b',
          color: 'white',
          border: '2px solid #d97706',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '14px',
          width: 180,
        };
      case 'detail':
        return {
          background: '#8b5cf6',
          color: 'white',
          border: '2px solid #7c3aed',
          borderRadius: '8px',
          padding: '10px',
          fontSize: '13px',
          width: 160,
        };
      default:
        return {
          background: '#6b7280',
          color: 'white',
          border: '2px solid #4b5563',
          borderRadius: '8px',
          padding: '10px',
          width: 150,
        };
    }
  };

  const layoutNodes = (mindmapData: MindmapData): { nodes: Node[]; edges: Edge[] } => {
    const nodeMap = new Map<string, MindmapNode>();
    mindmapData.nodes.forEach(node => nodeMap.set(node.id, node));

    // Build hierarchy
    const children = new Map<string, string[]>();
    mindmapData.edges.forEach(edge => {
      if (!children.has(edge.from)) {
        children.set(edge.from, []);
      }
      children.get(edge.from)!.push(edge.to);
    });

    // Find root (node with no incoming edges)
    const hasParent = new Set(mindmapData.edges.map(e => e.to));
    const roots = mindmapData.nodes.filter(n => !hasParent.has(n.id));
    const root = roots[0] || mindmapData.nodes[0];

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    let yOffset = 0;
    const levelHeight = 150;
    const nodeSpacing = 50;

    const processNode = (nodeId: string, level: number, xOffset: number, parentWidth: number): number => {
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

        childIds.forEach((childId, index) => {
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
    mindmapData.edges.forEach(edge => {
      flowEdges.push({
        id: `${edge.from}-${edge.to}`,
        source: edge.from,
        target: edge.to,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#94a3b8',
        },
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 } }, eds)),
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

  const addNodeAtPosition = (type: 'main' | 'topic' | 'subtopic' | 'detail') => {
    if (!contextMenu) return;

    const position = project({ x: contextMenu.x, y: contextMenu.y });
    
    const newNode: Node = {
      id: `custom-${Date.now()}`,
      data: { label: 'New Node' },
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

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    const newLabel = prompt('Edit node text:', node.data.label);
    if (newLabel !== null && newLabel.trim()) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id
            ? { ...n, data: { ...n.data, label: newLabel.trim() } }
            : n
        )
      );
    }
  }, [setNodes]);

  useEffect(() => {
    if (contextMenu) {
      document.addEventListener('click', closeContextMenu);
      return () => document.removeEventListener('click', closeContextMenu);
    }
  }, [contextMenu, closeContextMenu]);

  const exportAsImage = useCallback(() => {
    if (reactFlowWrapper.current === null) {
      return;
    }

    toPng(reactFlowWrapper.current, {
      backgroundColor: '#ffffff',
      width: reactFlowWrapper.current.offsetWidth,
      height: reactFlowWrapper.current.offsetHeight,
    })
      .then((dataUrl) => {
        const a = document.createElement('a');
        a.setAttribute('download', `mindmap-${Date.now()}.png`);
        a.setAttribute('href', dataUrl);
        a.click();
      })
      .catch((err) => {
        console.error('Error exporting image:', err);
        alert('Failed to export image');
      });
  }, []);

  const handleGenerate = async () => {
    if (!videoId.trim()) {
      setError('Please enter a video ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-mindmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId: videoId.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate mindmap');
      }

      const data = await response.json();
      const { nodes: flowNodes, edges: flowEdges } = layoutNodes(data.mindmap);
      
      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#9DC4AA] flex">
      <Sidebar />
      <div className="flex-1 ml-48 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Video Transcript Mindmap
          </h1>

          {/* Input Section */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 mb-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label
                  htmlFor="video-id"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Video ID (from uploaded video)
                </label>
                <input
                  id="video-id"
                  type="text"
                  value={videoId}
                  onChange={(e) => setVideoId(e.target.value)}
                  placeholder="Enter video ID..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-zinc-800 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={loading || !videoId.trim()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 
                         disabled:bg-gray-400 disabled:cursor-not-allowed
                         text-white font-medium rounded-lg transition-colors"
              >
                {loading ? 'Generating...' : 'Generate Mindmap'}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Tip:</strong> Upload a video and generate subtitles first on the Video page, 
                then use the video ID here to create an interactive mindmap of the content.
              </p>
            </div>
          </div>

          {/* Export Button */}
          {nodes.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 mb-6 flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Tip:</strong> Right-click on canvas to add nodes • Drag to connect • Double-click nodes to edit
              </p>
              <button
                onClick={exportAsImage}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 
                         text-white font-medium rounded-lg transition-colors"
              >
                Export as Image
              </button>
            </div>
          )}

          {/* Mindmap Visualization */}
          {nodes.length > 0 && (
            <div ref={reactFlowWrapper} className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg overflow-hidden relative" style={{ height: '700px' }}>
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
                    position: 'absolute',
                    top: contextMenu.screenY - (reactFlowWrapper.current?.getBoundingClientRect().top || 0),
                    left: contextMenu.screenX - (reactFlowWrapper.current?.getBoundingClientRect().left || 0),
                    zIndex: 1000,
                  }}
                  className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-[180px]"
                >
                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Add Node
                  </div>
                  <button
                    onClick={() => addNodeAtPosition('main')}
                    className="w-full px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-900 dark:text-white flex items-center gap-2"
                  >
                    <div className="w-3 h-3 rounded" style={{ background: '#3b82f6' }}></div>
                    Main Topic
                  </button>
                  <button
                    onClick={() => addNodeAtPosition('topic')}
                    className="w-full px-4 py-2 text-left hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-900 dark:text-white flex items-center gap-2"
                  >
                    <div className="w-3 h-3 rounded" style={{ background: '#10b981' }}></div>
                    Key Topic
                  </button>
                  <button
                    onClick={() => addNodeAtPosition('subtopic')}
                    className="w-full px-4 py-2 text-left hover:bg-orange-50 dark:hover:bg-orange-900/20 text-gray-900 dark:text-white flex items-center gap-2"
                  >
                    <div className="w-3 h-3 rounded" style={{ background: '#f59e0b' }}></div>
                    Subtopic
                  </button>
                  <button
                    onClick={() => addNodeAtPosition('detail')}
                    className="w-full px-4 py-2 text-left hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-900 dark:text-white flex items-center gap-2"
                  >
                    <div className="w-3 h-3 rounded" style={{ background: '#8b5cf6' }}></div>
                    Detail
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Legend */}
          {nodes.length > 0 && (
            <div className="mt-6 bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Legend</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: '#3b82f6' }}></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Main Topic</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: '#10b981' }}></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Key Topic</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: '#f59e0b' }}></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Subtopic</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: '#8b5cf6' }}></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Detail</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MindmapPage() {
  return (
    <ReactFlowProvider>
      <MindmapFlow />
    </ReactFlowProvider>
  );
}
