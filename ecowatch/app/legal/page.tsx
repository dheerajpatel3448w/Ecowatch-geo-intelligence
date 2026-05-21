"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, ShieldAlert, FileText, CloudRain, TreeDeciduous, DollarSign, Activity, AlertTriangle, Loader2 } from "lucide-react";
import { legalService } from "@/lib/api/legal";
import { ZoneRiskData, SingleZoneRiskData, CarbonLossData } from "@/types/legal.types";
import { toast } from "sonner";
import { LegalBackground } from "@/components/ui/LegalBackground";

// Circular Progress Component for Risk Score
const RiskRing = ({ score, color }: { score: number, color: string }) => {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-12 h-12">
      <svg className="transform -rotate-90 w-12 h-12">
        <circle cx="24" cy="24" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/10" />
        <motion.circle
          cx="24"
          cy="24"
          r={radius}
          stroke={color}
          strokeWidth="4"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ strokeLinecap: "round" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-mono font-bold text-white">{score}</span>
      </div>
    </div>
  );
};

export default function LegalDashboard() {
  const [riskScores, setRiskScores] = useState<ZoneRiskData[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  
  // Selected Zone State
  const [zoneRisk, setZoneRisk] = useState<SingleZoneRiskData | null>(null);
  const [carbonLoss, setCarbonLoss] = useState<CarbonLossData | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isGeneratingFIR, setIsGeneratingFIR] = useState(false);

  // Currency Toggle
  const [showUSD, setShowUSD] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (selectedZoneId) {
      fetchZoneDetails(selectedZoneId);
    }
  }, [selectedZoneId]);

  const fetchLeaderboard = async () => {
    setIsLoadingList(true);
    const res = await legalService.getAllRiskScores();
    if (res.success) setRiskScores(res.data);
    setIsLoadingList(false);
  };

  const fetchZoneDetails = async (id: string) => {
    setIsLoadingDetails(true);
    const [riskRes, carbonRes] = await Promise.all([
      legalService.getZoneRiskScore(id),
      legalService.getCarbonLoss(id)
    ]);
    
    if (riskRes.success) setZoneRisk(riskRes.data);
    if (carbonRes.success && carbonRes.data) setCarbonLoss(carbonRes.data);
    else setCarbonLoss(null); // No sufficient scans
    
    setIsLoadingDetails(false);
  };

  const handleGenerateFIR = async () => {
    if (!selectedZoneId || !zoneRisk) return;
    setIsGeneratingFIR(true);
    toast.info("Compiling Satellite Evidence & Generating FIR...");
    
    const success = await legalService.downloadFIRReport(selectedZoneId, zoneRisk.zone.name);
    
    if (success) {
      toast.success("Legal FIR PDF Generated Successfully!");
    } else {
      toast.error("Failed to generate FIR. Ensure zone has completed scans.");
    }
    setIsGeneratingFIR(false);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "CRITICAL": return "#ef4444"; // red-500
      case "HIGH": return "#f97316";     // orange-500
      case "MEDIUM": return "#eab308";   // yellow-500
      case "LOW": return "#10b981";      // emerald-500
      default: return "#94a3b8";
    }
  };

  const getRiskBgClass = (level: string) => {
    switch (level) {
      case "CRITICAL": return "bg-red-500/10 border-red-500/30";
      case "HIGH": return "bg-orange-500/10 border-orange-500/30";
      case "MEDIUM": return "bg-yellow-500/10 border-yellow-500/30";
      case "LOW": return "bg-emerald-500/10 border-emerald-500/30";
      default: return "bg-white/5 border-white/10";
    }
  };

  return (
    <div className="relative min-h-screen bg-black pt-20 px-6 pb-6 overflow-hidden flex flex-col">
      <LegalBackground />
      {/* Header */}
      <div className="mb-6 flex items-center justify-between relative z-10">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Scale className="text-indigo-500" size={32} />
            Legal & Impact Assessment
          </h1>
          <p className="text-zinc-400 mt-1 font-mono text-xs uppercase tracking-widest">
            Enforcement Command Center • Global Risk Leaderboard
          </p>
        </div>
      </div>

      <div className="flex-1 flex gap-6 h-[calc(100vh-140px)] relative z-10">
        
        {/* LEFT COLUMN: Global Risk Leaderboard */}
        <div className="w-[40%] flex flex-col bg-[#0a0a0a] rounded-2xl border border-white/10 overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <div className="p-4 border-b border-white/5 bg-white/[0.02]">
            <h2 className="text-sm font-mono tracking-widest text-white uppercase flex items-center gap-2">
              <Activity size={16} className="text-red-500" />
              Global Risk Leaderboard
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/10">
            {isLoadingList ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-3">
                <Loader2 className="animate-spin" size={24} />
                <span className="font-mono text-xs">CALCULATING GLOBAL THREAT MATRIX...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {riskScores.map((zone, idx) => (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={zone.zoneId}
                    onClick={() => setSelectedZoneId(zone.zoneId)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group
                      ${selectedZoneId === zone.zoneId ? getRiskBgClass(zone.riskLevel) : 'bg-black/40 border-white/5 hover:border-white/20'}
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-6 text-center font-mono text-zinc-500 text-xs">#{idx + 1}</div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                          {zone.zoneName}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {zone.area_km2.toFixed(2)} km² • {zone.alerts3mo} ALERTS
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-mono tracking-widest uppercase opacity-70" style={{ color: getRiskColor(zone.riskLevel) }}>
                          {zone.riskLevel}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {zone.ndviLoss > 0 ? `-${zone.ndviLoss}% NDVI` : 'STABLE'}
                        </span>
                      </div>
                      <RiskRing score={zone.riskScore} color={getRiskColor(zone.riskLevel)} />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Impact Details & Legal Action */}
        <div className="w-[60%] bg-[#0a0a0a] rounded-2xl border border-white/10 overflow-hidden relative flex flex-col">
          <AnimatePresence mode="wait">
            {!selectedZoneId ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-4"
              >
                <Scale size={64} className="opacity-20" />
                <p className="font-mono tracking-widest uppercase text-sm">Select a Zone for Impact Analysis</p>
              </motion.div>
            ) : isLoadingDetails ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-3"
              >
                <Loader2 className="animate-spin" size={32} />
                <span className="font-mono text-xs tracking-widest uppercase">Fetching Legal & Impact Records...</span>
              </motion.div>
            ) : zoneRisk ? (
              <motion.div 
                key="details"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col p-6 overflow-y-auto"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{zoneRisk.zone.name}</h2>
                    <p className="text-xs font-mono text-zinc-400">ID: {zoneRisk.zone.id} • {zoneRisk.zone.area_km2.toFixed(2)} km²</p>
                  </div>
                  <div className={`px-4 py-2 rounded-lg border flex flex-col items-end ${getRiskBgClass(zoneRisk.riskLevel)}`}>
                    <span className="text-[10px] font-mono uppercase tracking-widest opacity-80">Overall Risk</span>
                    <span className="text-lg font-bold" style={{ color: getRiskColor(zoneRisk.riskLevel) }}>{zoneRisk.riskLevel} ({zoneRisk.riskScore}/100)</span>
                  </div>
                </div>

                {/* Top Row: Risk Breakdown Bento */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-black/50 border border-white/5 rounded-xl p-4 flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">NDVI Loss</span>
                    <span className="text-xl font-mono font-bold text-red-400">{zoneRisk.breakdown.ndviLoss}%</span>
                  </div>
                  <div className="bg-black/50 border border-white/5 rounded-xl p-4 flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Recent Alerts</span>
                    <span className="text-xl font-mono font-bold text-orange-400">{zoneRisk.breakdown.alerts3mo}</span>
                  </div>
                  <div className="bg-black/50 border border-white/5 rounded-xl p-4 flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Latest Threat</span>
                    <span className="text-sm font-mono font-bold text-red-500 mt-1">{zoneRisk.breakdown.latestThreat.toUpperCase()}</span>
                  </div>
                </div>

                {/* Middle Row: Carbon & Economic Impact */}
                <div className="bg-gradient-to-br from-emerald-900/20 to-black border border-emerald-500/20 rounded-2xl p-6 mb-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CloudRain size={120} />
                  </div>
                  <h3 className="text-sm font-mono uppercase tracking-widest text-emerald-500 mb-6 flex items-center gap-2">
                    <CloudRain size={16} /> Environmental & Economic Impact
                  </h3>
                  
                  {carbonLoss ? (
                    <div className="grid grid-cols-2 gap-8 relative z-10">
                      <div className="flex flex-col gap-4">
                        <div>
                          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Est. CO₂ Released</span>
                          <div className="text-4xl font-mono font-bold text-white mt-1">
                            {carbonLoss.carbonImpact.co2TonnesLost.toLocaleString()} <span className="text-lg text-zinc-500">tonnes</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Trees Destroyed</span>
                          <div className="text-2xl font-mono font-bold text-red-400 mt-1 flex items-center gap-2">
                            <TreeDeciduous size={20} />
                            {carbonLoss.carbonImpact.treesLost.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col justify-center border-l border-white/10 pl-8">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Economic Damage</span>
                          <button 
                            onClick={() => setShowUSD(!showUSD)}
                            className="text-[10px] font-mono bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-white transition-colors"
                          >
                            Show {showUSD ? "INR" : "USD"}
                          </button>
                        </div>
                        <div className="text-3xl font-mono font-bold text-amber-400 flex items-center gap-1">
                          {showUSD ? <DollarSign size={24} /> : "₹"}
                          {showUSD 
                            ? carbonLoss.carbonImpact.economicDamage.usd.toLocaleString()
                            : `${carbonLoss.carbonImpact.economicDamage.inrLakhs} Lakhs`
                          }
                        </div>
                        <span className="text-[9px] font-mono text-zinc-500 mt-2">
                          {carbonLoss.carbonImpact.economicDamage.basis}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center flex flex-col items-center justify-center text-zinc-500">
                      <AlertTriangle size={32} className="mb-3 opacity-50" />
                      <p className="font-mono text-xs uppercase tracking-widest">Insufficient Scan Data</p>
                      <p className="text-[10px] mt-1 opacity-70">Requires at least 2 completed ML scans to calculate temporal forest loss.</p>
                    </div>
                  )}
                </div>

                {/* Bottom Row: Legal Action */}
                <div className="mt-auto">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4 flex gap-3">
                    <ShieldAlert size={20} className="text-red-500 flex-shrink-0" />
                    <div>
                      <h4 className="text-xs font-mono font-bold text-red-400 uppercase">AI Recommendation</h4>
                      <p className="text-sm text-red-200/80 mt-1">{zoneRisk.recommendation}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateFIR}
                    disabled={isGeneratingFIR || !carbonLoss}
                    className="w-full relative overflow-hidden group bg-red-600 hover:bg-red-500 text-white rounded-xl p-4 flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingFIR ? (
                      <Loader2 className="animate-spin relative z-10" size={24} />
                    ) : (
                      <FileText className="relative z-10" size={24} />
                    )}
                    <span className="font-mono font-bold tracking-widest uppercase relative z-10">
                      {isGeneratingFIR ? "Compiling Satellite Evidence..." : "Generate Legal FIR (PDF)"}
                    </span>
                    
                    {/* Pulse Effect */}
                    {!isGeneratingFIR && carbonLoss && (
                      <motion.div 
                        className="absolute inset-0 bg-white/20"
                        animate={{ opacity: [0, 0.5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </button>
                  {!carbonLoss && (
                    <p className="text-center text-[10px] text-zinc-500 mt-2 font-mono">
                      Cannot generate FIR without sufficient carbon loss evidence.
                    </p>
                  )}
                </div>

              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        
      </div>
    </div>
  );
}
