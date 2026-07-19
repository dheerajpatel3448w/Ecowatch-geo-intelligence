"use client";

import { motion, useScroll, useMotionValueEvent, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  Satellite,
  ShieldAlert,
  BrainCircuit,
  TreePine,
  AlertTriangle,
  Activity,
  Zap,
  BarChart3,
  Globe2,
  ChevronDown,
  Eye,
} from "lucide-react";
import Link from "next/link";

// Dynamic import — SSR disabled (Three.js needs browser WebGL)
const EarthGlobe = dynamic(
  () => import("@/components/ui/EarthGlobe").then((m) => m.EarthGlobe),
  { ssr: false }
);

interface PublicStats {
  totalZones:     number;
  totalScans:     number;
  totalAlerts:    number;
  activeThreats:  number;
  activeCampaigns: number;
}

// ── Animated number counter ───────────────────────────────────────────────────
function Counter({ value, duration = 2 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!value) return;
    let cur = 0;
    const step = Math.max(1, Math.ceil(value / (duration * 60)));
    const id = setInterval(() => {
      cur += step;
      if (cur >= value) { setDisplay(value); clearInterval(id); }
      else setDisplay(cur);
    }, 1000 / 60);
    return () => clearInterval(id);
  }, [value, duration]);
  return <>{display.toLocaleString()}</>;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -3 }}
      className="glass rounded-2xl p-5 flex flex-col gap-2 hover:glass-strong transition-all duration-300 cursor-default group"
    >
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${color}`}>
          {label}
        </span>
        <Icon size={13} className={`${color} opacity-50 group-hover:opacity-100 transition-opacity`} />
      </div>
      <span className="text-3xl font-bold text-white tabular-nums">
        <Counter value={value} />
      </span>
    </motion.div>
  );
}

// ── Feature bento card ────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon,
  title,
  description,
  glow,
  delay = 0,
  large = false,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  glow: string;
  delay?: number;
  large?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={`group glass rounded-3xl p-8 relative overflow-hidden transition-all duration-300 ${
        large ? "md:col-span-2 md:row-span-2" : ""
      }`}
    >
      {/* Hover glow orb */}
      <div
        className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${glow}`}
      />
      {/* Top rim */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <div className="relative z-10">
        <div className="w-11 h-11 rounded-2xl glass flex items-center justify-center mb-5 border border-white/10">
          <Icon size={18} className="text-white/80" />
        </div>
        <h3 className={`font-bold text-white mb-3 ${large ? "text-2xl" : "text-lg"}`}>
          {title}
        </h3>
        <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
      </div>

      {/* Radar animation (large card only) */}
      {large && (
        <div className="absolute bottom-8 right-8 w-28 h-28 opacity-20 group-hover:opacity-35 transition-opacity">
          {[56, 38, 22].map((d, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-emerald-400/60"
              style={{
                width: d,
                height: d,
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
              }}
            />
          ))}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(16,185,129,0.5) 40deg, transparent 40deg)",
              animation: "spin 3s linear infinite",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: 56,
              height: 56,
            }}
          />
        </div>
      )}
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [stats, setStats] = useState<PublicStats>({
    totalZones: 0, totalScans: 0, totalAlerts: 0, activeThreats: 0, activeCampaigns: 0,
  });
  const [scrollProgress, setScrollProgress] = useState(0);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  // Scroll progress normalized to first viewport height (0→1)
  useMotionValueEvent(scrollY, "change", (v) => {
    setScrollProgress(Math.min(v / (window.innerHeight || 800), 1));
  });

  // Hero text parallax
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroY       = useTransform(scrollY, [0, 500], [0, -60]);

  useEffect(() => {
    fetch("http://localhost:5000/api/public/stats")
      .then((r) => r.json())
      .then((d) => { if (d.success && d.data) setStats(d.data); })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen -mt-24">

      {/* ════════════════════ HERO ════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center overflow-hidden"
      >
        {/* ── Earth Globe (right half) ── */}
        <div className="absolute right-0 top-0 bottom-0 w-full md:w-[62%] pointer-events-auto">
          <EarthGlobe
            className="w-full h-full"
            scrollProgress={scrollProgress}
          />

          {/* Left edge fade — blends Earth into the text side */}
          <div
            className="absolute inset-y-0 left-0 w-48 pointer-events-none"
            style={{
              background:
                "linear-gradient(to right, #030712 0%, rgba(3,7,18,0.85) 30%, transparent 100%)",
            }}
          />
          {/* Bottom fade */}
          <div
            className="absolute bottom-0 inset-x-0 h-56 pointer-events-none"
            style={{
              background: "linear-gradient(to top, #030712 0%, transparent 100%)",
            }}
          />
        </div>

        {/* ── Left Text Panel ── */}
        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-8 py-32 pointer-events-none"
        >
          <div className="max-w-lg pointer-events-auto">
            {/* Live badge */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-emerald mb-8"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                System Online · Sentinel Sync Active
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] mb-6"
            >
              Planetary{" "}
              <span className="text-gradient-eco">Defense</span>
              <br />
              Intelligence
              <br />
              <span
                className="text-transparent"
                style={{
                  WebkitTextStroke: "1px rgba(255,255,255,0.2)",
                }}
              >
                Matrix
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="text-base text-zinc-400 leading-relaxed mb-10"
            >
              EcoWatch fuses real-time satellite telemetry with{" "}
              <span className="text-zinc-300 font-medium">Qwen2-VL multimodal AI</span> to
              autonomously detect deforestation, illegal mining, and water
              contamination — globally.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Link href="/auth">
                <motion.button
                  whileHover={{ scale: 1.04, boxShadow: "0 0 40px rgba(16,185,129,0.55)" }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-shimmer group flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm uppercase tracking-wider shadow-[0_0_28px_rgba(16,185,129,0.35)] transition-colors"
                >
                  <Activity size={15} />
                  Initialize Uplink
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
              <Link href="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-7 py-3.5 rounded-2xl glass hover:glass-strong text-white font-semibold text-sm uppercase tracking-wider transition-all"
                >
                  <Eye size={15} className="text-zinc-400" />
                  Live Dashboard
                </motion.button>
              </Link>
            </motion.div>

            {/* Floating stat badges (desktop only) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="hidden lg:flex items-center gap-4 mt-12"
            >
              <div className="glass rounded-2xl px-4 py-2.5 flex items-center gap-2.5">
                <TreePine size={14} className="text-emerald-400" />
                <div>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Zones</p>
                  <p className="text-sm font-bold text-white tabular-nums">
                    <Counter value={stats.totalZones} />
                  </p>
                </div>
              </div>
              <div className="glass rounded-2xl px-4 py-2.5 flex items-center gap-2.5">
                <AlertTriangle size={14} className="text-red-400" />
                <div>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Threats</p>
                  <p className="text-sm font-bold text-white tabular-nums">
                    <Counter value={stats.activeThreats} />
                  </p>
                </div>
              </div>
              <div className="glass rounded-2xl px-4 py-2.5 flex items-center gap-2.5">
                <Satellite size={14} className="text-cyan-400" />
                <div>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Campaigns</p>
                  <p className="text-sm font-bold text-white tabular-nums">
                    <Counter value={stats.activeCampaigns} />
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-zinc-700 z-10"
        >
          <span className="text-[9px] uppercase tracking-widest font-semibold">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.6 }}
          >
            <ChevronDown size={15} />
          </motion.div>
        </motion.div>
      </section>

      {/* ════════════════════ STATS ════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 pb-20 -mt-4 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={TreePine}      label="Protected Zones"  value={stats.totalZones}     color="text-emerald-400" />
          <StatCard icon={Satellite}     label="Scans Completed"  value={stats.totalScans}      color="text-cyan-400"    />
          <StatCard icon={AlertTriangle} label="Alerts Generated" value={stats.totalAlerts}     color="text-amber-400"   />
          <StatCard icon={ShieldAlert}   label="Active Threats"   value={stats.activeThreats}   color="text-red-400"     />
        </div>
      </section>

      {/* ════════════════════ FEATURES ════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 pb-32 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass mb-5">
            <Zap size={11} className="text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Capabilities</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">
            Built for Planetary Scale
          </h2>
          <p className="text-zinc-500 max-w-lg mx-auto text-sm leading-relaxed">
            Every component processes millions of satellite readings and surfaces only the threats that matter.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[260px]">
          <FeatureCard
            icon={Globe2}
            title="Global Threat Mapping"
            description="Real-time rendering of ecological threats across the globe with interactive 3D geospatial visualization. Instantly pinpoint deforestation clusters and coordinate rapid response."
            glow="bg-emerald-500/20"
            delay={0}
            large
          />
          <FeatureCard
            icon={BrainCircuit}
            title="Qwen2-VL Vision AI"
            description="Advanced multi-modal AI analyzes raw satellite RGB images to classify subtle ecological changes before they escalate."
            glow="bg-cyan-500/20"
            delay={0.1}
          />
          <FeatureCard
            icon={Satellite}
            title="Sentinel API Sync"
            description="Continuous ingestion from Sentinel-2 and Landsat with zero-latency NDVI processing across all monitored zones."
            glow="bg-violet-500/20"
            delay={0.2}
          />
          <FeatureCard
            icon={BarChart3}
            title="Predictive Risk Analytics"
            description="ML-powered risk scores and trend analysis surface zones at highest risk before a visible threat emerges."
            glow="bg-amber-500/20"
            delay={0.3}
          />
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35, duration: 0.65 }}
          className="mt-4 glass-emerald rounded-3xl p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden"
        >
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <ShieldAlert className="text-emerald-400 mb-4" size={26} />
            <h3 className="text-2xl font-bold text-white mb-2">Automated Officer Dispatch</h3>
            <p className="text-zinc-400 max-w-lg text-sm leading-relaxed">
              When a high-confidence threat is detected, EcoWatch automatically generates a legal
              report and pings field officers via encrypted WebSockets in real time.
            </p>
          </div>
          <Link href="/auth" className="relative z-10 shrink-0">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="btn-shimmer flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm uppercase tracking-wider shadow-[0_0_24px_rgba(16,185,129,0.4)] transition-colors"
            >
              Join the Network
              <ArrowRight size={15} />
            </motion.button>
          </Link>
        </motion.div>
      </section>

      {/* ════════════════════ TICKER ════════════════════ */}
      <div className="w-full border-y border-white/5 glass py-4 overflow-hidden relative z-10">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#030712] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#030712] to-transparent z-10 pointer-events-none" />
        <motion.div
          animate={{ x: [0, "-50%"] }}
          transition={{ repeat: Infinity, duration: 32, ease: "linear" }}
          className="flex whitespace-nowrap gap-16 px-8 text-[10px] font-semibold tracking-[0.12em] text-zinc-600 uppercase select-none"
        >
          {[...Array(2)].map((_, rep) => (
            <div key={rep} className="flex gap-16 items-center">
              <span>{stats.totalZones} Protected Zones Active</span>
              <span className="text-emerald-700">◆</span>
              <span className="text-emerald-500">{stats.totalScans} Satellite Scans Completed</span>
              <span className="text-emerald-700">◆</span>
              <span className="text-red-500">{stats.activeThreats} Active Threats</span>
              <span className="text-emerald-700">◆</span>
              <span className="text-cyan-500">Qwen2-VL AI Analysis — Online</span>
              <span className="text-emerald-700">◆</span>
              <span>Sentinel-2 L2A — Synced</span>
              <span className="text-emerald-700">◆</span>
              <span>{stats.activeCampaigns} Active Campaigns</span>
              <span className="text-emerald-700">◆</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
