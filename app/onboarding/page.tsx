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
  const [initialStep, setInitialStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [currentStepState, setCurrentStepState] = useState(1);

  // Update currentStepState when initialStep changes
  useEffect(() => {
    setCurrentStepState(initialStep);
  }, [initialStep]);

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

        // Check domain access (skip for potential alumni - they'll be handled by approval system)
        const response = await fetch('/api/check-domain', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        const data = await response.json();
        
        // Only redirect to restricted if it's a Gmail account without access
        // Company emails (potential alumni) are allowed to proceed to onboarding
        if (!data.hasAccess && session.user.email?.endsWith('@gmail.com')) {
          console.log("❌ Gmail domain not allowed, redirecting to restricted page");
          router.push('/restricted');
          return;
        }

        // Check if user is admin
        const adminResponse = await fetch('/api/admin/check', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        const adminData = await adminResponse.json();
        
        if (adminData.isAdmin) {
          console.log("👑 Admin user detected, skipping onboarding");
          // Check if admin profile exists in users table
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', session.user.id)
            .single();

          if (!existingUser && session.user.email) {
            // Create minimal admin profile
            await supabase.from('users').insert({
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
              role: 'admin',
            });
          }
          
          router.push('/admin');
          return;
        }

        // Check onboarding status for regular users
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (existingUser) {
          console.log("📋 Existing user found:", existingUser);
          
          // Check if onboarding is complete
          const hasRole = !!existingUser.role;
          const hasFullName = !!existingUser.full_name;
          const hasPreferences = existingUser.theme !== null;

          if (hasRole && hasFullName && hasPreferences) {
            console.log("✅ Onboarding complete, redirecting to home");
            router.push('/');
            return;
          }

          // Determine which step to resume from (now 1-indexed since login is separate)
          if (!hasRole) {
            console.log("📍 Resuming from step 1 (role selection)");
            setInitialStep(1);
          } else if (!hasFullName) {
            console.log("📍 Resuming from step 2 (profile)");
            setRole(existingUser.role);
            setInitialStep(2);
          } else if (!hasPreferences) {
            console.log("📍 Resuming from step 3 (preferences)");
            setRole(existingUser.role);
            setProfileData({
              fullName: existingUser.full_name || "",
              programBranch: existingUser.program_branch || "",
              yearOfStudy: existingUser.year_of_study || "",
              interests: existingUser.interests || "",
              coursesEnrolled: existingUser.courses_enrolled || "",
              department: existingUser.department || "",
              subjectsTaught: existingUser.subjects_taught || "",
              researchInterests: existingUser.research_interests || "",
              officeHours: existingUser.office_hours || "",
              graduatingBatch: existingUser.graduating_batch || "",
              currentCompany: existingUser.current_company || "",
              currentJobTitle: existingUser.current_job_title || "",
              availableForMentorship: existingUser.available_for_mentorship || false,
            });
            setInitialStep(3);
          }
        }
      } else {
        console.log("❌ No active session found");
      }
      
      setIsLoading(false);
    };
    checkSession();
  }, [router]);

  // Save role to database
  const saveRole = async () => {
    if (!role || !userId || !userEmail) return;
    
    console.log("💾 Saving role:", role);
    try {
      const { error } = await supabase.from("users").upsert({
        id: userId,
        email: userEmail,
        role,
      }, {
        onConflict: 'id'
      });
      
      if (error) {
        console.error("❌ Error saving role:", error);
      } else {
        console.log("✅ Role saved");
      }
    } catch (err) {
      console.error("❌ Unexpected error saving role:", err);
    }
  };

  // Auto-save role when it changes
  useEffect(() => {
    if (role && userId && userEmail) {
      saveRole();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, userId, userEmail]);

  // Validate profile fields based on role
  const isProfileValid = () => {
    if (!profileData.fullName.trim()) return false;

    if (role === "student") {
      return (
        profileData.programBranch.trim() !== "" &&
        profileData.yearOfStudy.trim() !== "" &&
        profileData.interests.trim() !== "" &&
        profileData.coursesEnrolled.trim() !== ""
      );
    } else if (role === "faculty") {
      return (
        profileData.department.trim() !== "" &&
        profileData.subjectsTaught.trim() !== "" &&
        profileData.researchInterests.trim() !== "" &&
        profileData.officeHours.trim() !== ""
      );
    } else if (role === "alumni") {
      return (
        profileData.graduatingBatch.trim() !== "" &&
        profileData.currentCompany.trim() !== "" &&
        profileData.currentJobTitle.trim() !== ""
      );
    }
    return false;
  };

  // Get next button props based on current step
  const getNextButtonProps = () => {
    if (currentStepState === 2) {
      const isValid = isProfileValid();
      return {
        disabled: !isValid,
      };
    }
    return {};
  };

  // Check if a step can be accessed
  const canAccessStep = (step: number) => {
    // Can always access current or previous steps
    if (step <= currentStepState) return true;
    
    // For future steps, check if requirements are met
    if (step === 2) return true; // Step 2 is always accessible after step 1
    if (step === 3) {
      // Step 3 requires step 2 to be completed with valid profile
      return currentStepState >= 2 && isProfileValid();
    }
    
    return false;
  };

  // Custom step indicator renderer
  const renderStepIndicator = ({ step, currentStep, onStepClick }: any) => {
    const canAccess = canAccessStep(step);
    const isActive = currentStep === step;
    const isComplete = currentStep > step;
    const isClickable = canAccess && step !== currentStep;
    
    return (
      <div
        onClick={() => {
          if (isClickable) {
            onStepClick(step);
          }
        }}
        className={`w-10 h-10 rounded-full border-2 border-black flex items-center justify-center font-bold text-sm transition-all ${
          isActive
            ? 'bg-[#5227FF] text-white scale-110'
            : isComplete
            ? 'bg-[#5227FF] text-white'
            : 'bg-white text-black'
        } ${
          isClickable
            ? 'cursor-pointer hover:scale-105'
            : isActive
            ? 'cursor-default'
            : 'cursor-not-allowed opacity-50'
        }`}
      >
        {isComplete ? (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : isActive ? (
          <div className="w-3 h-3 bg-white rounded-full" />
        ) : (
          step
        )}
      </div>
    );
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

      // Remove id from userData for update operation
      const { id, ...updateData } = userData;

      const { data, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId)
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
    console.log("📊 Current state:", { userId, preferences, role });

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
      // Check if user is alumni with non-gmail email
      const isAlumniNonGmail = role === 'alumni' && userEmail && !userEmail.endsWith('@gmail.com');
      
      const updateData: any = {
        theme: preferences.theme,
        smart_search: preferences.smartSearch,
        ai_summary: preferences.aiSummary,
        gamification: preferences.gamification,
      };

      // Set approval status for alumni with company emails
      if (isAlumniNonGmail) {
        updateData.approval_status = 'pending';
      } else {
        updateData.approval_status = 'approved';
      }

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
        setOnboardingComplete(true);
        
        // Redirect based on approval status
        setTimeout(() => {
          if (isAlumniNonGmail) {
            router.push("/pending");
          } else {
            router.push("/");
          }
        }, 2000);
      }
    } catch (err) {
      console.error("💥 Unexpected error:", err);
      alert("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#A8D7B7]">
        <div className="text-xl font-bold">Loading...</div>
      </div>
    );
  }

  // Show standalone login screen if user is not authenticated
  if (!userId) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#A8D7B7] p-3 xs:p-4 sm:p-8">
        <div className="w-full sm:w-[90%] max-w-[1200px] min-h-[85vh] bg-[#FFF7E4] border-2 border-black p-4 xs:p-6 sm:p-12 flex justify-center items-center">
          <div className="w-full sm:w-[700px] bg-[#F4C430] shadow-[3px_3px_0px_#000] xs:shadow-[4px_4px_0px_#000] sm:shadow-[8px_8px_0px_#000] border-2 border-black p-4 xs:p-6 sm:p-12">
            <div className="flex flex-col items-center justify-center gap-3 xs:gap-4 sm:gap-6">
              <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-center">Welcome!</h1>
              <p className="text-center text-xs xs:text-sm sm:text-base text-[#333] mb-1 xs:mb-2 sm:mb-4 px-2">
                Sign in with your Google account to get started
              </p>
              <button
                onClick={handleGoogleSignIn}
                className="flex items-center gap-2 xs:gap-2 sm:gap-3 bg-white border-2 border-[#333] rounded-lg px-4 xs:px-6 sm:px-8 py-2.5 xs:py-3 sm:py-4 hover:bg-gray-50 transition-colors shadow-[3px_3px_0px_#000] xs:shadow-[4px_4px_0px_#000] text-sm xs:text-base"
              >
                <svg
                  className="w-5 h-5 xs:w-6 xs:h-6 flex-shrink-0"
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show stepper for authenticated users who need to complete onboarding
  return (
    <div className="flex justify-center items-center min-h-screen bg-[#A8D7B7] p-2 xs:p-3 sm:p-8">
      <div className="w-full xs:w-[95%] sm:w-[90%] max-w-[1200px] h-[90vh] xs:h-[85vh] sm:h-[85vh] bg-[#FFF7E4] border-2 border-black p-3 xs:p-4 sm:p-12 flex justify-center items-center">
        <div className="w-full xs:max-w-[500px] sm:w-[700px] h-[calc(100%-2rem)] xs:h-[calc(100%-3rem)] sm:h-[500px] bg-[#F4C430] shadow-[3px_3px_0px_#000] xs:shadow-[4px_4px_0px_#000] sm:shadow-[8px_8px_0px_#000] border-2 border-black flex flex-col">
          {onboardingComplete ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center border-4 border-black shadow-[4px_4px_0px_#000]">
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-center">All Set!</h2>
              <p className="text-center text-lg text-[#333]">
                Your profile has been created successfully.
              </p>
              <p className="text-center text-sm text-[#666]">
                Redirecting you to the home page...
              </p>
            </div>
          ) : (
            <Stepper 
              initialStep={initialStep} 
              onStepChange={((step: number) => setCurrentStepState(step)) as any}
              onFinalStepCompleted={handleComplete}
              renderStepIndicator={renderStepIndicator}
              nextButtonProps={getNextButtonProps()}
            >
            {/* Step 1: Select Your Role */}
            <Step>
              <div>
                <h2 className="text-base xs:text-lg sm:text-xl font-bold mb-3 xs:mb-4 text-center">
                  Choose Your Role
                </h2>

                <div className="flex flex-col gap-2 xs:gap-2.5 sm:gap-3">
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
                      className={`w-full px-3 xs:px-4 py-3 xs:py-4 border-2 border-black font-bold uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 text-left ${
                        role === option.value
                          ? "bg-[#6B9BD1] text-white shadow-[2px_2px_0px_#000] xs:shadow-[3px_3px_0px_#000] sm:shadow-[4px_4px_0px_#000] translate-x-[-1px] translate-y-[-1px] xs:translate-x-[-1.5px] xs:translate-y-[-1.5px] sm:translate-x-[-2px] sm:translate-y-[-2px]"
                          : "bg-white hover:translate-x-[-1px] hover:translate-y-[-1px] xs:hover:translate-x-[-1.5px] xs:hover:translate-y-[-1.5px] sm:hover:translate-x-[-2px] sm:hover:translate-y-[-2px] hover:shadow-[2px_2px_0px_#000] xs:hover:shadow-[3px_3px_0px_#000] sm:hover:shadow-[4px_4px_0px_#000]"
                      }`}
                    >
                      <div className="text-xs xs:text-sm">
                        {option.title}
                      </div>
                      <div className={`text-[0.6rem] xs:text-[0.65rem] normal-case font-normal leading-tight text-center ${
                        role === option.value ? "text-white/90" : "text-[#666]"
                      }`}>
                        {option.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Step>

            {/* Step 2: Set Up Your Profile */}
            <Step>
              <div>
                <h2 className="text-base xs:text-lg sm:text-xl font-bold mb-2 xs:mb-3 text-center">
                  Complete Your Profile
                </h2>

                {role === "student" && (
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-x-2 xs:gap-x-3 sm:gap-x-4 gap-y-2 xs:gap-y-2.5">
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
                    <div className="col-span-1 xs:col-span-2">
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
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-x-2 xs:gap-x-3 sm:gap-x-4 gap-y-2 xs:gap-y-2.5">
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
                    <div className="col-span-1 xs:col-span-2">
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
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-x-2 xs:gap-x-3 sm:gap-x-4 gap-y-2 xs:gap-y-2.5">
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
                    <div className="col-span-1 xs:col-span-2 flex items-center gap-2 mt-1 xs:mt-2">
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
                        className="w-4 h-4"
                      />
                      <label htmlFor="mentorship" className="text-xs xs:text-sm">
                        Available for Mentorship
                      </label>
                    </div>
                  </div>
                )}

                {/* {!isProfileValid() && (
                  <div className="mt-4 p-3 bg-yellow-100 border-2 border-yellow-600 rounded-md">
                    <p className="text-xs text-yellow-800 font-medium">
                      Please fill in all required fields to continue
                    </p>
                  </div>
                )} */}
              </div>
            </Step>

            {/* Step 3: Personalize Your Experience */}
            <Step>
              <div>
                <h2 className="text-base xs:text-lg sm:text-xl font-bold mb-2 xs:mb-3 text-center">
                  Personalize Your Experience
                </h2>

                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 xs:gap-4">
                  <div className="flex flex-col gap-2.5 xs:gap-3">
                    <div>
                      <label className="block mb-1.5 xs:mb-2 font-medium text-xs xs:text-sm">
                        Theme Selection
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 xs:gap-2">
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
                              className={`p-1.5 xs:p-2 rounded-md cursor-pointer text-[0.65rem] xs:text-[0.75rem] ${
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
                      <label className="block mb-1.5 xs:mb-2 font-medium text-xs xs:text-sm">
                        AI Summary Mode
                      </label>
                      <div className="flex gap-1.5 xs:gap-2">
                        {["Brief", "Detailed"].map((mode) => (
                          <button
                            key={mode}
                            onClick={() =>
                              setPreferences({
                                ...preferences,
                                aiSummary: mode.toLowerCase(),
                              })
                            }
                            className={`flex-1 py-1.5 xs:py-2 rounded-md cursor-pointer text-[0.65rem] xs:text-[0.75rem] ${
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

                  <div className="flex flex-col gap-2.5 xs:gap-3 justify-center">
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
          )}
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
  required = true,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const isEmpty = required && value.trim() === "";
  
  return (
    <div>
      <label className="block mb-0.5 xs:mb-1 font-medium text-[0.65rem] xs:text-xs">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full p-1.5 xs:p-2 border-2 rounded-md text-[0.7rem] xs:text-xs transition-colors ${
          isEmpty && value === "" 
            ? "border-[#333]" 
            : isEmpty 
            ? "border-red-500 bg-red-50" 
            : "border-[#333]"
        }`}
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
