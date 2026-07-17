"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight, Satellite, ShieldAlert, BrainCircuit, Activity, Globe2, TreePine, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { HoloLogo } from "@/components/ui/HoloLogo";

interface PublicStats {
  totalZones:       number;
  totalScans:       number;
  totalAlerts:      number;
  activeThreats:    number;
  activeCampaigns:  number;
}

const FADE_UP = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, type: "spring", stiffness: 100 } }
};

const STAGGER = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export default function Home() {
  const [stats, setStats] = useState<PublicStats>({ totalZones: 0, totalScans: 0, totalAlerts: 0, activeThreats: 0, activeCampaigns: 0 });

  useEffect(() => {
    // Fetch real stats from public API (no auth needed)
    fetch("http://localhost:5000/api/public/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) setStats(d.data);
      })
      .catch(() => {}); // Fail silently — defaults remain
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden -mt-24 pt-24 pb-20">
      
      {/* ── BACKGROUND EFFECTS ── */}
      <div className="absolute top-0 inset-x-0 h-screen w-full bg-[#020617] -z-20" />
      
      {/* Massive subtle background logo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] opacity-[0.03] pointer-events-none -z-10 mix-blend-screen">
        <HoloLogo />
      </div>
      
      {/* Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* ── HERO SECTION ── */}
      <motion.section 
        variants={STAGGER}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto px-4 pt-20 pb-32 flex flex-col items-center text-center relative"
      >
        <motion.div variants={FADE_UP} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono tracking-widest uppercase text-emerald-400">System Online • Monitoring Active</span>
        </motion.div>

        <motion.h1 variants={FADE_UP} className="text-5xl md:text-8xl font-bold tracking-tight text-white mb-6">
          Planetary Defense <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-500">
            Intelligence Matrix
          </span>
        </motion.h1>

        <motion.p variants={FADE_UP} className="text-lg md:text-xl text-zinc-400 max-w-3xl mb-10 leading-relaxed">
          EcoWatch utilizes real-time satellite telemetry and Qwen2-VL multimodal AI to autonomously detect deforestation, illegal mining, and water contamination across the globe.
        </motion.p>

        <motion.div variants={FADE_UP} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/auth">
            <button className="w-full sm:w-auto px-8 py-4 rounded-none bg-emerald-600 hover:bg-emerald-500 text-white font-mono uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-3 group relative overflow-hidden">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              <Activity size={18} />
              Initialize Uplink
            </button>
          </Link>
          
          <Link href="/dashboard">
            <button className="w-full sm:w-auto px-8 py-4 rounded-none bg-white/5 border border-white/10 hover:bg-white/10 text-white font-mono uppercase tracking-widest transition-all flex items-center justify-center gap-3 group">
              View Live Dashboard
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </motion.div>

        {/* Real-time Live Stats */}
        <motion.div 
          variants={FADE_UP}
          className="absolute left-10 top-40 hidden lg:flex flex-col gap-2 p-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl"
        >
          <span className="text-[10px] font-mono text-emerald-500 uppercase">Zones Monitored</span>
          <div className="flex items-center gap-2">
            <TreePine size={16} className="text-emerald-400" />
            <span className="text-2xl font-bold text-white">{stats.totalZones}</span>
          </div>
        </motion.div>

        <motion.div 
          variants={FADE_UP}
          className="absolute right-10 bottom-20 hidden lg:flex flex-col gap-2 p-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl"
        >
          <span className="text-[10px] font-mono text-red-400 uppercase">Active Threats</span>
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-2xl font-bold text-white">{stats.activeThreats}</span>
          </div>
        </motion.div>

        <motion.div 
          variants={FADE_UP}
          className="absolute right-10 top-40 hidden lg:flex flex-col gap-2 p-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl"
        >
          <span className="text-[10px] font-mono text-emerald-400 uppercase">Active Campaigns</span>
          <div className="flex items-center gap-2">
            <Satellite size={16} className="text-emerald-400" />
            <span className="text-2xl font-bold text-white">{stats.activeCampaigns}</span>
          </div>
        </motion.div>
      </motion.section>

      {/* ── BENTO GRID FEATURES ── */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]">
          
          {/* Box 1: Large Threat Map Mock */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="md:col-span-2 md:row-span-2 rounded-3xl bg-black/40 backdrop-blur-md border border-white/5 p-8 relative overflow-hidden group hover:border-emerald-500/30 transition-colors"
          >
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 group-hover:bg-emerald-500/10 transition-colors" />
            <Globe2 className="text-emerald-500 mb-6" size={32} />
            <h3 className="text-2xl font-bold text-white mb-3">Global Threat Mapping</h3>
            <p className="text-zinc-400 max-w-md">
              Real-time rendering of ecological threats mapped across the globe using interactive 3D geospatial visualization. Instantly pinpoint deforestation clusters.
            </p>
            {/* Mock Radar UI */}
            <div className="absolute bottom-8 right-8 w-40 h-40 border border-emerald-500/20 rounded-full flex items-center justify-center opacity-50">
              <div className="w-30 h-30 border border-emerald-500/20 rounded-full" />
              <div className="w-20 h-20 border border-emerald-500/20 rounded-full" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500/20 to-transparent animate-[spin_3s_linear_infinite]" style={{ clipPath: "polygon(50% 50%, 100% 0, 100% 100%)" }} />
            </div>
          </motion.div>

          {/* Box 2: Qwen AI */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl bg-black/40 backdrop-blur-md border border-white/5 p-8 relative overflow-hidden group hover:border-cyan-500/30 transition-colors"
          >
            <BrainCircuit className="text-cyan-500 mb-6" size={32} />
            <h3 className="text-xl font-bold text-white mb-2">Qwen2-VL Vision</h3>
            <p className="text-sm text-zinc-400">
              Advanced multi-modal AI analyzes raw satellite RGB images to classify subtle ecological changes before they escalate.
            </p>
          </motion.div>

          {/* Box 3: Real Time Ingestion */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl bg-black/40 backdrop-blur-md border border-white/5 p-8 relative overflow-hidden group hover:border-emerald-500/30 transition-colors"
          >
            <Satellite className="text-emerald-500 mb-6" size={32} />
            <h3 className="text-xl font-bold text-white mb-2">Sentinel API Sync</h3>
            <p className="text-sm text-zinc-400">
              Continuous ingestion pipelines from Sentinel-2 and Landsat.
            </p>
          </motion.div>

          {/* Box 4: Instant Alerts */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="md:col-span-3 rounded-3xl bg-gradient-to-r from-emerald-900/20 to-cyan-900/20 backdrop-blur-md border border-emerald-500/20 p-8 flex flex-col md:flex-row items-center justify-between gap-8"
          >
            <div>
              <ShieldAlert className="text-emerald-400 mb-4" size={32} />
              <h3 className="text-2xl font-bold text-white mb-2">Automated Officer Dispatch</h3>
              <p className="text-zinc-400 max-w-xl">
                When a high-confidence threat is detected, EcoWatch automatically generates a report and pings on-ground field officers via encrypted WebSockets.
              </p>
            </div>
            <Link href="/auth">
              <button className="whitespace-nowrap px-6 py-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 rounded-full font-mono text-sm uppercase tracking-widest transition-colors">
                Join Network
              </button>
            </Link>
          </motion.div>

        </div>
      </section>

      {/* ── STATS TICKER — Real data ── */}
      <div className="w-full border-y border-white/5 bg-black/50 py-4 mt-20 overflow-hidden flex">
        <motion.div 
          animate={{ x: [0, -1200] }}
          transition={{ repeat: Infinity, duration: 22, ease: "linear" }}
          className="flex whitespace-nowrap gap-16 px-8 text-sm font-mono tracking-widest text-zinc-500 uppercase"
        >
          <span>{stats.totalZones} Protected Zones Active</span>
          <span>•</span>
          <span className="text-emerald-500">{stats.totalScans} Satellite Scans Completed</span>
          <span>•</span>
          <span className="text-red-400">{stats.activeThreats} Active Threats</span>
          <span>•</span>
          <span className="text-cyan-500">Qwen2-VL AI Analysis — Online</span>
          <span>•</span>
          <span>Sentinel-2 L2A — Synced</span>
          <span>•</span>
          <span>{stats.totalZones} Protected Zones Active</span>
          <span>•</span>
          <span className="text-emerald-500">{stats.totalScans} Satellite Scans Completed</span>
          <span>•</span>
          <span className="text-red-400">{stats.activeThreats} Active Threats</span>
          <span>•</span>
          <span className="text-cyan-500">Qwen2-VL AI Analysis — Online</span>
          <span>•</span>
          <span>Sentinel-2 L2A — Synced</span>
        </motion.div>
      </div>

    </div>
  );
}
