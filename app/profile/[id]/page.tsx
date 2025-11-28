'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Toaster, toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MessageCircle, Edit, Plus, X, Briefcase, Link as LinkIcon } from 'lucide-react';

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
      const { error } = await supabase
        .from('users')
        .update({
          bio: editedProfile.bio,
          skills: editedProfile.skills,
          interests: editedProfile.interests,
          role: editedProfile.role,
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Profile updated successfully');
      setIsEditing(false);
      loadProfile();
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
      const { error } = await (supabase as any)
        .from('socials')
        .insert({
          user_id: userId,
          ...newSocial,
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
      const { error} = await (supabase as any)
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
        <div className="flex-1 ml-56 flex items-center justify-center">
          <p className="text-gray-700">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex">
        <Sidebar />
        <Toaster position="top-right" />
        <div className="flex-1 ml-56 flex items-center justify-center">
          <p className="text-gray-700">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] flex">
      <Sidebar />
      <Toaster position="top-right" richColors />
      
      <div className="flex-1 ml-56 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 border-2 border-black rounded hover:bg-black hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column - Profile Info */}
            <div className="lg:col-span-1 space-y-4">
              {/* Main Profile Card */}
              <div className="bg-[#F4C430] border-4 border-black rounded-lg p-6 shadow-[4px_4px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000] transition-all duration-200">
                <div className="flex flex-col items-center">
                  {profileUser.avatar_url ? (
                    <img
                      src={profileUser.avatar_url}
                      alt={profileUser.full_name}
                      className="w-32 h-32 rounded-full border-4 border-black object-cover mb-4"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full border-4 border-black bg-blue-600 flex items-center justify-center text-white font-bold text-4xl mb-4">
                      {profileUser.full_name?.charAt(0).toUpperCase() || profileUser.email.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">
                    {profileUser.full_name || profileUser.email}
                  </h2>
                  <p className="text-sm text-gray-700 mb-2">{profileUser.email}</p>
                  
                  {profileUser.role && (
                    <span className="px-3 py-1 bg-black text-white text-sm rounded-full mb-4">
                      {profileUser.role.charAt(0).toUpperCase() + profileUser.role.slice(1)}
                    </span>
                  )}

                  {/* Socials */}
                  {socials.length > 0 && (
                    <div className="flex gap-2 mb-4">
                      {socials.map((social) => (
                        <a
                          key={social.id}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-white border-2 border-black rounded shadow-[2px_2px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
                          title={social.platform}
                        >
                          <LinkIcon className="w-4 h-4" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="w-full space-y-2">
                    {isOwnProfile ? (
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="w-full px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                      </button>
                    ) : (
                      <button
                        onClick={handleStartChat}
                        className="w-full px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Chat
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="bg-white border-2 border-black rounded-lg p-4 shadow-[4px_4px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000] transition-all">
                <h3 className="font-bold text-lg mb-2">About</h3>
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

              {/* Skills */}
              <div className="bg-white border-2 border-black rounded-lg p-4 shadow-[4px_4px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000] transition-all">
                <h3 className="font-bold text-lg mb-2">Skills</h3>
                {isEditing ? (
                  <input
                    type="text"
                    value={Array.isArray(editedProfile.skills) ? editedProfile.skills.join(', ') : ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
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

              {/* Interests */}
              <div className="bg-white border-2 border-black rounded-lg p-4 shadow-[4px_4px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000] transition-all">
                <h3 className="font-bold text-lg mb-2">Interests</h3>
                {isEditing ? (
                  <input
                    type="text"
                    value={Array.isArray(editedProfile.interests) ? editedProfile.interests.join(', ') : ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, interests: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    placeholder="Coding, Music, Travel..."
                    className="w-full px-3 py-2 border-2 border-black rounded text-sm"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profileUser.interests && Array.isArray(profileUser.interests) && profileUser.interests.length > 0 ? (
                      profileUser.interests.map((interest: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded border border-green-300">
                          {interest}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No interests added</p>
                    )}
                  </div>
                )}
              </div>

              {isEditing && (
                <button
                  onClick={handleSaveProfile}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Save Changes
                </button>
              )}
            </div>

            {/* Right Column - Work Experience & Socials */}
            <div className="lg:col-span-2 space-y-4">
              {/* Work Experience */}
              <div className="bg-white border-2 border-black rounded-lg p-4 shadow-[4px_4px_0px_#000] overflow-visible">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-xl flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Work Experience
                  </h3>
                  {isOwnProfile && (
                    <button
                      onClick={() => setShowAddWork(true)}
                      className="px-3 py-1 bg-black text-white text-sm rounded hover:bg-gray-800 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  )}
                </div>

                <div className="space-y-3 overflow-visible">
                  {workExperience.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No work experience added</p>
                  ) : (
                    workExperience.map((work) => (
                      <div 
                        key={work.id}
                        className="group border-2 border-black rounded p-3 bg-[#FFF7E4] shadow-[2px_2px_0px_#000] cursor-pointer transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000]"
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

              {/* Social Links Management */}
              {isOwnProfile && (
                <div className="bg-white border-2 border-black rounded-lg p-4 shadow-[4px_4px_0px_#000]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-xl flex items-center gap-2">
                      <LinkIcon className="w-5 h-5" />
                      Social Links
                    </h3>
                    <button
                      onClick={() => setShowAddSocial(true)}
                      className="px-3 py-1 bg-black text-white text-sm rounded hover:bg-gray-800 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>

                  <div className="space-y-2">
                    {socials.map((social) => (
                      <div key={social.id} className="flex items-center justify-between border-2 border-black rounded p-2 bg-[#FFF7E4] shadow-[3px_3px_0px_#000] hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[6px_6px_0px_#000] transition-all duration-200 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <LinkIcon className="w-4 h-4" />
                          <span className="text-sm font-medium">{social.platform}</span>
                          <a href={social.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-xs">
                            {social.url}
                          </a>
                        </div>
                        <button
                          onClick={() => handleDeleteSocial(social.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
              <input
                type="text"
                placeholder="Platform (e.g., LinkedIn, Twitter)"
                value={newSocial.platform}
                onChange={(e) => setNewSocial({ ...newSocial, platform: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black rounded text-sm"
              />
              <input
                type="url"
                placeholder="URL"
                value={newSocial.url}
                onChange={(e) => setNewSocial({ ...newSocial, url: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black rounded text-sm"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowAddSocial(false)}
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
