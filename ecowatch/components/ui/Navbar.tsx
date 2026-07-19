"use client";

import { useState, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import { HoloLogo } from "./HoloLogo";
import {
  Bell,
  User,
  BrainCircuit,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Activity,
  LayoutDashboard,
  Map,
  MonitorPlay,
  History,
  Scale,
  Download,
  ShieldCheck,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ── Nav link icons map ────────────────────────────────────────────────────────
const LINK_ICONS: Record<string, React.ElementType> = {
  home:       Home,
  public:     Activity,
  dashboard:  LayoutDashboard,
  zones:      Map,
  monitoring: MonitorPlay,
  historical: History,
  legal:      Scale,
  export:     Download,
  admin:      ShieldCheck,
};

// ── Separator ─────────────────────────────────────────────────────────────────
function NavSeparator() {
  return <div className="hidden lg:block w-px h-5 bg-white/10 mx-1" />;
}

// ── Status Dot ────────────────────────────────────────────────────────────────
function StatusDot({ online }: { online: boolean }) {
  return (
    <span className="relative flex h-2 w-2">
      {online && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full h-2 w-2",
          online ? "bg-emerald-400" : "bg-red-400"
        )}
      />
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const [mlOnline, setMlOnline]           = useState<boolean | null>(null);
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [userMenuOpen, setUserMenuOpen]   = useState(false);
  const [scrolled, setScrolled]           = useState(false);
  const pathname                          = usePathname();
  const { scrollY }                       = useScroll();
  const userMenuRef                       = useRef<HTMLDivElement>(null);

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 10));

  // ML health check
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch("http://localhost:8001/api/health", {
          signal: AbortSignal.timeout(3000),
        });
        setMlOnline(r.ok);
      } catch {
        setMlOnline(false);
      }
    };
    check();
    const iv = setInterval(check, 15000);
    return () => clearInterval(iv);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const publicLinks = [
    { id: "home",   label: "Home",          href: "/" },
    { id: "public", label: "Public Portal", href: "/public" },
  ];
  const authLinks = [
    { id: "dashboard",  label: "Dashboard",    href: "/dashboard" },
    { id: "zones",      label: "Zones",        href: "/zones" },
    { id: "monitoring", label: "Monitoring",   href: "/monitoring" },
    { id: "historical", label: "Historical",   href: "/historical" },
    { id: "legal",      label: "Legal",        href: "/legal" },
    { id: "export",     label: "Export",       href: "/export" },
  ];
  if (user?.role === "admin")
    authLinks.push({ id: "admin", label: "Admin", href: "/admin" });

  const links = isAuthenticated ? authLinks : publicLinks;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="fixed top-0 inset-x-0 z-50 px-4 pt-3.5">

      {/* ─── Glassmorphism Bar ────────────────────────────────────────────── */}
      <motion.div
        initial={{ y: -90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "relative w-full max-w-6xl mx-auto flex items-center justify-between",
          "rounded-2xl overflow-hidden",
          "transition-all duration-500"
        )}
        style={{
          // Core glassmorphism — layered for depth
          background: scrolled
            ? "rgba(8, 14, 30, 0.72)"
            : "rgba(8, 14, 30, 0.45)",
          backdropFilter: "blur(28px) saturate(180%)",
          WebkitBackdropFilter: "blur(28px) saturate(180%)",
          boxShadow: scrolled
            ? "0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.07)"
            : "inset 0 1px 0 rgba(255,255,255,0.07), 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        {/* Noise texture overlay for premium feel */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Top highlight rim */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        {/* Bottom subtle separator */}
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

        {/* Emerald glow bloom (accent light source) */}
        <div
          className="absolute -top-8 left-1/2 -translate-x-1/2 w-64 h-16 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, rgba(16,185,129,0.12) 0%, transparent 70%)",
          }}
        />

        {/* ── SECTION A: Brand ── */}
        <div className="flex items-center pl-4 py-2.5 pr-3 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <HoloLogo />
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-bold tracking-tight text-white">
                Eco<span className="text-emerald-400">Watch</span>
              </span>
              <span className="text-[9px] text-emerald-500/60 uppercase tracking-[0.22em] font-semibold mt-0.5">
                Orbital Intel
              </span>
            </div>
          </Link>
        </div>

        {/* Vertical divider */}
        <div className="hidden lg:block w-px h-9 bg-gradient-to-b from-transparent via-white/10 to-transparent shrink-0" />

        {/* ── SECTION B: Nav Links (desktop) ── */}
        <div className="hidden lg:flex flex-1 items-center px-3 gap-0.5">
          {links.map((link, i) => {
            const Icon = LINK_ICONS[link.id] ?? Activity;
            const active = isActive(link.href);
            return (
              <Link
                key={link.id}
                href={link.href}
                className={cn(
                  "group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium uppercase tracking-wider transition-all duration-200 select-none",
                  active
                    ? "text-emerald-300"
                    : "text-zinc-500 hover:text-zinc-200"
                )}
              >
                {/* Active background */}
                {active && (
                  <motion.div
                    layoutId="navActive"
                    className="absolute inset-0 rounded-xl"
                    transition={{ type: "spring", bounce: 0.1, duration: 0.45 }}
                    style={{
                      background: "rgba(16,185,129,0.12)",
                      boxShadow: "inset 0 1px 0 rgba(16,185,129,0.15), 0 0 0 1px rgba(16,185,129,0.15)",
                    }}
                  />
                )}

                {/* Hover background */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200",
                    !active && "group-hover:opacity-100"
                  )}
                  style={{ background: "rgba(255,255,255,0.04)" }}
                />

                <Icon
                  size={11}
                  className={cn(
                    "relative z-10 shrink-0 transition-colors",
                    active ? "text-emerald-400" : "text-zinc-600 group-hover:text-zinc-400"
                  )}
                />
                <span className="relative z-10">{link.label}</span>

                {/* Active underline dot */}
                {active && (
                  <motion.span
                    layoutId="navDot"
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* ── SECTION C: Right Controls ── */}
        <div className="flex items-center gap-2 pr-3 py-2 pl-2 shrink-0">

          {/* Vertical divider */}
          <div className="hidden lg:block w-px h-9 bg-gradient-to-b from-transparent via-white/10 to-transparent shrink-0 mr-1" />

          {/* ML Status */}
          {isAuthenticated && mlOnline !== null && (
            <div
              className={cn(
                "hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest",
                mlOnline
                  ? "border border-emerald-500/20 bg-emerald-500/8 text-emerald-400"
                  : "border border-red-500/20 bg-red-500/8 text-red-400"
              )}
              style={{ backdropFilter: "blur(8px)" }}
            >
              <BrainCircuit size={10} />
              <span className="hidden xl:block">{mlOnline ? "AI Online" : "AI Offline"}</span>
              <StatusDot online={mlOnline} />
            </div>
          )}

          {/* Not authenticated → Sign In + Get Access */}
          {!isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link href="/auth">
                <span className="hidden sm:block text-[11px] font-medium text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer px-2 py-1.5 rounded-lg hover:bg-white/5">
                  Sign In
                </span>
              </Link>
              <Link href="/auth?tab=register">
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(16,185,129,0.45)" }}
                  whileTap={{ scale: 0.97 }}
                  className="relative overflow-hidden flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[11px] font-semibold uppercase tracking-wider text-white transition-all"
                  style={{
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    boxShadow: "0 0 16px rgba(16,185,129,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.1), transparent)",
                    }}
                  />
                  Get Access
                </motion.button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Bell */}
              <button
                className="relative p-2 rounded-xl text-zinc-500 hover:text-white transition-all hover:bg-white/6"
                style={{ backdropFilter: "blur(8px)" }}
              >
                <Bell size={15} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping opacity-75" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
              </button>

              {/* User dropdown */}
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen((p) => !p)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all duration-200",
                    userMenuOpen
                      ? "bg-white/8 border border-white/10"
                      : "hover:bg-white/5 border border-transparent"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #10b981, #06b6d4)",
                      boxShadow: "0 0 12px rgba(16,185,129,0.4)",
                    }}
                  >
                    <User size={13} className="text-white" />
                  </div>

                  {/* User info */}
                  <div className="hidden sm:flex flex-col text-left leading-none">
                    <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-semibold">
                      {user?.role || "Officer"}
                    </span>
                    <span className="text-[12px] text-zinc-200 font-semibold mt-0.5">
                      {user?.name?.split(" ")[0] || "User"}
                    </span>
                  </div>

                  <ChevronDown
                    size={12}
                    className={cn(
                      "text-zinc-600 transition-transform duration-200 hidden sm:block",
                      userMenuOpen && "rotate-180 text-zinc-400"
                    )}
                  />
                </button>

                {/* Dropdown */}
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.95 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 top-full mt-2 w-56 rounded-2xl overflow-hidden"
                      style={{
                        background: "rgba(10, 16, 35, 0.90)",
                        backdropFilter: "blur(32px) saturate(200%)",
                        WebkitBackdropFilter: "blur(32px) saturate(200%)",
                        boxShadow:
                          "0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(255,255,255,0.08)",
                      }}
                    >
                      {/* Profile header */}
                      <div className="px-4 py-3 border-b border-white/6">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)" }}
                          >
                            <User size={16} className="text-white" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[13px] text-white font-semibold truncate">
                              {user?.name || "User"}
                            </span>
                            <span className="text-[10px] text-zinc-500 truncate mt-0.5">
                              {user?.email}
                            </span>
                          </div>
                        </div>
                        {/* Role badge */}
                        <div className="mt-2.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                            {user?.role || "Officer"}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="p-1.5">
                        <button
                          onClick={() => { logout(); setUserMenuOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 text-[12px] font-medium transition-colors group"
                        >
                          <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                            <LogOut size={11} className="text-red-400" />
                          </div>
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen((p) => !p)}
            className="lg:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/6 transition-all"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mobileOpen ? "x" : "menu"}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {mobileOpen ? <X size={16} /> : <Menu size={16} />}
              </motion.div>
            </AnimatePresence>
          </button>
        </div>
      </motion.div>

      {/* ─── Mobile Menu ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-4 right-4 mt-2 rounded-2xl overflow-hidden"
            style={{
              background: "rgba(8, 14, 30, 0.88)",
              backdropFilter: "blur(32px) saturate(200%)",
              WebkitBackdropFilter: "blur(32px) saturate(200%)",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(255,255,255,0.07)",
            }}
          >
            <div className="p-2">
              {links.map((link) => {
                const Icon = LINK_ICONS[link.id] ?? Activity;
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.id}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all",
                      active
                        ? "text-emerald-300 bg-emerald-500/10 border border-emerald-500/15"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon
                      size={14}
                      className={active ? "text-emerald-400" : "text-zinc-600"}
                    />
                    {link.label}
                    {active && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Mobile footer */}
            {isAuthenticated && (
              <>
                <div className="h-px bg-white/6 mx-2" />
                <div className="p-2">
                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/8 transition-colors"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
