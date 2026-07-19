"use client";

import { motion } from "framer-motion";
import { Globe, GitBranch, ExternalLink, Leaf } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const FULL_SCREEN_ROUTES = ["/auth", "/dashboard", "/zones"];

const footerLinks = {
  Platform: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Monitoring", href: "/monitoring" },
    { label: "Mission Control", href: "/zones" },
    { label: "Historical", href: "/historical" },
  ],
  Intelligence: [
    { label: "Analytics", href: "/dashboard" },
    { label: "Legal & FIR", href: "/legal" },
    { label: "Data Export", href: "/export" },
    { label: "Public Portal", href: "/public" },
  ],
};

export function Footer() {
  const pathname = usePathname();
  if (FULL_SCREEN_ROUTES.some((r) => pathname === r)) return null;

  return (
    <footer className="relative z-20 mt-24 border-t border-white/5">
      {/* Top shimmer border */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

      <div className="glass-strong">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20">

            {/* Brand */}
            <div className="md:col-span-1 flex flex-col gap-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl glass-emerald flex items-center justify-center">
                  <Leaf size={15} className="text-emerald-400" />
                </div>
                <span className="text-[15px] font-bold tracking-tight text-white">
                  Eco<span className="text-emerald-400">Watch</span>
                </span>
              </div>

              <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
                Global Environmental Intelligence Network. Powered by Qwen2-VL AI and orbital satellite telemetry.
              </p>

              {/* Live status pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-emerald w-max">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
                  System Online
                </span>
              </div>

              {/* Social icons */}
              <div className="flex items-center gap-3 mt-1">
                {[Globe, GitBranch, ExternalLink].map((Icon, i) => (
                  <motion.a
                    key={i}
                    href="#"
                    whileHover={{ scale: 1.15, y: -1 }}
                    className="w-8 h-8 rounded-full glass flex items-center justify-center text-zinc-500 hover:text-emerald-400 transition-colors"
                  >
                    <Icon size={14} />
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Links */}
            {Object.entries(footerLinks).map(([section, items]) => (
              <div key={section} className="flex flex-col gap-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                  {section}
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {items.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="text-sm text-zinc-500 hover:text-white transition-colors duration-200 hover:translate-x-0.5 inline-block"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-zinc-600">
              © {new Date().getFullYear()} EcoWatch Global Intelligence. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-[11px] text-zinc-600">
              <a href="#" className="hover:text-zinc-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-zinc-400 transition-colors">Terms</a>
              <a href="#" className="hover:text-zinc-400 transition-colors">Security</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
