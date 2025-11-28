"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Stepper, { Step } from "@/components/Stepper";
import { supabase } from "@/lib/supabase";

export default function OnboardingPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Log role changes
  useEffect(() => {
    if (role) {
      console.log("🎭 Role changed to:", role);
      localStorage.setItem("onboarding_role", role);
    }
  }, [role]);

  // Log userId changes
  useEffect(() => {
    if (userId) {
      console.log("👤 User ID set:", userId);
    }
  }, [userId]);

  // Profile data
  const [profileData, setProfileData] = useState({
    fullName: "",
    programBranch: "",
    yearOfStudy: "",
    interests: "",
    coursesEnrolled: "",
    department: "",
    subjectsTaught: "",
    researchInterests: "",
    officeHours: "",
    graduatingBatch: "",
    currentCompany: "",
    currentJobTitle: "",
    availableForMentorship: false,
  });

  const [preferences, setPreferences] = useState({
    theme: "light",
    smartSearch: true,
    aiSummary: "brief",
    gamification: true,
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      console.log("🔍 Checking for existing session...");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.log("📦 Session data:", session);

      if (session?.user) {
        console.log("✅ User found:", {
          id: session.user.id,
          email: session.user.email,
        });
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
      } else {
        console.log("❌ No active session found");
      }
    };
    checkSession();
  }, []);

  // Save role after step 1
  const handleRoleComplete = async () => {
    if (!role) return;

    // Store role temporarily in localStorage
    localStorage.setItem("onboarding_role", role);
  };

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    console.log("🔐 Starting Google Sign In...");
    console.log("📍 Redirect URL:", `${window.location.origin}/onboarding`);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/onboarding`,
        },
      });

      console.log("📤 OAuth response:", { data, error });

      if (error) {
        console.error("❌ Error signing in with Google:", error);
        alert("Failed to sign in with Google: " + error.message);
      } else {
        console.log("✅ OAuth initiated successfully");
      }
    } catch (err) {
      console.error("💥 Unexpected error:", err);
      alert("An unexpected error occurred");
    }
  };

  // Save profile data after step 3
  const handleProfileComplete = async () => {
    console.log("💾 handleProfileComplete called");
    console.log("📊 Current state:", { userId, role, profileData });

    if (!userId || !role) {
      console.warn("⚠️ Missing userId or role:", { userId, role });
      return;
    }

    setIsSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userData: any = {
        id: userId,
        email: userEmail,
        role,
        full_name: profileData.fullName,
      };

      // Add role-specific fields
      if (role === "student") {
        userData.program_branch = profileData.programBranch;
        userData.year_of_study = profileData.yearOfStudy;
        userData.interests = profileData.interests;
        userData.courses_enrolled = profileData.coursesEnrolled;
      } else if (role === "faculty") {
        userData.department = profileData.department;
        userData.subjects_taught = profileData.subjectsTaught;
        userData.research_interests = profileData.researchInterests;
        userData.office_hours = profileData.officeHours;
      } else if (role === "alumni") {
        userData.graduating_batch = profileData.graduatingBatch;
        userData.current_company = profileData.currentCompany;
        userData.current_job_title = profileData.currentJobTitle;
        userData.available_for_mentorship = profileData.availableForMentorship;
      }

      console.log("📤 Upserting user data:", userData);

      const { data, error } = await supabase
        .from("users")
        .upsert(userData)
        .select();

      console.log("📥 Upsert response:", { data, error });

      if (error) {
        console.error("❌ Error saving profile data:", error);
        alert("Failed to save profile: " + error.message);
      } else {
        console.log("✅ Profile data saved successfully:", data);
      }
    } catch (err) {
      console.error("💥 Unexpected error:", err);
      alert("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save preferences and complete onboarding
  const handleComplete = async () => {
    console.log("🎯 handleComplete called");
    console.log("📊 Current state:", { userId, preferences });

    if (!userId) {
      console.warn("⚠️ Missing userId:", userId);
      return;
    }

    // First, save profile data if not already saved
    if (role && profileData.fullName) {
      console.log("💾 Saving profile data before preferences...");
      await handleProfileComplete();
    }

    setIsSubmitting(true);
    try {
      const updateData = {
        theme: preferences.theme,
        smart_search: preferences.smartSearch,
        ai_summary: preferences.aiSummary,
        gamification: preferences.gamification,
      };

      console.log("📤 Updating preferences:", updateData);

      const { data, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId)
        .select();

      console.log("📥 Update response:", { data, error });

      if (error) {
        console.error("❌ Error saving preferences:", error);
        alert("Failed to save preferences: " + error.message);
      } else {
        console.log("✅ Preferences saved successfully:", data);
        localStorage.removeItem("onboarding_role");
        alert("Onboarding completed successfully!");
        router.push("/");
      }
    } catch (err) {
      console.error("💥 Unexpected error:", err);
      alert("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#A8D7B7] p-8">
      <div className="w-[90%] max-w-[1200px] h-[85vh] bg-[#FFF7E4] border-2 border-black p-12 flex justify-center items-center">
        <div className="w-[700px] h-[500px] bg-[#F4C430] shadow-[8px_8px_0px_#000] overflow-hidden border-2 border-black">
          <Stepper initialStep={1} onFinalStepCompleted={handleComplete}>
            {/* Step 1: Select Your Role */}
            <Step>
              <div>
                <h2 className="text-xl font-bold mb-4 text-center">
                  Choose Your Role
                </h2>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      value: "student",
                      title: "Student",
                      desc: "Access lectures, forums, and networking",
                    },
                    {
                      value: "faculty",
                      title: "Faculty",
                      desc: "Upload lectures and manage content",
                    },
                    {
                      value: "alumni",
                      title: "Alumni",
                      desc: "Connect and offer mentorship",
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setRole(option.value)}
                      className={`p-4 border-2 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${
                        role === option.value
                          ? "border-[#5227FF] bg-[#f5f3ff]"
                          : "border-[#333] bg-white"
                      }`}
                    >
                      <div className="font-bold mb-2 text-base">
                        {option.title}
                      </div>
                      <div className="text-xs text-[#666] leading-tight">
                        {option.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Step>

            {/* Step 2: Google Sign In */}
            <Step>
              <div>
                <h2 className="text-xl font-bold mb-3 text-center">
                  Sign In with Google
                </h2>

                <div className="flex flex-col items-center justify-center gap-4 py-8">
                  {userId ? (
                    <div className="text-center">
                      <p className="text-sm text-[#333] mb-2">Signed in as:</p>
                      <p className="font-medium">{userEmail}</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-[#333] text-center mb-4">
                        Sign in with your Google account to continue
                      </p>
                      <button
                        onClick={handleGoogleSignIn}
                        className="flex items-center gap-3 bg-white border-2 border-[#333] rounded-lg px-6 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <svg
                          className="w-6 h-6"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                        </svg>
                        <span className="font-medium">Sign in with Google</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Step>

            {/* Step 3: Set Up Your Profile */}
            <Step>
              <div>
                <h2 className="text-xl font-bold mb-3 text-center">
                  Complete Your Profile
                </h2>

                {role === "student" && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    <InputField
                      label="Full Name"
                      placeholder="Enter your full name"
                      value={profileData.fullName}
                      onChange={(val) =>
                        setProfileData({ ...profileData, fullName: val })
                      }
                    />
                    <InputField
                      label="Program / Branch"
                      placeholder="e.g., Computer Science"
                      value={profileData.programBranch}
                      onChange={(val) =>
                        setProfileData({ ...profileData, programBranch: val })
                      }
                    />
                    <InputField
                      label="Year of Study"
                      placeholder="e.g., 2nd Year"
                      value={profileData.yearOfStudy}
                      onChange={(val) =>
                        setProfileData({ ...profileData, yearOfStudy: val })
                      }
                    />
                    <InputField
                      label="Interests"
                      placeholder="e.g., AI, Web Dev"
                      value={profileData.interests}
                      onChange={(val) =>
                        setProfileData({ ...profileData, interests: val })
                      }
                    />
                    <div className="col-span-2">
                      <InputField
                        label="Courses Enrolled"
                        placeholder="e.g., Data Structures, Algorithms"
                        value={profileData.coursesEnrolled}
                        onChange={(val) =>
                          setProfileData({
                            ...profileData,
                            coursesEnrolled: val,
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                {role === "faculty" && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    <InputField
                      label="Full Name"
                      placeholder="Enter your full name"
                      value={profileData.fullName}
                      onChange={(val) =>
                        setProfileData({ ...profileData, fullName: val })
                      }
                    />
                    <InputField
                      label="Department"
                      placeholder="e.g., Computer Science"
                      value={profileData.department}
                      onChange={(val) =>
                        setProfileData({ ...profileData, department: val })
                      }
                    />
                    <InputField
                      label="Subjects Taught"
                      placeholder="e.g., Operating Systems"
                      value={profileData.subjectsTaught}
                      onChange={(val) =>
                        setProfileData({ ...profileData, subjectsTaught: val })
                      }
                    />
                    <InputField
                      label="Research Interests"
                      placeholder="e.g., Machine Learning"
                      value={profileData.researchInterests}
                      onChange={(val) =>
                        setProfileData({
                          ...profileData,
                          researchInterests: val,
                        })
                      }
                    />
                    <div className="col-span-2">
                      <InputField
                        label="Office Hours"
                        placeholder="e.g., Mon-Fri 2-4 PM"
                        value={profileData.officeHours}
                        onChange={(val) =>
                          setProfileData({ ...profileData, officeHours: val })
                        }
                      />
                    </div>
                  </div>
                )}

                {role === "alumni" && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    <InputField
                      label="Full Name"
                      placeholder="Enter your full name"
                      value={profileData.fullName}
                      onChange={(val) =>
                        setProfileData({ ...profileData, fullName: val })
                      }
                    />
                    <InputField
                      label="Graduating Batch"
                      placeholder="e.g., 2020"
                      value={profileData.graduatingBatch}
                      onChange={(val) =>
                        setProfileData({ ...profileData, graduatingBatch: val })
                      }
                    />
                    <InputField
                      label="Current Company"
                      placeholder="e.g., Google"
                      value={profileData.currentCompany}
                      onChange={(val) =>
                        setProfileData({ ...profileData, currentCompany: val })
                      }
                    />
                    <InputField
                      label="Current Job Title"
                      placeholder="e.g., Software Engineer"
                      value={profileData.currentJobTitle}
                      onChange={(val) =>
                        setProfileData({ ...profileData, currentJobTitle: val })
                      }
                    />
                    <div className="col-span-2 flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="mentorship"
                        checked={profileData.availableForMentorship}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            availableForMentorship: e.target.checked,
                          })
                        }
                      />
                      <label htmlFor="mentorship" className="text-sm">
                        Available for Mentorship
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </Step>

            {/* Step 4: Personalize Your Experience */}
            <Step>
              <div>
                <h2 className="text-xl font-bold mb-3 text-center">
                  Personalize Your Experience
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block mb-2 font-medium text-sm">
                        Theme Selection
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {["Light", "Dark", "College Colors", "Focus Mode"].map(
                          (theme) => (
                            <button
                              key={theme}
                              onClick={() =>
                                setPreferences({
                                  ...preferences,
                                  theme: theme.toLowerCase(),
                                })
                              }
                              className={`p-2 rounded-md cursor-pointer text-[0.75rem] ${
                                preferences.theme === theme.toLowerCase()
                                  ? "border-2 border-[#5227FF] bg-[#f5f3ff]"
                                  : "border border-[#333] bg-white"
                              }`}
                            >
                              {theme}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block mb-2 font-medium text-sm">
                        AI Summary Mode
                      </label>
                      <div className="flex gap-2">
                        {["Brief", "Detailed"].map((mode) => (
                          <button
                            key={mode}
                            onClick={() =>
                              setPreferences({
                                ...preferences,
                                aiSummary: mode.toLowerCase(),
                              })
                            }
                            className={`flex-1 py-2 rounded-md cursor-pointer text-[0.75rem] ${
                              preferences.aiSummary === mode.toLowerCase()
                                ? "border-2 border-[#5227FF] bg-[#f5f3ff]"
                                : "border border-[#333] bg-white"
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 justify-center">
                    <ToggleOption
                      label="SmartSearch"
                      checked={preferences.smartSearch}
                      onChange={(checked) =>
                        setPreferences({ ...preferences, smartSearch: checked })
                      }
                    />

                    <ToggleOption
                      label="Gamification"
                      description="Earn XP and badges"
                      checked={preferences.gamification}
                      onChange={(checked) =>
                        setPreferences({
                          ...preferences,
                          gamification: checked,
                        })
                      }
                    />
                  </div>
                </div>

                {isSubmitting && (
                  <div className="text-center mt-4 text-sm text-[#666]">
                    Saving your data...
                  </div>
                )}
              </div>
            </Step>
          </Stepper>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block mb-1 font-medium text-xs">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 border border-[#333] rounded-md text-xs"
      />
    </div>
  );
}

function ToggleOption({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <div className="font-medium text-sm">{label}</div>
        {description && (
          <div className="text-xs text-[#666]">{description}</div>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full border-none cursor-pointer relative transition-colors ${
          checked ? "bg-[#5227FF]" : "bg-[#d1d5db]"
        }`}
      >
        <div
          className={`w-[1.125rem] h-[1.125rem] bg-white rounded-full absolute top-[0.1875rem] transition-all ${
            checked ? "left-[1.4375rem]" : "left-[0.1875rem]"
          }`}
        />
      </button>
    </div>
  );
}
