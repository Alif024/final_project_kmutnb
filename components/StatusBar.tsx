'use client';

import React from 'react';
import { RefreshCw, Activity, Cpu, Server, CheckCircle2 } from 'lucide-react';

interface StatusBarProps {
  lastUpdate?: string;
  onRefresh?: () => void;
  isCollectorActive?: boolean;
  isAiRunning?: boolean;
}

export default function StatusBar({
  lastUpdate = '24/05/2569 15:42:18',
  onRefresh,
  isCollectorActive = true,
  isAiRunning = true,
}: StatusBarProps) {
  return (
    <footer className="h-[36px] bg-[#020617]/70 backdrop-blur-xl border-t border-white/10 px-4 flex items-center justify-between text-xs text-slate-400 sticky bottom-0 z-30 select-none">
      <div className="flex items-center gap-6">
        {/* Telemetry Data Collector */}
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Data Collection :</span>
          <span className="flex items-center gap-1 font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Active
          </span>
        </div>

        {/* AI Engine Status */}
        <div className="flex items-center gap-2 hidden sm:flex">
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span>AI Engine :</span>
          <span className="flex items-center gap-1 font-semibold text-purple-400">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
            Running (Gemini 3.6 Flash)
          </span>
        </div>

        {/* Unified Syslog & Monitoring Server */}
        <div className="flex items-center gap-2 hidden md:flex">
          <Server className="w-3.5 h-3.5 text-blue-400" />
          <span>Unified Server (Syslog+Metric) :</span>
          <span className="text-blue-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            NTP Synced
          </span>
        </div>
      </div>

      {/* Right side: Last update & Refresh */}
      <div className="flex items-center gap-3">
        <span>Last Update : <strong className="text-slate-200 font-mono">{lastUpdate}</strong></span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex items-center gap-1"
            title="Refresh telemetry data"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>
    </footer>
  );
}
