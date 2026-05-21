"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { dashboardService } from "@/lib/api/dashboard";
import { Alert, AnalyticsResponse, AlertsOverTimeResponse } from "@/types/dashboard.types";
import { AnalyticsPanel } from "@/components/ui/AnalyticsPanel";
import { AlertsFeed } from "@/components/ui/AlertsFeed";
import { ThreatDetailsModal } from "@/components/ui/ThreatDetailsModal";
import { io } from "socket.io-client";
import { toast, Toaster } from "sonner";
import { ShieldAlert, RefreshCw } from "lucide-react";

// Dynamically import Leaflet Map (SSR False)
const InteractiveMap = dynamic(() => import("@/components/ui/Map"), { ssr: false });

export default function DashboardPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [alertsOverTime, setAlertsOverTime] = useState<AlertsOverTimeResponse | null>(null);
  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    const [alertsRes, analyticsRes, overTimeRes] = await Promise.all([
      dashboardService.getAlerts(),
      dashboardService.getThreatDistribution(),
      dashboardService.getAlertsOverTime(6)
    ]);
    
    if (alertsRes.success) setAlerts(alertsRes.data);
    if (analyticsRes.success) setAnalytics(analyticsRes);
    if (overTimeRes.success) setAlertsOverTime(overTimeRes);
  };

  useEffect(() => {
    fetchData();

    // Socket.IO Setup
    const socket = io("http://localhost:5000");

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socket.on("new_alert", (newAlert: Alert) => {
      // Add to feed
      setAlerts(prev => {
        // avoid duplicates
        if (prev.find(a => a._id === newAlert._id)) return prev;
        return [newAlert, ...prev];
      });
      
      // Update analytics (mock increment)
      fetchData();

      // Sonner Toast Notification
      toast.custom((t) => (
        <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/30 p-4 rounded-xl flex items-start gap-4 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          <ShieldAlert className="text-red-500 shrink-0 mt-1" />
          <div className="flex flex-col gap-1">
            <h1 className="text-red-500 font-bold font-mono uppercase tracking-widest text-sm">New Threat Detected</h1>
            <p className="text-zinc-300 text-sm">{newAlert.message}</p>
            <button 
              onClick={() => {
                toast.dismiss(t);
                if (newAlert.hotspot) setFocusCoords([newAlert.hotspot.lat, newAlert.hotspot.lng]);
              }}
              className="mt-2 text-xs font-mono text-red-400 hover:text-red-300 uppercase tracking-widest text-left"
            >
              [ View Coordinates ]
            </button>
          </div>
        </div>
      ), { duration: 10000 });
    });

    socket.on("alert_updated", (updatedAlert: Alert) => {
      setAlerts(prev => prev.map(a => a._id === updatedAlert._id ? updatedAlert : a));
      fetchData(); // Refresh analytics to reflect updated stats
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleResolveAlert = async (id: string) => {
    const res = await dashboardService.updateAlertStatus(id, "RESOLVED", "Resolved via Dashboard");
    if (res.success) {
      setAlerts(prev => prev.filter(a => a._id !== id));
      toast.success("Threat marked as resolved.");
      fetchData(); // Refresh analytics
    } else {
      toast.error("Failed to resolve threat.");
    }
  };

  return (
    <div className="fixed inset-0 pt-20 pb-4 px-4 bg-[#020617] overflow-hidden flex flex-col pointer-events-auto z-10">
      
      {/* Sonner Toaster */}
      <Toaster position="top-center" theme="dark" />

      {/* Header Status Bar */}
      <div className="w-full h-10 mb-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-zinc-500 uppercase">Command Center</span>
          <span className="text-zinc-700">/</span>
          <span className="text-xs font-mono text-emerald-500 tracking-widest">Global Overview</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Uplink:</span>
            {isConnected ? (
              <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Secure
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-mono text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Offline
              </span>
            )}
          </div>
          <button onClick={fetchData} className="text-zinc-500 hover:text-white transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Main HUD Layout */}
      <div className="flex-1 flex gap-4 overflow-hidden relative z-20">
        
        {/* Left Analytics Panel */}
        <motion.div 
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="h-full z-20"
        >
          <AnalyticsPanel analytics={analytics} alertsOverTime={alertsOverTime} />
        </motion.div>

        {/* Center Live Map (Background) */}
        <div className="absolute inset-0 z-0 rounded-2xl overflow-hidden border border-white/5 opacity-80 mix-blend-screen pointer-events-auto shadow-[0_0_50px_rgba(16,185,129,0.05)]">
          <InteractiveMap alerts={alerts} focusCoords={focusCoords} />
          
          {/* Vignette Overlay for Sci-Fi Effect */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,6,23,0.8)_100%)] z-10" />
        </div>

        {/* Right Alerts Feed Panel */}
        <motion.div 
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
          className="h-full z-20 ml-auto"
        >
          <AlertsFeed 
            alerts={alerts} 
            onFocus={setFocusCoords} 
            onResolve={handleResolveAlert} 
            onViewDetails={setSelectedAlert}
          />
        </motion.div>

      </div>
      
      {/* HUD Modal Overlay */}
      <ThreatDetailsModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
    </div>
  );
}
