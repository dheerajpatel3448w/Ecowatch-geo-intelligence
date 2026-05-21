"use client";

import { motion } from "framer-motion";
import { Activity, Code, Globe, Shield, Hexagon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();

  // Hide footer on full-screen pages like auth, dashboard, and zones
  if (pathname === "/auth" || pathname === "/dashboard" || pathname === "/zones") {
    return null;
  }

  return (
    <footer className="w-full relative z-20 border-t border-white/5 bg-black/80 backdrop-blur-xl mt-20">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Hexagon className="text-emerald-500" size={24} />
              <span className="text-xl font-bold tracking-widest text-white">ECOWATCH</span>
            </div>
            <p className="text-sm text-zinc-500 max-w-sm">
              Global Environmental Intelligence Network. Utilizing advanced Qwen2-VL architectures and orbital satellite telemetry to predict and prevent ecological collapse.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-mono text-emerald-500 tracking-widest uppercase">System Online • Core Stable</span>
            </div>
          </div>

          {/* Links Column 1 */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase">Directives</h3>
            <ul className="flex flex-col gap-2 text-sm text-zinc-400">
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">Mission Overview</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">Global Map</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">Threat Models</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">Analytics</Link></li>
            </ul>
          </div>

          {/* Links Column 2 */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase">Network</h3>
            <ul className="flex flex-col gap-2 text-sm text-zinc-400">
              <li>
                <a href="#" className="hover:text-emerald-400 transition-colors flex items-center gap-2">
                  <Code size={16} /> Data Repository
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-emerald-400 transition-colors flex items-center gap-2">
                  <Activity size={16} /> API Status
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-emerald-400 transition-colors flex items-center gap-2">
                  <Shield size={16} /> Security Clearance
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600 font-mono">
            © {new Date().getFullYear()} EcoWatch Global Intelligence. Classified.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-zinc-600 hover:text-emerald-500 transition-colors"><Globe size={18} /></a>
            <a href="#" className="text-zinc-600 hover:text-emerald-500 transition-colors"><Code size={18} /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
