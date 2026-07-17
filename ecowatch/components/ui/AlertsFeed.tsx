"use client";

import { motion } from "framer-motion";
import { Alert } from "@/types/dashboard.types";
import { formatDistanceToNow } from "date-fns";
import { Crosshair, MapPin, CheckCircle2, ShieldAlert, Satellite, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertsFeedProps {
  alerts: Alert[];
  onFocus: (coords: [number, number]) => void;
  onResolve: (id: string) => void;
  onViewDetails: (alert: Alert) => void;
  riskScores: any[];
}

export function AlertsFeed({ alerts, onFocus, onResolve, onViewDetails, riskScores }: AlertsFeedProps) {
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL": return "text-red-500 bg-red-500/10 border-red-500/30";
      case "HIGH": return "text-amber-500 bg-amber-500/10 border-amber-500/30";
      case "MEDIUM": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/30";
      default: return "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";
    }
  };

  const activeAlerts = alerts.filter(a => a.status !== "RESOLVED" && a.status !== "FALSE_ALARM");

  return (
    <div className="w-[360px] h-full flex flex-col gap-4">
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col h-full overflow-hidden">
        
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <h3 className="text-[10px] font-mono tracking-widest uppercase text-white">Live Alert Feed</h3>
          </div>
          <span className="text-xs font-mono text-zinc-500">{activeAlerts.length} Active</span>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {activeAlerts.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-sm font-mono">
              No active threats detected.
            </div>
          ) : (
            activeAlerts.map((alert, idx) => (
              <motion.div
                key={alert._id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl p-4 transition-all cursor-pointer"
                onClick={() => {
                  if (alert.hotspot) {
                    onFocus([alert.hotspot.lat, alert.hotspot.lng]);
                  } else {
                    onFocus([20.5937, 78.9629]);
                  }
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn("text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border", getSeverityColor(alert.severity))}>
                      {alert.severity}
                    </span>
                    {/* Source Badge */}
                    {(alert as any).source === 'field_report' ? (
                      <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border bg-orange-500/10 border-orange-500/30 text-orange-400 flex items-center gap-1">
                        <UserCheck size={9} /> Field Intel
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border bg-cyan-500/10 border-cyan-500/30 text-cyan-400 flex items-center gap-1">
                        <Satellite size={9} /> Satellite
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                    {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                  </span>
                </div>
                
                <p className="text-sm text-zinc-300 font-medium mb-3 leading-snug line-clamp-2">
                  {alert.message}
                </p>

                {alert.hotspot && (
                  <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono mb-4">
                    <MapPin size={12} />
                    {alert.hotspot.lat.toFixed(4)}, {alert.hotspot.lng.toFixed(4)}
                  </div>
                )}

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onResolve(alert._id); }}
                    className="flex-1 flex items-center justify-center gap-2 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-mono uppercase tracking-widest transition-colors"
                  >
                    <CheckCircle2 size={12} /> Resolve
                  </button>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (alert.hotspot) {
                        onFocus([alert.hotspot.lat, alert.hotspot.lng]); 
                      } else {
                        onFocus([20.5937, 78.9629]); 
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded text-[10px] font-mono uppercase tracking-widest transition-colors"
                  >
                    <Crosshair size={12} /> Focus
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onViewDetails(alert); }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded text-[10px] font-mono uppercase tracking-widest transition-colors"
                  >
                    Details
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* F4: Top Risk Zones Table */}
      {riskScores.length > 0 && (
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
          <h3 className="text-[10px] font-mono tracking-widest uppercase text-red-400">Top Risk Zones</h3>
          <div className="flex flex-col gap-1.5">
            {[...riskScores]
              .sort((a, b) => b.riskScore - a.riskScore)
              .slice(0, 5)
              .map((zone: any, i: number) => {
                const score = zone.riskScore ?? 0;
                const color = score >= 75 ? 'text-red-400' : score >= 50 ? 'text-orange-400' : score >= 25 ? 'text-amber-400' : 'text-emerald-400';
                const dot   = score >= 75 ? 'bg-red-500'  : score >= 50 ? 'bg-orange-500'  : score >= 25 ? 'bg-amber-500'  : 'bg-emerald-500';
                return (
                  <div key={i} className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                    <span className="text-[10px] text-zinc-300 truncate flex-1">{zone.zoneName}</span>
                    <span className={`text-[10px] font-mono font-bold ${color}`}>{score.toFixed(1)}</span>
                    <a
                      href="/legal"
                      className="text-[9px] font-mono text-cyan-500 hover:text-cyan-300 border border-cyan-500/20 px-1.5 py-0.5 rounded hover:bg-cyan-500/10 transition-colors"
                    >
                      FIR
                    </a>
                  </div>
                );
              })
            }
          </div>
        </div>
      )}
    </div>
  );
}
