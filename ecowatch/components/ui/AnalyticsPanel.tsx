"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { AnalyticsResponse, AlertsOverTimeResponse } from "@/types/dashboard.types";
import { ShieldAlert, SignalHigh, ServerCrash, TrendingUp } from "lucide-react";

interface AnalyticsPanelProps {
  analytics: AnalyticsResponse | null;
  alertsOverTime: AlertsOverTimeResponse | null;
}

const COLORS = ["#10b981", "#06b6d4", "#f59e0b", "#ef4444", "#8b5cf6"];

export function AnalyticsPanel({ analytics, alertsOverTime }: AnalyticsPanelProps) {
  
  // Format data for Recharts Pie
  const chartData = analytics?.data.labels.map((label, index) => ({
    name: label.replace("_", " "),
    value: analytics.data.data[index],
  })) || [];

  // Format data for Recharts Bar
  const overTimeData = alertsOverTime?.data.labels.map((label, index) => {
    const dataPoint: any = { name: label };
    alertsOverTime.data.datasets.forEach(ds => {
      dataPoint[ds.label] = ds.data[index];
    });
    return dataPoint;
  }) || [];

  return (
    <div className="w-[320px] h-full flex flex-col gap-4 overflow-y-auto scrollbar-none pb-4">
      
      {/* System Status Module */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
        <h3 className="text-[10px] font-mono tracking-widest uppercase text-emerald-500">System Telemetry</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/5 rounded-lg p-3 flex flex-col gap-2">
            <SignalHigh size={16} className="text-emerald-400" />
            <span className="text-[10px] text-zinc-500 font-mono uppercase">API Latency</span>
            <span className="text-lg font-bold text-white">42ms</span>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-lg p-3 flex flex-col gap-2">
            <ServerCrash size={16} className="text-cyan-400" />
            <span className="text-[10px] text-zinc-500 font-mono uppercase">Sentinel Sync</span>
            <span className="text-lg font-bold text-white">99.9%</span>
          </div>
        </div>
      </div>

      {/* Threat Distribution Chart */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-mono tracking-widest uppercase text-emerald-500">Global Threat Matrix</h3>
          <ShieldAlert size={14} className="text-zinc-500" />
        </div>

        <div className="flex-1 w-full relative min-h-[200px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-mono text-zinc-500 animate-pulse">Initializing Data Stream...</span>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2 mt-4">
          {chartData.map((entry, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-xs text-zinc-300 capitalize">{entry.name}</span>
              </div>
              <span className="text-xs font-mono text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Threats Over Time Chart */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col min-h-[250px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-mono tracking-widest uppercase text-emerald-500">6-Month Trend</h3>
          <TrendingUp size={14} className="text-zinc-500" />
        </div>

        <div className="flex-1 w-full relative">
          {overTimeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overTimeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px', fontFamily: 'monospace' }}
                  labelStyle={{ color: '#71717a', fontSize: '10px', fontFamily: 'monospace', marginBottom: '4px' }}
                />
                <Bar dataKey="Critical" stackId="a" fill="#c62828" radius={[0, 0, 4, 4]} />
                <Bar dataKey="High" stackId="a" fill="#e65100" />
                <Bar dataKey="Medium" stackId="a" fill="#f9a825" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-mono text-zinc-500 animate-pulse">Gathering Temporal Data...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
