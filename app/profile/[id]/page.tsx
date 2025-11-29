'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Toaster, toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MessageCircle, Edit, Plus, X, Briefcase, Link as LinkIcon, Check, Github, Linkedin, Instagram, Facebook, Twitter, FileText } from 'lucide-react';

interface WorkExperience {
  id: string;
  title: string;
  company: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string;
}

interface Social {
  id: string;
  platform: string;
  url: string;
}

export default function ProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [workExperience, setWorkExperience] = useState<WorkExperience[]>([]);
  const [socials, setSocials] = useState<Social[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<any>({});
  const [showAddWork, setShowAddWork] = useState(false);
  const [showAddSocial, setShowAddSocial] = useState(false);
  const [newWork, setNewWork] = useState<any>({});
  const [newSocial, setNewSocial] = useState({ platform: '', url: '' });

  const SOCIAL_PLATFORMS = [
    { value: 'github', label: 'GitHub', icon: Github },
    { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
    { value: 'instagram', label: 'Instagram', icon: Instagram },
    { value: 'facebook', label: 'Facebook', icon: Facebook },
    { value: 'twitter', label: 'Twitter', icon: Twitter },
    { value: 'resume', label: 'Resume', icon: FileText },
  ];

  const getSocialIcon = (platform: string) => {
    const socialPlatform = SOCIAL_PLATFORMS.find(p => p.value === platform.toLowerCase());
    return socialPlatform ? socialPlatform.icon : LinkIcon;
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Load profile user
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      // If viewing own profile and no avatar_url, use OAuth avatar
      if (profile && user?.id === userId && !(profile as any).avatar_url && user.user_metadata?.avatar_url) {
        (profile as any).avatar_url = user.user_metadata.avatar_url;
      }

      setProfileUser(profile);
      setEditedProfile(profile);

      // Load work experience
      const { data: work } = await (supabase as any)
        .from('work_experience')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });

      setWorkExperience(work || []);

      // Load socials
      const { data: socialData } = await (supabase as any)
        .from('socials')
        .select('*')
        .eq('user_id', userId);

      setSocials(socialData || []);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
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
        router.push(`/chat?conversation=${data.conversationId}`);
      } else {
        toast.error('Failed to start chat');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    }
  };

  const handleSaveProfile = async () => {
    try {
      // Skills is an ARRAY type in database
      const skillsArray = typeof editedProfile.skills === 'string'
        ? editedProfile.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
        : (Array.isArray(editedProfile.skills) ? editedProfile.skills : []);

      // Interests is a TEXT type in database (comma-separated string)
      const interestsString = typeof editedProfile.interests === 'string'
        ? editedProfile.interests.trim()
        : (Array.isArray(editedProfile.interests) ? editedProfile.interests.join(', ') : '');

      // Ensure data is properly formatted
      const updateData = {
        bio: editedProfile.bio || null,
        skills: skillsArray,
        interests: interestsString || null,
        role: editedProfile.role || null,
      };

      console.log('Saving profile data:', updateData);

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast.success('Profile updated successfully');
      setIsEditing(false);
      await loadProfile(); // Wait for reload to complete
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleAddWork = async () => {
    try {
      const { error } = await (supabase as any)
        .from('work_experience')
        .insert({
          user_id: userId,
          ...newWork,
        });

      if (error) throw error;

      toast.success('Work experience added');
      setShowAddWork(false);
      setNewWork({});
      loadProfile();
    } catch (error) {
      console.error('Error adding work:', error);
      toast.error('Failed to add work experience');
    }
  };

  const handleDeleteWork = async (workId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('work_experience')
        .delete()
        .eq('id', workId);

      if (error) throw error;

      toast.success('Work experience deleted');
      loadProfile();
    } catch (error) {
      console.error('Error deleting work:', error);
      toast.error('Failed to delete work experience');
    }
  };

  const handleAddSocial = async () => {
    try {
      // Validate platform and URL
      if (!newSocial.platform) {
        toast.error('Please select a platform');
        return;
      }
      
      if (!newSocial.url) {
        toast.error('Please enter a URL');
        return;
      }

      // Basic URL validation
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlPattern.test(newSocial.url)) {
        toast.error('Please enter a valid URL');
        return;
      }

      // Check if platform already exists
      const existingSocial = socials.find(s => s.platform.toLowerCase() === newSocial.platform.toLowerCase());
      if (existingSocial) {
        toast.error('You already have a link for this platform');
        return;
      }

      const { error } = await (supabase as any)
        .from('socials')
        .insert({
          user_id: userId,
          platform: newSocial.platform,
          url: newSocial.url,
        });

      if (error) throw error;

      toast.success('Social link added');
      setShowAddSocial(false);
      setNewSocial({ platform: '', url: '' });
      loadProfile();
    } catch (error) {
      console.error('Error adding social:', error);
      toast.error('Failed to add social link');
    }
  };

  const handleDeleteSocial = async (socialId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('socials')
        .delete()
        .eq('id', socialId);

      if (error) throw error;

      toast.success('Social link deleted');
      loadProfile();
    } catch (error) {
      console.error('Error deleting social:', error);
      toast.error('Failed to delete social link');
    }
  };

  const isOwnProfile = currentUser?.id === userId;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex">
        <Sidebar />
        <Toaster position="top-right" />
        <div className="flex-1 sm:ml-56 pt-20 sm:pt-0 flex items-center justify-center p-4">
          <p className="text-sm sm:text-base text-gray-700">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex">
        <Sidebar />
        <Toaster position="top-right" />
        <div className="flex-1 sm:ml-56 pt-20 sm:pt-0 flex items-center justify-center p-4">
          <p className="text-sm sm:text-base text-gray-700">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] flex">
      <Sidebar />
      <Toaster position="top-right" richColors />

      <div className="flex-1 sm:ml-56 pt-20 sm:pt-0 p-3 sm:p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <button
              onClick={() => router.back()}
              className="p-1.5 sm:p-2 border-2 border-black rounded hover:bg-black hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Profile</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Left Column - Main Profile Card */}
            <div className="lg:col-span-1">
              {/* Main Profile Card */}
              <div className="bg-[#F4C430] border-2 sm:border-4 border-black rounded-lg p-4 sm:p-6 shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] sm:hover:translate-x-[-2px] sm:hover:translate-y-[-2px] hover:shadow-[3px_3px_0px_#000] sm:hover:shadow-[6px_6px_0px_#000] transition-all duration-200">
                <div className="flex flex-col items-center">
                  {profileUser.avatar_url ? (
                    <img
                      src={profileUser.avatar_url}
                      alt={profileUser.full_name}
                      className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 sm:border-4 border-black object-cover mb-3 sm:mb-4"
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 sm:border-4 border-black bg-blue-600 flex items-center justify-center text-white font-bold text-3xl sm:text-4xl mb-3 sm:mb-4">
                      {profileUser.full_name?.charAt(0).toUpperCase() || profileUser.email.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-1">
                    {profileUser.full_name || profileUser.email}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-700 mb-2 text-center break-all px-2">{profileUser.email}</p>

                  {profileUser.role && (
                    <span className="px-2 sm:px-3 py-1 bg-black text-white text-xs sm:text-sm rounded-full mb-3 sm:mb-4">
                      {profileUser.role.charAt(0).toUpperCase() + profileUser.role.slice(1)}
                    </span>
                  )}

                  {/* Mentorship Toggle for Alumni */}
                  {isOwnProfile && profileUser.role === 'alumni' && (
                    <div className="w-full mb-3 sm:mb-4 px-1 sm:px-2">
                      <div className="bg-white border-2 border-black rounded-lg p-2 sm:p-3 shadow-[2px_2px_0px_#000]">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-gray-900">Available for Mentorship</p>

                          </div>
                          <button
                            onClick={async () => {
                              try {
                                const newValue = !profileUser.available_for_mentorship;
                                const { error } = await supabase
                                  .from('users')
                                  .update({ available_for_mentorship: newValue })
                                  .eq('id', userId);

                                if (error) throw error;

                                setProfileUser({ ...profileUser, available_for_mentorship: newValue });
                                toast.success(newValue ? 'You are now available for mentorship' : 'Mentorship availability disabled');
                              } catch (error) {
                                console.error('Error updating mentorship status:', error);
                                toast.error('Failed to update mentorship status');
                              }
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full border-2 border-black transition-colors ${
                              profileUser.available_for_mentorship ? 'bg-[#A8D7B7]' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white border-2 border-black transition-transform ${
                                profileUser.available_for_mentorship ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* XP & Level */}
                  <div className="w-full mb-4 sm:mb-6 px-1 sm:px-2">
                    <div className="flex justify-between items-end mb-2">
                      <div className="text-center">
                        <span className="block text-xl sm:text-2xl font-black">
                          {profileUser.xp || 0}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-600">
                          XP
                        </span>
                      </div>

                      <div className="text-center">
                        <span className="block text-xl sm:text-2xl font-black">
                          Lvl {Math.floor((profileUser.xp || 0) / 100) + 1}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-600">
                          Level
                        </span>
                      </div>
                    </div>

                    {/* Stylish XP Bar */}
                    <div className="relative h-3 sm:h-4 bg-white border-2 border-black rounded-full shadow-[2px_2px_0px_#000] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-500 via-red-400 to-red-600 transition-all duration-500 shadow-[inset_0_0_6px_rgba(0,0,0,0.5)]"
                        style={{
                          width: `${((profileUser.xp || 0) % 100)}%`,
                        }}
                      />

                      {/* Metallic grid highlight */}
                      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,#000_6px,#000_12px)]" />
                    </div>

                    <p className="text-center text-[10px] sm:text-[11px] font-bold mt-1 text-gray-700">
                      {100 - ((profileUser.xp || 0) % 100)} XP to next level
                    </p>
                  </div>



                  {/* Socials */}
                  {socials.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4 justify-center">
                      {socials.map((social) => {
                        const Icon = getSocialIcon(social.platform);
                        return (
                          <a
                            key={social.id}
                            href={social.url.startsWith('http') ? social.url : `https://${social.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 sm:p-2 bg-white border-2 border-black rounded shadow-[2px_2px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] sm:hover:translate-x-[-2px] sm:hover:translate-y-[-2px] hover:shadow-[3px_3px_0px_#000] sm:hover:shadow-[4px_4px_0px_#000] transition-all"
                            title={`${social.platform}: ${social.url}`}
                          >
                            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="w-full space-y-1.5 sm:space-y-2">
                    {isOwnProfile ? (
                      <>
                        {isEditing && (
                          <button
                            onClick={handleSaveProfile}
                            className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-[#A8D7B7] border-2 border-black font-bold text-sm sm:text-base shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] sm:hover:translate-x-[-2px] sm:hover:translate-y-[-2px] hover:shadow-[3px_3px_0px_#000] sm:hover:shadow-[6px_6px_0px_#000] transition-all flex items-center justify-center gap-2 mb-1.5 sm:mb-2"
                          >
                            <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                            Save Changes
                          </button>
                        )}
                        <button
                          onClick={() => setIsEditing(!isEditing)}
                          className={`w-full px-3 sm:px-4 py-1.5 sm:py-2 rounded border-2 border-black font-bold text-sm sm:text-base shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] sm:hover:translate-x-[-2px] sm:hover:translate-y-[-2px] hover:shadow-[3px_3px_0px_#000] sm:hover:shadow-[6px_6px_0px_#000] transition-all flex items-center justify-center gap-2 ${isEditing ? 'bg-white hover:bg-gray-50' : 'bg-black text-white hover:bg-gray-800'}`}
                        >
                          <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleStartChat}
                        className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-black text-white text-sm sm:text-base rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Chat
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Skills, About/Interests, Social Links */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {/* Skills - Full Width */}
              <div className="bg-white border-2 border-black rounded-lg p-3 sm:p-4 shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000]">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="font-bold text-lg sm:text-xl">Skills</h3>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={Array.isArray(editedProfile.skills) ? editedProfile.skills.join(', ') : (typeof editedProfile.skills === 'string' ? editedProfile.skills : '')}
                    onChange={(e) => setEditedProfile({ ...editedProfile, skills: e.target.value })}
                    placeholder="JavaScript, React, Node.js..."
                    className="w-full px-3 py-2 border-2 border-black rounded text-sm"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profileUser.skills && Array.isArray(profileUser.skills) && profileUser.skills.length > 0 ? (
                      profileUser.skills.map((skill: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded border border-blue-300">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No skills added</p>
                    )}
                  </div>
                )}
              </div>

              {/* About and Interests Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* Bio */}
                <div className="bg-white border-2 border-black rounded-lg p-3 sm:p-4 shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] sm:hover:translate-x-[-2px] sm:hover:translate-y-[-2px] hover:shadow-[3px_3px_0px_#000] sm:hover:shadow-[6px_6px_0px_#000] transition-all">
                  <h3 className="font-bold text-base sm:text-lg mb-2">About</h3>
                  {isEditing ? (
                    <textarea
                      value={editedProfile.bio || ''}
                      onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      className="w-full px-3 py-2 border-2 border-black rounded text-sm"
                      rows={4}
                    />
                  ) : (
                    <p className="text-sm text-gray-700">{profileUser.bio || 'No bio yet'}</p>
                  )}
                </div>

                {/* Interests */}
                <div className="bg-white border-2 border-black rounded-lg p-3 sm:p-4 shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] sm:hover:translate-x-[-2px] sm:hover:translate-y-[-2px] hover:shadow-[3px_3px_0px_#000] sm:hover:shadow-[6px_6px_0px_#000] transition-all">
                  <h3 className="font-bold text-base sm:text-lg mb-2">Interests</h3>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile.interests || ''}
                      onChange={(e) => setEditedProfile({ ...editedProfile, interests: e.target.value })}
                      placeholder="Coding, Music, Travel..."
                      className="w-full px-3 py-2 border-2 border-black rounded text-sm"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {profileUser.interests && profileUser.interests.trim() ? (
                        profileUser.interests.split(',').map((interest: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded border border-green-300">
                            {interest.trim()}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No interests added</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Social Links Management - Now in smaller box */}
              {isOwnProfile && (
                <div className="bg-white border-2 border-black rounded-lg p-3 sm:p-4 shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000]">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <h3 className="font-bold text-lg sm:text-xl flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      Social Links
                    </h3>
                    <button
                      onClick={() => setShowAddSocial(true)}
                      className="px-2 sm:px-3 py-1 bg-black text-white text-xs sm:text-sm rounded hover:bg-gray-800 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                      Add
                    </button>
                  </div>

                  <div className="space-y-2">
                    {socials.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-2">No social links added</p>
                    ) : (
                      socials.map((social) => {
                        const Icon = getSocialIcon(social.platform);
                        return (
                          <div key={social.id} className="flex items-center justify-between border-2 border-black rounded p-2 bg-[#FFF7E4] shadow-[3px_3px_0px_#000] hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[6px_6px_0px_#000] transition-all duration-200">
                            <div className="flex items-center gap-3">
                              <Icon className="w-5 h-5" />
                              <div className="flex-1">
                                <span className="text-sm font-bold capitalize">{social.platform}</span>
                                <a 
                                  href={social.url.startsWith('http') ? social.url : `https://${social.url}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-xs text-blue-600 hover:underline block truncate max-w-xs"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {social.url}
                                </a>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteSocial(social.id)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
              {/* Work Experience */}
              <div className="bg-white border-2 border-black rounded-lg p-3 sm:p-4 shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000] overflow-visible">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="font-bold text-lg sm:text-xl flex items-center gap-2">
                    <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
                    Work Experience
                  </h3>
                  {isOwnProfile && (
                    <button
                      onClick={() => setShowAddWork(true)}
                      className="px-2 sm:px-3 py-1 bg-black text-white text-xs sm:text-sm rounded hover:bg-gray-800 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                      Add
                    </button>
                  )}
                </div>

                <div className="space-y-2 sm:space-y-3 overflow-visible">
                  {workExperience.length === 0 ? (
                    <p className="text-xs sm:text-sm text-gray-500 text-center py-3 sm:py-4">No work experience added</p>
                  ) : (
                    workExperience.map((work) => (
                      <div
                        key={work.id}
                        className="group border-2 border-black rounded p-2 sm:p-3 bg-[#FFF7E4] shadow-[2px_2px_0px_#000] cursor-pointer transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] sm:hover:translate-x-[-2px] sm:hover:translate-y-[-2px] hover:shadow-[3px_3px_0px_#000] sm:hover:shadow-[4px_4px_0px_#000]"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Briefcase className="w-4 h-4" />
                              <h4 className="font-bold text-base">{work.title}</h4>
                            </div>
                            <p className="text-sm text-gray-700 font-medium">{work.company}</p>
                            <p className="text-xs text-gray-600">
                              {new Date(work.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - {work.is_current ? 'Present' : new Date(work.end_date!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </p>
                            {work.description && (
                              <p className="text-sm text-gray-700 mt-2">{work.description}</p>
                            )}
                          </div>
                          {isOwnProfile && (
                            <button
                              onClick={() => handleDeleteWork(work.id)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Work Modal */}
      {showAddWork && (
        <div className="fixed inset-0 bg-gray-200 bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 border-2 border-black">
            <h2 className="text-xl font-bold mb-4">Add Work Experience</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Job Title"
                value={newWork.title || ''}
                onChange={(e) => setNewWork({ ...newWork, title: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black rounded text-sm"
              />
              <input
                type="text"
                placeholder="Company"
                value={newWork.company || ''}
                onChange={(e) => setNewWork({ ...newWork, company: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black rounded text-sm"
              />
              <input
                type="date"
                placeholder="Start Date"
                value={newWork.start_date || ''}
                onChange={(e) => setNewWork({ ...newWork, start_date: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black rounded text-sm"
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newWork.is_current || false}
                  onChange={(e) => setNewWork({ ...newWork, is_current: e.target.checked, end_date: e.target.checked ? null : newWork.end_date })}
                  className="w-4 h-4"
                />
                <label className="text-sm">Currently working here</label>
              </div>
              {!newWork.is_current && (
                <input
                  type="date"
                  placeholder="End Date"
                  value={newWork.end_date || ''}
                  onChange={(e) => setNewWork({ ...newWork, end_date: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded text-sm"
                />
              )}
              <textarea
                placeholder="Description (optional)"
                value={newWork.description || ''}
                onChange={(e) => setNewWork({ ...newWork, description: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black rounded text-sm"
                rows={3}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowAddWork(false)}
                className="flex-1 px-4 py-2 border-2 border-black rounded hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddWork}
                className="flex-1 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Social Modal */}
      {showAddSocial && (
        <div className="fixed inset-0 bg-gray-200 bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 border-2 border-black">
            <h2 className="text-xl font-bold mb-4">Add Social Link</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold mb-2">Platform</label>
                <select
                  value={newSocial.platform}
                  onChange={(e) => setNewSocial({ ...newSocial, platform: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded text-sm"
                >
                  <option value="">Select a platform</option>
                  {SOCIAL_PLATFORMS.map((platform) => (
                    <option key={platform.value} value={platform.value}>
                      {platform.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newSocial.url}
                  onChange={(e) => setNewSocial({ ...newSocial, url: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setShowAddSocial(false);
                  setNewSocial({ platform: '', url: '' });
                }}
                className="flex-1 px-4 py-2 border-2 border-black rounded hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSocial}
                className="flex-1 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
