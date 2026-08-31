'use client';

import React from 'react';
import { RefreshCw, Activity, Cpu, Server, CheckCircle2 } from 'lucide-react';

interface StatusBarProps {
  collapsed?: boolean;
  lastUpdate?: string;
  onRefresh?: () => void;
  isCollectorActive?: boolean;
  isAiRunning?: boolean;
}

export default function StatusBar({
  collapsed = false,
  lastUpdate = '24/05/2569 15:42:18',
  onRefresh,
  isCollectorActive = true,
  isAiRunning = true,
}: StatusBarProps) {
  return (
    <footer
      className={`h-[36px] bg-white/70 dark:bg-[#020617]/70 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 px-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 fixed bottom-0 right-0 z-30 select-none transition-all duration-300 ${
        collapsed ? "left-[72px]" : "left-[240px]"
      }`}
    >
      <div className="flex items-center gap-6">
        {/* Telemetry Data Collector */}
        <div className="flex items-center gap-2">
          <Activity className={`w-3.5 h-3.5 ${isCollectorActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`} />
          <span>Data Collection :</span>
          <span className={`flex items-center gap-1 font-semibold ${isCollectorActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
            <span className={`w-2 h-2 rounded-full ${isCollectorActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}></span>
            {isCollectorActive ? 'Active' : 'Stopped'}
          </span>
        </div>

        {/* AI Engine Status */}
        <div className="flex items-center gap-2 hidden sm:flex">
          <Cpu className={`w-3.5 h-3.5 ${isAiRunning ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500'}`} />
          <span>AI Engine :</span>
          <span className={`flex items-center gap-1 font-semibold ${isAiRunning ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500'}`}>
            <span className={`w-2 h-2 rounded-full ${isAiRunning ? 'bg-purple-400 animate-pulse' : 'bg-slate-500'}`}></span>
            {isAiRunning ? 'Running (Gemini 3.6 Flash)' : 'Stopped'}
          </span>
        </div>

        {/* Unified Syslog & Monitoring Server */}
        <div className="flex items-center gap-2 hidden md:flex">
          <Server className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Unified Server (Syslog+Metric) :</span>
          <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            NTP Synced
          </span>
        </div>
      </div>

      {/* Right side: Last update & Refresh */}
      <div className="flex items-center gap-3">
        <span>Last Update : <strong className="text-slate-700 dark:text-slate-200 font-mono">{lastUpdate}</strong></span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
            title="Refresh telemetry data"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>
    </footer>
  );
}
