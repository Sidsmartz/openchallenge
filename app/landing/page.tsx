"use client"
import { Canvas } from "@react-three/fiber"
import { useRef, useEffect, useState } from "react"
import type { Group } from "three"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

function LightBulbModel({ position, isLit }: { position: [number, number, number]; isLit: boolean }) {
  return (
    <group position={position}>
      {/* Filament/Glass bulb */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial
          color={isLit ? "#ffff99" : "#f5f5f5"}
          roughness={isLit ? 0.1 : 0.3}
          metalness={0}
          emissive={isLit ? "#ffaa00" : "#000000"}
          emissiveIntensity={isLit ? 1.5 : 0}
        />
      </mesh>

      {/* Filament coil inside */}
      <mesh position={[0, -0.05, 0]}>
        <torusGeometry args={[0.15, 0.03, 16, 100]} />
        <meshStandardMaterial color={isLit ? "#ff9900" : "#4a4a4a"} metalness={0.6} roughness={isLit ? 0.2 : 0.5} />
      </mesh>

      {/* Metal base */}
      <mesh position={[0, -0.6, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.3, 0.3, 32]} />
        <meshStandardMaterial color="#b8860b" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Base ridges */}
      <mesh position={[0, -0.75, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.15, 32]} />
        <meshStandardMaterial color="#9d6e0f" roughness={0.4} metalness={0.7} />
      </mesh>

      {/* Contact point */}
      <mesh position={[0, -0.88, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#a0826d" roughness={0.2} metalness={0.9} />
      </mesh>
    </group>
  )
}

function LightBulbScene() {
  const leftBulbRef = useRef<Group>(null)
  const rightBulbRef = useRef<Group>(null)
  const [isLit, setIsLit] = useState(false)

  useEffect(() => {
    let animationFrameId: number
    let elapsed = 0

    // Easing function
    const easeInOutCubic = (t: number) => {
      return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
    }

    const animate = () => {
      elapsed += 0.01

      // Calculate tilt angle - goes from 0 to about 45 degrees
      // Creates a smooth easing with oscillation at the end
      const maxTilt = -Math.PI / 4.5 // ~40 degrees
      const collisionStart = 3
      const collisionDuration = 1
      let tiltAngle: number

      if (elapsed < collisionStart) {
        // Smooth easing towards collision
        tiltAngle = maxTilt * easeInOutCubic(elapsed / collisionStart)
      } else if (elapsed < collisionStart + collisionDuration) {
        // Collision - vibration effect
        const collisionElapsed = elapsed - collisionStart
        const vibration = Math.sin(collisionElapsed * 30) * 0.05
        tiltAngle = maxTilt + vibration
      } else {
        // After collision, stay tilted and lit
        tiltAngle = maxTilt
      }

      // Light up when colliding
      if (elapsed >= collisionStart && elapsed < collisionStart + collisionDuration + 0.5) {
        setIsLit(true)
      }

      if (leftBulbRef.current) {
        leftBulbRef.current.rotation.z = tiltAngle
      }
      if (rightBulbRef.current) {
        rightBulbRef.current.rotation.z = -tiltAngle
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrameId)
  }, [])

  return (
    <Canvas camera={{ position: [0, 0, 3], fov: 50 }} style={{ width: "100%", height: "100%" }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, -3, 3]} intensity={0.5} />

      {/* Dynamic light from lit bulbs */}
      {isLit && (
        <>
          <pointLight position={[-1, 0, 1]} intensity={2} color="#ffaa00" />
          <pointLight position={[1, 0, 1]} intensity={2} color="#ffaa00" />
        </>
      )}

      <group ref={leftBulbRef} position={[-0.4, 0, 0]}>
        <LightBulbModel position={[0, 0, 0]} isLit={isLit} />
      </group>

      <group ref={rightBulbRef} position={[0.4, 0, 0]}>
        <LightBulbModel position={[0, 0, 0]} isLit={isLit} />
      </group>
    </Canvas>
  )
}

function PlugSocketScene() {
  return <LightBulbScene />
}

export default function Home() {
  const router = useRouter()

  const handleGoogleSignIn = async (isAlumni: boolean = false) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/onboarding`,
        },
      })

      if (error) {
        console.error("Error signing in with Google:", error)
        alert("Failed to sign in with Google: " + error.message)
      }
    } catch (err) {
      console.error("Unexpected error:", err)
      alert("An unexpected error occurred")
    }
  }

  return (
    <div className="min-h-screen bg-[#9DC4AA]">
      {/* Navigation Bar */}
      <nav className="w-full border-b-2 border-black bg-[#FFF7E4] px-6 py-6 lg:px-8 shadow-[0px_4px_0px_#000]">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <div className="text-3xl font-black text-gray-900 tracking-tight uppercase">CAMPUS CONNECT</div>

          {/* Auth Buttons */}
          <div className="flex gap-3">
            <button 
              onClick={() => handleGoogleSignIn(true)}
              className="px-6 py-3 border-2 border-black bg-white text-gray-900 font-bold text-sm uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
            >
              SIGN IN AS ALUMNI
            </button>
            <button 
              onClick={() => handleGoogleSignIn(false)}
              className="px-6 py-3 border-2 border-black bg-[#F4C430] text-gray-900 font-bold text-sm uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
            >
              SIGN IN
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-100px)]">
        {/* Hero Section */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
          <div className="w-full space-y-8">
            {/* Main Heading */}
            <div>
              <h1 className="text-5xl lg:text-6xl font-black text-gray-900 leading-tight uppercase tracking-tight mb-4">
                CONNECT WITH YOUR ALUMNI NETWORK
              </h1>
              <p className="text-lg text-gray-900 leading-relaxed font-medium">
                Bridge the gap between past and present. Build meaningful professional relationships with alumni from
                your institution.
              </p>
            </div>

            {/* CTA Button */}
            <button 
              onClick={() => handleGoogleSignIn(false)}
              className="w-full px-8 py-4 bg-[#F4C430] text-gray-900 border-2 border-black font-black text-lg uppercase tracking-wider shadow-[4px_4px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000] transition-all"
            >
              GET STARTED NOW
            </button>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#FFF7E4] border-2 border-black p-4 shadow-[4px_4px_0px_#000]">
                <div className="text-3xl font-black text-gray-900">50K+</div>
                <p className="text-sm text-gray-600 mt-1 font-bold uppercase">Alumni Connected</p>
              </div>
              <div className="bg-[#FFF7E4] border-2 border-black p-4 shadow-[4px_4px_0px_#000]">
                <div className="text-3xl font-black text-gray-900">500+</div>
                <p className="text-sm text-gray-600 mt-1 font-bold uppercase">Organizations</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3D Model Section */}
        <div className="w-full lg:w-1/2 bg-[#FFF7E4] border-l-2 border-black flex items-center justify-center overflow-hidden shadow-[-8px_0px_0px_#000]">
          <PlugSocketScene />
        </div>
      </div>
    </div>
  )
}
