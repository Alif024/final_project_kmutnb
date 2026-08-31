'use client';

import React, { useState } from 'react';
import {
  Activity,
  Brain,
  Server,
  Cpu,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Layers,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Hypervisor, Alert } from '@/types/ai-noc';

interface DashboardViewProps {
  hypervisors: Hypervisor[];
  recentAlerts: Alert[];
  onNavigateTab: (tab: string, subtab?: string) => void;
  onSelectIncident?: (id: string) => void;
  onRefresh?: () => void;
}

export default function DashboardView({
  hypervisors,
  recentAlerts,
  onNavigateTab,
  onSelectIncident,
  onRefresh,
}: DashboardViewProps) {
  const [timeRange, setTimeRange] = useState('Last 1 Hour');

  // Sparkline data generators
  const healthSparkline = [
    { v: 95 }, { v: 96 }, { v: 97 }, { v: 96 }, { v: 98 }, { v: 98 }
  ];
  const aiSparkline = [
    { v: 90 }, { v: 91 }, { v: 93 }, { v: 92 }, { v: 94 }, { v: 94 }
  ];
  const deviceSparkline = [
    { v: 82 }, { v: 82 }, { v: 82 }, { v: 82 }, { v: 82 }, { v: 82 }
  ];
  const vmSparkline = [
    { v: 125 }, { v: 126 }, { v: 128 }, { v: 128 }, { v: 128 }, { v: 128 }
  ];
  const hypSparkline = [
    { v: 6 }, { v: 6 }, { v: 6 }, { v: 6 }, { v: 6 }, { v: 6 }
  ];
  const alertSparkline = [
    { v: 8 }, { v: 9 }, { v: 12 }, { v: 10 }, { v: 11 }, { v: 11 }
  ];

  // Alert summary donut data (derived from the real recentAlerts prop)
  const criticalAlertCount = recentAlerts.filter((a) => a.severity === 'critical').length;
  const warningAlertCount = recentAlerts.filter((a) => a.severity === 'warning').length;
  const infoAlertCount = recentAlerts.filter((a) => a.severity === 'info').length;
  const totalAlertCount = recentAlerts.length;
  const alertPercent = (count: number) => (totalAlertCount > 0 ? Math.round((count / totalAlertCount) * 100) : 0);

  const alertDonutData = [
    { name: 'Critical', value: criticalAlertCount, color: '#EF4444' },
    { name: 'Warning', value: warningAlertCount, color: '#F59E0B' },
    { name: 'Info', value: infoAlertCount, color: '#3B82F6' },
  ];

  const topIssues = [
    { rank: 1, title: 'Storage latency สูงบน ESXi Host-01', severity: 'critical', occurrences: 12, incidentId: 'INC-2569-0524-0001' },
    { rank: 2, title: 'CPU Ready Time สูง', severity: 'warning', occurrences: 8 },
    { rank: 3, title: 'Packet Loss บน WAN Link', severity: 'warning', occurrences: 6 },
    { rank: 4, title: 'High Memory Usage บน Web-VM', severity: 'warning', occurrences: 5 },
    { rank: 5, title: 'Virtual Switch Congestion', severity: 'info', occurrences: 3 },
  ];

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-300">
      {/* Page Title & Time Range Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard</h2>
          <p className="text-xs text-[#93A3BC] mt-0.5">
            ภาพรวมสุขภาพของระบบเครือข่ายและโครงสร้างพื้นฐาน
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-white dark:bg-slate-950/60 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500/50 shadow-sm"
          >
            <option value="Last 1 Hour" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Last 1 Hour</option>
            <option value="Last 6 Hours" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Last 6 Hours</option>
            <option value="Last 24 Hours" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Last 24 Hours</option>
            <option value="Last 7 Days" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Last 7 Days</option>
          </select>

          <button
            onClick={onRefresh}
            className="p-2 bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shadow-sm"
            title="Refresh Dashboard"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Row - 6 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Network Health */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20 transition-all">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Network Health</span>
            <div className="flex items-baseline gap-2 mt-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">98%</span>
            </div>
            <div className="mt-2 text-[11px] flex items-center gap-1.5 font-medium">
              <span className="text-emerald-600 dark:text-emerald-400">Excellent</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center">
                ↑ 2% <span className="text-slate-500 dark:text-slate-400 font-normal ml-0.5">จากชั่วโมงที่แล้ว</span>
              </span>
            </div>
          </div>
          <div className="h-10 mt-3 -mx-4 -mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={healthSparkline}>
                <Line type="monotone" dataKey="v" stroke="#22C55E" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: AI Confidence */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20 transition-all">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">AI Confidence</span>
            <div className="flex items-baseline gap-2 mt-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <Brain className="w-5 h-5" />
              </div>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">94%</span>
            </div>
            <div className="mt-2 text-[11px] flex items-center gap-1.5 font-medium">
              <span className="text-purple-600 dark:text-purple-400">High Confidence</span>
              <span className="text-slate-600">•</span>
              <span className="text-purple-600 dark:text-purple-400 flex items-center">
                ↑ 3% <span className="text-slate-500 dark:text-slate-400 font-normal ml-0.5">จากชั่วโมงที่แล้ว</span>
              </span>
            </div>
          </div>
          <div className="h-10 mt-3 -mx-4 -mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={aiSparkline}>
                <Line type="monotone" dataKey="v" stroke="#8B5CF6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 3: Total Devices */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20 transition-all">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Total Devices</span>
            <div className="flex items-baseline gap-2 mt-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Server className="w-5 h-5" />
              </div>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">82</span>
            </div>
            <div className="mt-2 text-[11px] font-medium flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">Online <strong className="font-bold">54</strong></span>
              <span className="text-slate-600">|</span>
              <span className="text-rose-600 dark:text-rose-400">Offline <strong className="font-bold">28</strong></span>
            </div>
          </div>
          <div className="h-10 mt-3 -mx-4 -mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={deviceSparkline}>
                <Line type="monotone" dataKey="v" stroke="#3B82F6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 4: Total VMs */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20 transition-all">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Total VMs</span>
            <div className="flex items-baseline gap-2 mt-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">128</span>
            </div>
            <div className="mt-2 text-[11px] font-medium flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">Running <strong className="font-bold">102</strong></span>
              <span className="text-slate-600">|</span>
              <span className="text-rose-600 dark:text-rose-400">Stopped <strong className="font-bold">26</strong></span>
            </div>
          </div>
          <div className="h-10 mt-3 -mx-4 -mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vmSparkline}>
                <Line type="monotone" dataKey="v" stroke="#6366F1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 5: Total Hypervisors */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20 transition-all">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Total Hypervisors</span>
            <div className="flex items-baseline gap-2 mt-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">6</span>
            </div>
            <div className="mt-2 text-[11px] font-medium flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">Healthy <strong className="font-bold">5</strong></span>
              <span className="text-slate-600">|</span>
              <span className="text-amber-600 dark:text-amber-400">Warning <strong className="font-bold">1</strong></span>
            </div>
          </div>
          <div className="h-10 mt-3 -mx-4 -mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hypSparkline}>
                <Line type="monotone" dataKey="v" stroke="#F59E0B" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 6: Active Alerts (Frosted Glow Alert Border) */}
        <div className="bg-rose-500/10 backdrop-blur-md border border-rose-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-lg shadow-rose-950/20 relative overflow-hidden group hover:border-rose-500/50 transition-all">
          <div>
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-300 block">Active Alerts</span>
            <div className="flex items-baseline gap-2 mt-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-300 tabular-nums">{totalAlertCount}</span>
            </div>
            <div className="mt-2 text-[11px] font-medium flex items-center gap-2">
              <span className="text-rose-600 dark:text-rose-400 font-bold">Critical {criticalAlertCount}</span>
              <span className="text-slate-600">|</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">Warning {warningAlertCount}</span>
            </div>
          </div>
          <div className="h-10 mt-3 -mx-4 -mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={alertSparkline}>
                <Line type="monotone" dataKey="v" stroke="#EF4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Middle Section: Alert Summary (Donut), Recent Alerts, Top 5 Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Alert Summary (Donut) */}
        <div className="lg:col-span-4 bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Alert Summary
            </h3>
            <span className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-white/10 font-medium">
              Total {totalAlertCount}
            </span>
          </div>

          <div className="flex items-center justify-around py-4">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={alertDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={62}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {alertDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums leading-none">{totalAlertCount}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wider">Alerts</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span className="text-slate-500 dark:text-slate-400">Critical:</span>
                <span className="font-bold text-slate-900 dark:text-white ml-auto">{criticalAlertCount} ({alertPercent(criticalAlertCount)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-slate-500 dark:text-slate-400">Warning:</span>
                <span className="font-bold text-slate-900 dark:text-white ml-auto">{warningAlertCount} ({alertPercent(warningAlertCount)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span className="text-slate-500 dark:text-slate-400">Info:</span>
                <span className="font-bold text-slate-900 dark:text-white ml-auto">{infoAlertCount} ({alertPercent(infoAlertCount)}%)</span>
              </div>
            </div>
          </div>

          {/* MTTR Link Box */}
          <div
            onClick={() => onNavigateTab('reports')}
            className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 group transition-colors"
          >
            <span className="text-slate-500 dark:text-slate-400 font-medium">MTTR (Mean Time To Resolve)</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:underline">
              1h 23m <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="lg:col-span-4 bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Recent Alerts
            </h3>
            <button
              onClick={() => onNavigateTab('ai-analysis', 'diagnosis')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5 py-3 flex-1 overflow-y-auto">
            {recentAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                onClick={() => {
                  if (alert.incidentId && onSelectIncident) {
                    onSelectIncident(alert.incidentId);
                  } else {
                    onNavigateTab('ai-analysis', 'diagnosis');
                  }
                }}
                className="p-2.5 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 group"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      alert.severity === 'critical'
                        ? 'bg-rose-500 animate-ping'
                        : alert.severity === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    }`}
                  ></span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {alert.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{alert.entityName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{alert.lastSeen}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      alert.severity === 'critical'
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30'
                        : alert.severity === 'warning'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 Issues */}
        <div className="lg:col-span-4 bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Top 5 Issues (เกิดซ้ำบ่อย)
            </h3>
            <button
              onClick={() => onNavigateTab('ai-analysis', 'diagnosis')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2 py-3 flex-1">
            {topIssues.map((issue) => (
              <div
                key={issue.rank}
                onClick={() => {
                  if (issue.incidentId && onSelectIncident) {
                    onSelectIncident(issue.incidentId);
                  }
                }}
                className="p-2.5 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                    {issue.rank}
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-100 truncate group-hover:text-purple-600 dark:group-hover:text-purple-300">
                    {issue.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                      issue.severity === 'critical'
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30'
                        : issue.severity === 'warning'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {issue.severity}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-white/5 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10">
                    เกิดซ้ำ {issue.occurrences} ครั้ง
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Infrastructure Overview & Resource Utilization by Hypervisor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Infrastructure Overview (3 cards) */}
        <div className="lg:col-span-5 bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Infrastructure Overview
            </h3>
            <button
              onClick={() => onNavigateTab('infrastructure', 'topology')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
            >
              View Topology <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Network Devices */}
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 flex flex-col justify-between space-y-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate block">Network Devices</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">82</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Online 54</span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">Offline 28</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: '66%' }}></div>
                </div>
                <span className="block text-right text-[9px] text-slate-500">66% Online</span>
              </div>
            </div>

            {/* Virtual Machines */}
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 flex flex-col justify-between space-y-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate block">Virtual Machines</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">128</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Running 102</span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">Stopped 26</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: '80%' }}></div>
                </div>
                <span className="block text-right text-[9px] text-slate-500">80% Active</span>
              </div>
            </div>

            {/* Hypervisors */}
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 flex flex-col justify-between space-y-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate block">Hypervisors</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">6</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Healthy 5</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">Warning 1</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: '83%' }}></div>
                </div>
                <span className="block text-right text-[9px] text-slate-500">83% Healthy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Resource Utilization by Hypervisor Table */}
        <div className="lg:col-span-7 bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Resource Utilization (by Hypervisor)
            </h3>
            <button
              onClick={() => onNavigateTab('infrastructure', 'monitoring')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                  <th className="pb-2 font-semibold">Hypervisor</th>
                  <th className="pb-2 font-semibold">CPU</th>
                  <th className="pb-2 font-semibold">Memory</th>
                  <th className="pb-2 font-semibold">Storage</th>
                  <th className="pb-2 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {hypervisors.map((hyp) => (
                  <tr
                    key={hyp.id}
                    onClick={() => onNavigateTab('infrastructure', 'monitoring')}
                    className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {hyp.name}
                    </td>

                    {/* CPU Progress */}
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 dark:bg-white/10 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                          <div
                            className={`h-full rounded-full ${
                              hyp.cpuUsage >= 80 ? 'bg-rose-500' : hyp.cpuUsage >= 60 ? 'bg-amber-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${hyp.cpuUsage}%` }}
                          ></div>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 w-8">{hyp.cpuUsage}%</span>
                      </div>
                    </td>

                    {/* Memory Progress */}
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 dark:bg-white/10 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                          <div
                            className={`h-full rounded-full ${
                              hyp.memoryUsage >= 80 ? 'bg-rose-500' : hyp.memoryUsage >= 60 ? 'bg-purple-500' : 'bg-purple-500'
                            }`}
                            style={{ width: `${hyp.memoryUsage}%` }}
                          ></div>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 w-8">{hyp.memoryUsage}%</span>
                      </div>
                    </td>

                    {/* Storage Progress */}
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 dark:bg-white/10 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                          <div
                            className={`h-full rounded-full ${
                              hyp.storageUsage >= 80 ? 'bg-amber-500' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${hyp.storageUsage}%` }}
                          ></div>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 w-8">{hyp.storageUsage}%</span>
                      </div>
                    </td>

                    <td className="py-2.5 text-right font-semibold">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                          hyp.status === 'warning'
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {hyp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
