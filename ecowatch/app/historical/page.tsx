"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import {
  History, Search, AlertTriangle, CheckCircle2,
  SkipForward, TrendingDown, Zap, Leaf, BarChart3,
} from "lucide-react";
import { historicalService, campaignService } from "@/lib/api/campaigns";
import { zonesService } from "@/lib/api/zones";
import { FlexibleDatePicker } from "@/components/ui/FlexibleDatePicker";
import { HistoricalResult, HistoricalScan } from "@/types/campaign.types";
import { Zone } from "@/types/zone.types";

// ── Severity color helper ────────────────────────────────────────────────────
const severityColor = (s: string) => {
  if (s === "critical") return "text-red-400 bg-red-500/10 border-red-500/30";
  if (s === "high")     return "text-orange-400 bg-orange-500/10 border-orange-500/30";
  if (s === "medium")   return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
  if (s === "low")      return "text-blue-400 bg-blue-500/10 border-blue-500/30";
  return "text-white/30 bg-white/5 border-white/10";
};

// ── Mini bar chart (text-based) ──────────────────────────────────────────────
function ForestBar({ pct }: { pct: number }) {
  const bars = Math.round(pct / 5); // 0-20 bars
  return (
    <div className="flex items-end gap-px h-8">
      {Array.from({ length: 20 }, (_, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-t-sm transition-all ${i < bars ? "bg-emerald-500" : "bg-white/5"}`}
          style={{ height: `${20 + i * 3}%` }}
        />
      ))}
    </div>
  );
}

// ── Timeline chart ────────────────────────────────────────────────────────────
function TimelineChart({ scans }: { scans: HistoricalScan[] }) {
  const done = scans.filter(s => s.status === "done");
  if (done.length < 2) return null;

  const max = Math.max(...done.map(s => s.forest_pct));
  const min = Math.min(...done.map(s => s.forest_pct));
  const range = max - min || 1;

  return (
    <div className="relative h-32 flex items-end gap-2 px-2">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-[9px] text-white/30 text-right pr-1">
        <span>{max.toFixed(0)}%</span>
        <span>{((max + min) / 2).toFixed(0)}%</span>
        <span>{min.toFixed(0)}%</span>
      </div>

      {/* Bars */}
      <div className="flex-1 ml-8 flex items-end gap-1.5 h-full">
        {done.map((scan, i) => {
          const h = ((scan.forest_pct - min) / range) * 80 + 20; // 20-100%
          const isFirst = i === 0;
          const prev    = i > 0 ? done[i - 1].forest_pct : scan.forest_pct;
          const drop    = prev - scan.forest_pct;
          const color   = isFirst ? "bg-blue-500" : drop >= 10 ? "bg-red-500" : drop >= 5 ? "bg-yellow-500" : "bg-emerald-500";
          const dateShort = scan.date.slice(0, 7); // YYYY-MM

          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1 group cursor-default">
              <div className="relative flex-1 w-full flex items-end">
                <div
                  className={`w-full rounded-t-sm transition-all ${color} group-hover:opacity-80`}
                  style={{ height: `${h}%` }}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                  <div className="bg-gray-900 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white whitespace-nowrap shadow-xl">
                    <div className="font-semibold">{dateShort}</div>
                    <div>Forest: {scan.forest_pct.toFixed(1)}%</div>
                    {!isFirst && <div className={drop > 0 ? "text-red-300" : "text-emerald-300"}>
                      {drop > 0 ? `▼ -${drop.toFixed(1)}%` : `▲ +${Math.abs(drop).toFixed(1)}%`} vs prev
                    </div>}
                  </div>
                </div>
              </div>
              <span className="text-[9px] text-white/30 rotate-45 origin-left translate-x-1 translate-y-1 whitespace-nowrap">
                {dateShort}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Scan result card ─────────────────────────────────────────────────────────
function ScanCard({ scan, index }: { scan: HistoricalScan; index: number }) {
  if (scan.status === "skipped") {
    return (
      <div className="p-3 rounded-xl border border-white/5 bg-white/2 flex items-center gap-3">
        <SkipForward className="w-4 h-4 text-white/20 flex-shrink-0" />
        <div>
          <p className="text-xs text-white/30 font-mono">{scan.date}</p>
          <p className="text-[11px] text-white/20">{scan.skip_reason || "No clear image available"}</p>
        </div>
      </div>
    );
  }

  const isFirst = index === 0;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className={`p-4 rounded-xl border backdrop-blur-sm ${
        isFirst ? "border-blue-500/20 bg-blue-500/5" :
        scan.delta_from_first >= 15 ? "border-red-500/20 bg-red-500/5" :
        scan.delta_from_first >= 8  ? "border-yellow-500/20 bg-yellow-500/5" :
        "border-white/8 bg-white/3"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <p className="text-xs font-mono text-white/60">{scan.date}</p>
            {isFirst && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300">BASELINE</span>}
            {!isFirst && scan.delta_from_first > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                scan.delta_from_first >= 15 ? "bg-red-500/15 border-red-500/30 text-red-300" :
                scan.delta_from_first >= 8  ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-300" :
                "bg-white/5 border-white/10 text-white/40"
              }`}>
                ▼ {scan.delta_from_first.toFixed(1)}% since start
              </span>
            )}
            {scan.severity !== "none" && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${severityColor(scan.severity)}`}>
                {scan.severity.toUpperCase()}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-white/30 text-[10px] mb-0.5">Forest Cover</p>
              <p className="text-white font-semibold">{scan.forest_pct.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-white/30 text-[10px] mb-0.5">Loss (hectares)</p>
              <p className={`font-semibold ${scan.loss_hectares > 0 ? "text-orange-300" : "text-white/60"}`}>
                {scan.loss_hectares > 0 ? `${scan.loss_hectares.toFixed(0)} ha` : "—"}
              </p>
            </div>
            <div>
              <p className="text-white/30 text-[10px] mb-0.5">Threats</p>
              <p className="text-white/70 text-[10px]">{scan.threats.filter(t => t !== "none").join(", ") || "None"}</p>
            </div>
          </div>
        </div>
        <ForestBar pct={scan.forest_pct} />
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type ViewState = "form" | "loading" | "results";

export default function HistoricalPage() {
  const [view,   setView]   = useState<ViewState>("form");
  const [zones,  setZones]  = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [resolution,    setResolution]    = useState(20);
  const [result, setResult] = useState<HistoricalResult | null>(null);
  const [error,  setError]  = useState("");

  const selectedZone = zones.find(z => z._id === zoneId);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/auth/login"; return; }
    zonesService.getZones().then(r => { if (r.success) setZones(r.data); });
  }, []);

  const handleAnalyze = async () => {
    if (!zoneId)               { toast.error("Select a zone first"); return; }
    if (selectedDates.length < 2) { toast.error("Configure at least 2 scan dates"); return; }

    setView("loading");
    setError("");

    const zone = zones.find(z => z._id === zoneId);
    if (!zone?.bbox) { setError("Zone bbox not configured"); setView("form"); return; }

    const bbox = [zone.bbox.lng_min, zone.bbox.lat_min, zone.bbox.lng_max, zone.bbox.lat_max];

    const res = await historicalService.analyze({
      zone_id:    zoneId,
      bbox,
      dates:      selectedDates,
      resolution,
    });

    if (res.success && res.data) {
      setResult(res.data);
      setView("results");
    } else {
      setError(res.error || "Analysis failed. Please try again.");
      setView("form");
      toast.error(res.error || "Analysis failed");
    }
  };

  return (
    <div className="min-h-screen max-w-5xl mx-auto py-8 space-y-8">
      <Toaster theme="dark" position="bottom-right" richColors />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <History className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Historical Analysis</h1>
          <p className="text-sm text-white/40">Compare satellite imagery across time · Sentinel-2 archive from 2015</p>
        </div>
      </div>

      {/* ── FORM ── */}
      {view === "form" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-xl p-6 space-y-6">

            {/* Zone */}
            <div className="space-y-2">
              <label className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Zone *</label>
              <select value={zoneId} onChange={e => setZoneId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50">
                <option value="" className="bg-gray-900">Select a zone…</option>
                {zones.map(z => (
                  <option key={z._id} value={z._id} className="bg-gray-900">{z.name}</option>
                ))}
              </select>
              {selectedZone && (
                selectedZone.bbox ? (
                  <p className="text-xs text-white/30">
                    Area: ~{selectedZone.area_km2?.toFixed(0) ?? "?"} km² · BBox configured
                  </p>
                ) : (
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 mt-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300">
                      Zone "{selectedZone.name}" has no bounding box configured. <br/>
                      Please edit this zone in Mission Control and draw a bounding box on the map before running analysis.
                    </p>
                  </div>
                )
              )}
            </div>

            {/* Date Picker */}
            <div className="space-y-2">
              <label className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Time Range & Samples</label>
              <div className="p-4 rounded-xl bg-white/3 border border-white/10">
                <FlexibleDatePicker
                  onDatesChange={dates => setSelectedDates(dates)}
                  bbox={selectedZone?.bbox ? [selectedZone.bbox.lng_min, selectedZone.bbox.lat_min, selectedZone.bbox.lng_max, selectedZone.bbox.lat_max] : undefined}
                />
              </div>
            </div>

            {/* Resolution */}
            <div className="space-y-2">
              <label className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Image Resolution</label>
              <div className="flex gap-3">
                {[{ v: 10, l: "10m — High Quality" }, { v: 20, l: "20m — Recommended" }, { v: 30, l: "30m — Fast" }].map(r => (
                  <button key={r.v} onClick={() => setResolution(r.v)}
                    className={`flex-1 py-2.5 rounded-lg text-xs border transition-all ${
                      resolution === r.v
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-300 font-semibold"
                        : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                    }`}>
                    {r.l}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <button onClick={handleAnalyze} disabled={!!selectedZone && !selectedZone.bbox}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <Search className="w-4 h-4" />
              Analyze History
            </button>
          </div>
        </motion.div>
      )}

      {/* ── LOADING ── */}
      {view === "loading" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-32 gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-2 border-blue-500/20 rounded-full animate-spin border-t-blue-400" />
            <History className="absolute inset-0 m-auto w-6 h-6 text-blue-400" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold">Analyzing {selectedDates.length} satellite images…</p>
            <p className="text-white/40 text-sm mt-1">Fetching from Sentinel-2 archive · Running NDVI + AI analysis</p>
            <p className="text-white/30 text-xs mt-2">This may take a few minutes. Please wait.</p>
          </div>
        </motion.div>
      )}

      {/* ── RESULTS ── */}
      {view === "results" && result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

          {/* Back button */}
          <button onClick={() => setView("form")}
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors">
            ← New Analysis
          </button>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Total Forest Loss",
                value: `${result.summary.total_loss_pct.toFixed(1)}%`,
                sub:   `${result.summary.total_loss_ha.toFixed(0)} hectares`,
                color: "text-red-400",
                bg:    "bg-red-500/5 border-red-500/20",
                icon:  <TrendingDown className="w-4 h-4 text-red-400" />,
              },
              {
                label: "Annual Rate",
                value: `${result.summary.rate_per_year.toFixed(0)} ha/yr`,
                sub:   "Annualized loss",
                color: "text-orange-400",
                bg:    "bg-orange-500/5 border-orange-500/20",
                icon:  <BarChart3 className="w-4 h-4 text-orange-400" />,
              },
              {
                label: "Biggest Drop",
                value: `${result.summary.biggest_drop_pct.toFixed(1)}%`,
                sub:   result.summary.biggest_drop_date || "single period",
                color: "text-yellow-400",
                bg:    "bg-yellow-500/5 border-yellow-500/20",
                icon:  <Zap className="w-4 h-4 text-yellow-400" />,
              },
              {
                label: "Scans Analyzed",
                value: `${result.summary.scans_done}/${result.scan_count + result.summary.scans_skipped}`,
                sub:   `${result.summary.scans_skipped} skipped (cloud)`,
                color: "text-blue-400",
                bg:    "bg-blue-500/5 border-blue-500/20",
                icon:  <Leaf className="w-4 h-4 text-blue-400" />,
              },
            ].map((card, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`rounded-xl border p-4 ${card.bg}`}>
                <div className="flex items-center gap-2 mb-2">{card.icon}<p className="text-xs text-white/40">{card.label}</p></div>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-[11px] text-white/30 mt-0.5">{card.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* AI Verdict */}
          {result.ai_verdict && (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-2">🤖 AI Verdict</p>
              <p className="text-sm text-white/80 leading-relaxed italic">"{result.ai_verdict}"</p>
            </div>
          )}

          {/* Timeline chart */}
          <div className="rounded-xl border border-white/10 bg-white/3 p-5">
            <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-4">Forest Cover Over Time</p>
            <TimelineChart scans={result.scans} />
          </div>

          {/* Scan cards */}
          <div className="space-y-3">
            <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Individual Scans</p>
            {result.scans.map((scan, i) => (
              <ScanCard key={i} scan={scan} index={i} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
