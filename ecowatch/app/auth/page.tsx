"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Orbit, CheckCircle2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, OrbitControls, Sphere, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

// ─── 3D BACKGROUND SCENE ────────────────────────────────────────────────────────
function InteractiveEarth() {
  const earthRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (earthRef.current) {
      earthRef.current.rotation.y = clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <Sphere ref={earthRef} args={[2.5, 64, 64]}>
      <meshStandardMaterial 
        color="#064e3b"
        emissive="#10b981"
        emissiveIntensity={0.2}
        wireframe
        transparent
        opacity={0.3}
      />
    </Sphere>
  );
}

function SceneBackground() {
  return (
    <div className="absolute inset-0 z-0 bg-black pointer-events-auto cursor-grab active:cursor-grabbing">
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
        <color attach="background" args={["#020617"]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#06b6d4" />
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        <InteractiveEarth />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
      {/* Fog/Vignette Overlay */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-[#020617] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at center, transparent 30%, #020617 100%)" }} />
    </div>
  );
}

// ─── 3D TILT AUTH FORM ──────────────────────────────────────────────────────────
function AuthForm() {
  const { login, register, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "register" ? "register" : "login";
  
  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (isAuthenticated) router.push("/");
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (activeTab === "login") {
        const res = await login(email, password);
        if (!res.success) setError(res.message || "Login failed");
      } else {
        const res = await register(name, email, password);
        if (!res.success) setError(res.message || "Registration failed");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3D Tilt Effect Logic
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div 
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full relative z-10"
    >
      <div 
        className="w-full bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-10 shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden"
        style={{ transform: "translateZ(50px)" }} // Pops the form out in 3D
      >
        {/* Decorative scan line */}
        <motion.div 
          animate={{ y: ["-100%", "200%"] }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          className="absolute inset-0 w-full h-1 bg-emerald-500/30 blur-sm pointer-events-none"
        />

        {/* Tabs - FIX: type="button" and high z-index */}
        <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4 relative z-20">
          <div className="flex gap-6">
            <button 
              type="button"
              onClick={() => { setActiveTab("login"); setError(""); }}
              className={cn("text-sm font-mono tracking-widest uppercase transition-colors relative", activeTab === "login" ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300")}
            >
              Login
              {activeTab === "login" && (
                <motion.div layoutId="authTab" className="absolute -bottom-[17px] left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
              )}
            </button>
            <button 
              type="button"
              onClick={() => { setActiveTab("register"); setError(""); }}
              className={cn("text-sm font-mono tracking-widest uppercase transition-colors relative", activeTab === "register" ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300")}
            >
              Initialize
              {activeTab === "register" && (
                <motion.div layoutId="authTab" className="absolute -bottom-[17px] left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded flex items-center gap-2 text-red-400 text-sm">
            <ShieldAlert size={16} />
            {error}
          </motion.div>
        )}

        {/* Forms */}
        <div className="relative h-[360px] z-10 mt-4">
          <AnimatePresence mode="wait">
            {activeTab === "login" ? (
              <motion.form 
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSubmit}
                className="absolute inset-0 flex flex-col gap-6"
              >
                <div className="space-y-1 group">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-emerald-500/80 group-focus-within:text-emerald-400 transition-colors">Officer ID / Email</label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-none px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/80 focus:bg-emerald-500/10 focus:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                    placeholder="agent@ecowatch.gov"
                  />
                </div>
                <div className="space-y-1 group">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-emerald-500/80 group-focus-within:text-emerald-400 transition-colors">Passcode</label>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-none px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/80 focus:bg-emerald-500/10 focus:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                    placeholder="••••••••"
                  />
                </div>
                
                <button 
                  disabled={isLoading}
                  className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono uppercase tracking-widest py-3 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  {isLoading ? <Orbit size={18} className="animate-spin" /> : "Access System"}
                  {!isLoading && <ArrowRight size={18} />}
                </button>
              </motion.form>
            ) : (
              <motion.form 
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSubmit}
                className="absolute inset-0 flex flex-col gap-5"
              >
                <div className="space-y-1 group">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-emerald-500/80 group-focus-within:text-emerald-400 transition-colors">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-none px-4 py-2 text-white focus:outline-none focus:border-emerald-500/80 focus:bg-emerald-500/10 focus:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                  />
                </div>
                <div className="space-y-1 group">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-emerald-500/80 group-focus-within:text-emerald-400 transition-colors">Email</label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-none px-4 py-2 text-white focus:outline-none focus:border-emerald-500/80 focus:bg-emerald-500/10 focus:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                  />
                </div>
                <div className="space-y-1 group">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-emerald-500/80 group-focus-within:text-emerald-400 transition-colors">Passcode</label>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-none px-4 py-2 text-white focus:outline-none focus:border-emerald-500/80 focus:bg-emerald-500/10 focus:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                  />
                </div>
                
                <button 
                  disabled={isLoading}
                  className="mt-2 w-full bg-emerald-600/20 border border-emerald-500/50 hover:bg-emerald-500/30 text-emerald-400 hover:text-emerald-200 font-mono uppercase tracking-widest py-3 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 relative overflow-hidden group"
                  style={{ clipPath: "polygon(5% 0, 100% 0, 95% 100%, 0% 100%)" }}
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  {isLoading ? <Orbit size={18} className="animate-spin" /> : "Initialize Agent"}
                  {!isLoading && <CheckCircle2 size={18} />}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────────
export default function AuthPage() {
  return (
    <div className="min-h-screen fixed inset-0 flex items-center justify-center overflow-hidden bg-[#020617]">
      
      {/* Interactive 3D Background */}
      <SceneBackground />

      {/* Content Layer */}
      <div className="z-10 w-full flex flex-col md:flex-row items-center justify-center gap-16 px-4 pointer-events-none">
        
        {/* Left Info */}
        <div className="hidden md:flex flex-col max-w-md pointer-events-auto" style={{ transform: "translateZ(20px)" }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-emerald-500/30 mb-6 w-max shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
            <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-400">Secure Uplink Established</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            Orbital <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              Defense Matrix
            </span>
          </h1>
          <p className="text-zinc-400 text-lg">
            Authenticate to access live satellite telemetry, AI threat predictions, and manage field operations.
          </p>
        </div>

        {/* Right Form */}
        <div className="pointer-events-auto perspective-[1000px] w-full max-w-[550px]">
          <Suspense fallback={<div className="text-emerald-500 font-mono animate-pulse">Initializing Interface...</div>}>
            <AuthForm />
          </Suspense>
        </div>

      </div>
    </div>
  );
}
