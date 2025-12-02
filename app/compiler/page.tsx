'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import CodeMirror from '@uiw/react-codemirror';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { java } from '@codemirror/lang-java';
import axios from 'axios';
import { Toaster, toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import { Play, Copy, Users, Share2, X, Code } from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Prevent static generation
export const dynamic = 'force-dynamic';

interface Participant {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  cursor_position: { x: number; y: number } | null;
  color: string;
}

const languages = {
  '54': { name: 'C++', mode: cpp() },
  '50': { name: 'C', mode: cpp() },
  '62': { name: 'Java', mode: java() },
  '71': { name: 'Python', mode: python() },
  '63': { name: 'JavaScript', mode: javascript() },
};

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

export default function CollaborativeCompiler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionCode = searchParams.get('session');
  
  const [user, setUser] = useState<any>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('54');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [showShareModal, setShowShareModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [myColor, setMyColor] = useState('');
  const updateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isRemoteUpdate = useRef(false);
  const heartbeatRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastCursorRef = useRef<{ x: number; y: number } | null>(null);
  const cursorThrottleRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user && sessionCode) {
      joinSession(sessionCode);
    }

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [user, sessionCode]);

  // Track mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const cursorPos = { x: e.clientX, y: e.clientY };
      lastCursorRef.current = cursorPos;

      // Throttle cursor updates to every 50ms
      if (!cursorThrottleRef.current) {
        cursorThrottleRef.current = setTimeout(() => {
          if (channelRef.current && user) {
            // Broadcast cursor position
            channelRef.current.send({
              type: 'broadcast',
              event: 'cursor-update',
              payload: {
                user_id: user.id,
                cursor_position: cursorPos,
              },
            });

            // Update presence
            channelRef.current.track({
              user_id: user.id,
              full_name: user.user_metadata?.full_name || user.email,
              avatar_url: user.user_metadata?.avatar_url,
              cursor_position: cursorPos,
              color: myColor,
              online_at: new Date().toISOString(),
            });
          }
          cursorThrottleRef.current = undefined;
        }, 50);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (cursorThrottleRef.current) {
        clearTimeout(cursorThrottleRef.current);
      }
    };
  }, [user, myColor]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);
  };

  const generateSessionCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createSession = async () => {
    try {
      const code = generateSessionCode();
      const { data, error } = await (supabase as any)
        .from('code_sessions')
        .insert({
          session_code: code,
          creator_id: user.id,
          language_id: language,
          code_content: '',
        })
        .select()
        .single();

      if (error) throw error;

      setSessionId(data.id);
      setIsCreator(true);
      router.push(`/compiler?session=${code}`);
      await joinAsParticipant(data.id);
      subscribeToSession(data.id);
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    }
  };

  const joinSession = async (code: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('code_sessions')
        .select('*')
        .eq('session_code', code)
        .single();

      if (error) throw error;

      setSessionId(data.id);
      setCode(data.code_content || '');
      setLanguage(data.language_id);
      setIsCreator(data.creator_id === user.id);
      
      await joinAsParticipant(data.id);
      subscribeToSession(data.id);
    } catch (error) {
      console.error('Error joining session:', error);
      toast.error('Session not found');
      router.push('/compiler');
    }
  };

  const joinAsParticipant = async (sessionId: string) => {
    try {
      await (supabase as any)
        .from('session_participants')
        .upsert({
          session_id: sessionId,
          user_id: user.id,
          last_seen: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error joining as participant:', error);
    }
  };

  const subscribeToSession = (sessionId: string) => {
    // Assign a color to this user
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    setMyColor(color);

    // Create a single channel for all real-time updates
    const channel = supabase.channel(`session-${sessionId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: user.id },
      },
    });

    // Track presence (who's online)
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const participantsMap = new Map<string, Participant>();
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            participantsMap.set(presence.user_id, {
              user_id: presence.user_id,
              full_name: presence.full_name,
              avatar_url: presence.avatar_url,
              cursor_position: presence.cursor_position,
              color: presence.color,
            });
          });
        });
        
        setParticipants(participantsMap);
      })
      // Listen for code updates from other users
      .on('broadcast', { event: 'code-update' }, ({ payload }) => {
        if (payload.user_id !== user.id) {
          isRemoteUpdate.current = true;
          setCode(payload.code);
        }
      })
      // Listen for language changes
      .on('broadcast', { event: 'language-update' }, ({ payload }) => {
        if (payload.user_id !== user.id) {
          setLanguage(payload.language);
        }
      })
      // Listen for cursor updates
      .on('broadcast', { event: 'cursor-update' }, ({ payload }) => {
        if (payload.user_id !== user.id) {
          setParticipants((prev) => {
            const newMap = new Map(prev);
            const participant = newMap.get(payload.user_id);
            if (participant) {
              newMap.set(payload.user_id, {
                ...participant,
                cursor_position: payload.cursor_position,
              });
            }
            return newMap;
          });
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track this user's presence
          await channel.track({
            user_id: user.id,
            full_name: user.user_metadata?.full_name || user.email,
            avatar_url: user.user_metadata?.avatar_url,
            cursor_position: lastCursorRef.current,
            color,
            online_at: new Date().toISOString(),
          });

          // Send heartbeat every 10 seconds to keep presence alive
          heartbeatRef.current = setInterval(() => {
            channel.track({
              user_id: user.id,
              full_name: user.user_metadata?.full_name || user.email,
              avatar_url: user.user_metadata?.avatar_url,
              cursor_position: lastCursorRef.current,
              color,
              online_at: new Date().toISOString(),
            });
          }, 10000);
        }
      });

    channelRef.current = channel;

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      channel.unsubscribe();
    };
  };



  const updateCode = async (newCode: string) => {
    // Skip if this is a remote update
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    setCode(newCode);

    // Broadcast to other users immediately
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'code-update',
        payload: { code: newCode, user_id: user.id },
      });
    }

    // Debounce database update
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(async () => {
      if (sessionId) {
        try {
          await (supabase as any)
            .from('code_sessions')
            .update({ code_content: newCode, updated_at: new Date().toISOString() })
            .eq('id', sessionId);
        } catch (error) {
          console.error('Error updating code:', error);
        }
      }
    }, 1000);
  };

  const updateLanguage = async (newLanguage: string) => {
    setLanguage(newLanguage);
    
    // Broadcast to other users
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'language-update',
        payload: { language: newLanguage, user_id: user.id },
      });
    }

    if (sessionId && isCreator) {
      try {
        await (supabase as any)
          .from('code_sessions')
          .update({ language_id: newLanguage })
          .eq('id', sessionId);
      } catch (error) {
        console.error('Error updating language:', error);
      }
    }
  };

  const executeCode = async () => {
    const apiKey = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
    
    if (!apiKey) {
      toast.error('RapidAPI key not configured. Please add NEXT_PUBLIC_RAPIDAPI_KEY to your .env file');
      setOutput('Error: RapidAPI key not configured.\n\nTo use code execution:\n1. Sign up at https://rapidapi.com/judge0-official/api/judge0-ce\n2. Get your API key\n3. Add NEXT_PUBLIC_RAPIDAPI_KEY=your_key to .env file');
      return;
    }

    setLoading(true);
    setOutput('');

    try {
      const response = await axios.post(
        'https://judge0-ce.p.rapidapi.com/submissions',
        {
          source_code: code,
          language_id: language,
          stdin: '',
        },
        {
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
          },
        }
      );

      const token = response.data.token;

      const pollResult = setInterval(async () => {
        const result = await axios.get(
          `https://judge0-ce.p.rapidapi.com/submissions/${token}`,
          {
            headers: {
              'X-RapidAPI-Key': apiKey,
              'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
            },
          }
        );

        if (result.data.status.description === 'Accepted') {
          setOutput(result.data.stdout || 'No output');
          setLoading(false);
          clearInterval(pollResult);
        } else if (
          result.data.status.description === 'Time limit exceeded' ||
          result.data.status.description === 'Memory limit exceeded'
        ) {
          setOutput('Code execution exceeded limits');
          setLoading(false);
          clearInterval(pollResult);
        } else if (
          result.data.status.description === 'Compilation Error' ||
          result.data.status.description === 'Runtime Error'
        ) {
          setOutput(result.data.stderr || 'Error executing code');
          setLoading(false);
          clearInterval(pollResult);
        }
      }, 2000);
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.response?.data?.message || error.message || 'Error executing code';
      setOutput(`Error: ${errorMsg}`);
      toast.error('Failed to execute code');
      setLoading(false);
    }
  };

  const copySessionLink = () => {
    const link = `${window.location.origin}/compiler?session=${sessionCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Session link copied!');
  };

  const handleJoinSession = () => {
    if (!joinCode.trim()) {
      toast.error('Please enter a session code');
      return;
    }
    setShowJoinModal(false);
    router.push(`/compiler?session=${joinCode.trim().toUpperCase()}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] flex">
      <Sidebar />
      <Toaster position="top-right" richColors />

      <div className="flex-1 ml-56 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white border-2 border-black rounded-lg p-4 mb-4 shadow-[4px_4px_0px_#000]">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Collaborative Compiler</h1>
              
              <div className="flex items-center gap-3">
                {/* Participants */}
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span className="font-medium">{participants.size}</span>
                  <div className="flex -space-x-2">
                    {Array.from(participants.values()).slice(0, 5).map((participant) => (
                      <div
                        key={participant.user_id}
                        className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: participant.color }}
                        title={participant.full_name}
                      >
                        {participant.full_name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Session Actions */}
                {!sessionCode && (
                  <div className="flex gap-2">
                    <button
                      onClick={createSession}
                      className="px-4 py-2 bg-green-600 text-white rounded border-2 border-black hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      New Session
                    </button>
                    <button
                      onClick={() => setShowJoinModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded border-2 border-black hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      Join Session
                    </button>
                  </div>
                )}

                {/* Share Button */}
                {sessionCode && (
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded border-2 border-black hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                )}
              </div>
            </div>

            {sessionCode && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-gray-600">Session Code:</span>
                <code className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono">
                  {sessionCode}
                </code>
                <button
                  onClick={copySessionLink}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Copy link"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Welcome Screen - No Session */}
          {!sessionCode && (
            <div className="bg-white border-2 border-black rounded-lg p-12 shadow-[4px_4px_0px_#000] text-center">
              <div className="max-w-md mx-auto space-y-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto border-2 border-black">
                  <Code className="w-10 h-10 text-green-600" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold mb-2">Collaborative Code Editor</h2>
                  <p className="text-gray-600">
                    Code together in real-time with your friends. See their cursors, share code instantly, and compile together!
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={createSession}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg border-2 border-black hover:bg-green-700 transition-colors font-bold flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Create New Session
                  </button>
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg border-2 border-black hover:bg-blue-700 transition-colors font-bold flex items-center justify-center gap-2"
                  >
                    <Users className="w-5 h-5" />
                    Join Existing Session
                  </button>
                </div>

                <div className="pt-6 border-t-2 border-gray-200">
                  <h3 className="font-bold mb-3">Supported Languages</h3>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {Object.entries(languages).map(([id, lang]) => (
                      <span key={id} className="px-3 py-1 bg-gray-100 border border-gray-300 rounded text-sm">
                        {lang.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Editor Section */}
          {sessionCode && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              {/* Language Selector */}
              <div className="bg-white border-2 border-black rounded-lg p-4 shadow-[4px_4px_0px_#000]">
                <label className="block text-sm font-medium mb-2">Language</label>
                <select
                  className="w-full p-2 border-2 border-black rounded"
                  onChange={(e) => updateLanguage(e.target.value)}
                  value={language}
                  disabled={!isCreator}
                >
                  {Object.entries(languages).map(([id, lang]) => (
                    <option key={id} value={id}>
                      {lang.name}
                    </option>
                  ))}
                </select>
                {!isCreator && (
                  <p className="text-xs text-gray-600 mt-1">Only the session creator can change the language</p>
                )}
              </div>

              {/* Code Editor */}
              <div className="bg-white border-2 border-black rounded-lg overflow-hidden shadow-[4px_4px_0px_#000]">
                <CodeMirror
                  value={code}
                  height="400px"
                  theme={dracula}
                  extensions={[languages[language as keyof typeof languages]?.mode]}
                  onChange={(value) => updateCode(value)}
                />
              </div>

              {/* Run Button */}
              <button
                className="w-full p-3 bg-green-600 text-white rounded-lg border-2 border-black hover:bg-green-700 transition-colors font-bold flex items-center justify-center gap-2"
                onClick={executeCode}
                disabled={loading}
              >
                <Play className="w-5 h-5" />
                {loading ? 'Running...' : 'Run Code'}
              </button>
            </div>

            {/* Output Section */}
            <div className="bg-white border-2 border-black rounded-lg p-4 shadow-[4px_4px_0px_#000]">
              <h3 className="text-lg font-bold mb-3">Output</h3>
              <pre className="p-3 bg-gray-900 text-green-400 rounded font-mono text-sm min-h-[400px] overflow-auto">
                {output || 'Output will appear here...'}
              </pre>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Global Cursor Overlays */}
      <div className="fixed inset-0 pointer-events-none z-[10000]">
        {Array.from(participants.values())
          .filter(p => p.user_id !== user?.id && p.cursor_position)
          .map((participant) => (
            <div
              key={participant.user_id}
              className="absolute transition-all duration-100 ease-linear"
              style={{
                left: `${participant.cursor_position!.x}px`,
                top: `${participant.cursor_position!.y}px`,
                transform: 'translate(-2px, -2px)',
              }}
            >
              {/* Cursor SVG */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
              >
                <path
                  d="M5.65376 12.3673L8.97017 15.6837L11.8586 19.4674C12.2234 19.9311 12.9753 19.6694 12.9753 19.0479V3.95214C12.9753 3.33063 12.2234 3.06895 11.8586 3.53264L5.65376 11.0426C5.38962 11.3803 5.38962 11.8897 5.65376 12.3673Z"
                  fill={participant.color}
                  stroke="white"
                  strokeWidth="1.5"
                />
              </svg>
              
              {/* Name Label */}
              <div
                className="absolute top-5 left-5 px-2 py-1 rounded text-xs font-bold text-white whitespace-nowrap shadow-lg"
                style={{ backgroundColor: participant.color }}
              >
                {participant.full_name}
              </div>
            </div>
          ))}
      </div>

      {/* Join Session Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black rounded-lg p-6 max-w-md w-full shadow-[8px_8px_0px_#000]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Join Session</h2>
              <button onClick={() => setShowJoinModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Enter Session Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinSession()}
                  placeholder="e.g., ABC123"
                  className="w-full p-3 border-2 border-black rounded font-mono text-lg uppercase"
                  maxLength={6}
                  autoFocus
                />
              </div>

              <p className="text-sm text-gray-600">
                Enter the 6-character code shared by your collaborator to join their coding session.
              </p>

              <button
                onClick={handleJoinSession}
                className="w-full px-4 py-3 bg-green-600 text-white rounded border-2 border-black hover:bg-green-700 font-bold"
              >
                Join Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black rounded-lg p-6 max-w-md w-full shadow-[8px_8px_0px_#000]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Share Session</h2>
              <button onClick={() => setShowShareModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Session Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sessionCode || ''}
                    readOnly
                    className="flex-1 p-2 border-2 border-black rounded font-mono"
                  />
                  <button
                    onClick={copySessionLink}
                    className="px-4 py-2 bg-blue-600 text-white rounded border-2 border-black hover:bg-blue-700"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Share Link</label>
                <input
                  type="text"
                  value={`${window.location.origin}/compiler?session=${sessionCode}`}
                  readOnly
                  className="w-full p-2 border-2 border-black rounded text-sm"
                />
              </div>

              <p className="text-sm text-gray-600">
                Share this link with others to collaborate in real-time!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
