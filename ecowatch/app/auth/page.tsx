"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, CheckCircle2, ShieldAlert, Leaf, Lock, Mail, User } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Form Component ──────────────────────────────────────────────────────────
function AuthForm() {
  const { login, register, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "register" ? "register" : "login";

  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
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
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3D Tilt
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useTransform(useSpring(my, { stiffness: 300, damping: 30 }), [-0.5, 0.5], ["8deg", "-8deg"]);
  const rotateY = useTransform(useSpring(mx, { stiffness: 300, damping: 30 }), [-0.5, 0.5], ["-8deg", "8deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-emerald-500/60 focus:bg-emerald-500/5 focus:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-200";

  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { mx.set(0); my.set(0); }}
      className="w-full"
    >
      <div
        className="glass-strong rounded-3xl p-8 relative overflow-hidden"
        style={{ transform: "translateZ(30px)" }}
      >
        {/* Scan line animation */}
        <motion.div
          animate={{ y: ["-120%", "300%"] }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear", repeatDelay: 2 }}
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent pointer-events-none"
        />

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 rounded-2xl glass mb-8">
          {(["login", "register"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => { setActiveTab(tab); setError(""); }}
              className={cn(
                "flex-1 py-2 px-4 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition-all duration-200",
                activeTab === tab
                  ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {tab === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -4, height: 0 }}
              className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm"
            >
              <ShieldAlert size={15} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Forms */}
        <AnimatePresence mode="wait">
          {activeTab === "login" ? (
            <motion.form
              key="login"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-5"
            >
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  <Mail size={10} /> Officer Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="agent@ecowatch.gov"
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  <Lock size={10} /> Passcode
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••••"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
                className="btn-shimmer mt-2 w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm uppercase tracking-wider py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-[0_0_25px_rgba(16,185,129,0.35)] disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Access System <ArrowRight size={16} /></>}
              </motion.button>
            </motion.form>
          ) : (
            <motion.form
              key="register"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  <User size={10} /> Full Name
                </label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Agent Name" />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  <Mail size={10} /> Email
                </label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="agent@ecowatch.gov" />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  <Lock size={10} /> Passcode
                </label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••••" />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
                className="btn-shimmer mt-1 w-full glass-emerald text-emerald-400 hover:text-white font-semibold text-sm uppercase tracking-wider py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all hover:bg-emerald-500 hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Initialize Agent <CheckCircle2 size={16} /></>}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AuthPage() {
  return (
    <div className="min-h-screen fixed inset-0 flex items-center justify-center overflow-hidden">
      {/* Extra overlay for auth page depth */}
      <div className="absolute inset-0 bg-[#030712]/60 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full flex flex-col md:flex-row items-center justify-center gap-16 px-4 max-w-5xl mx-auto">

        {/* Left side */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="hidden md:flex flex-col max-w-md gap-6"
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl glass-emerald flex items-center justify-center">
              <Leaf size={18} className="text-emerald-400" />
            </div>
            <span className="text-xl font-bold text-white">
              Eco<span className="text-emerald-400">Watch</span>
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-emerald w-max">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
              Secure Uplink Established
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            Orbital
            <br />
            <span className="text-gradient-eco">Defense Matrix</span>
          </h1>

          <p className="text-zinc-400 leading-relaxed text-base">
            Authenticate to access live satellite telemetry, AI threat predictions, and manage field operations across the globe.
          </p>

          {/* Feature bullets */}
          <ul className="flex flex-col gap-3 mt-2">
            {[
              "Real-time Sentinel-2 satellite imagery",
              "Qwen2-VL AI environmental threat detection",
              "Automated legal report generation",
              "Field officer WebSocket dispatch",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-zinc-400">
                <div className="w-4 h-4 rounded-full glass-emerald flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Right: Form */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md [perspective:1000px]"
        >
          <Suspense fallback={
            <div className="glass-strong rounded-3xl p-10 text-emerald-400 font-medium text-center animate-pulse">
              Initializing Interface...
            </div>
          }>
            <AuthForm />
          </Suspense>
        </motion.div>
      </div>
    </div>
  );
}
