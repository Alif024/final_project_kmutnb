'use client';

import React, { useState } from 'react';
import {
  Network,
  Server,
  Layers,
  Cpu,
  RefreshCw,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ShieldAlert,
  Database,
  Radio,
  Sliders,
  Terminal
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  Hypervisor,
  VirtualMachine,
  TopologyNode,
  TopologyEdge,
  SyslogEntry,
  Alert,
  HealthStatus
} from '@/types/ai-noc';

interface InfrastructureViewProps {
  hypervisors: Hypervisor[];
  vms: VirtualMachine[];
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  syslogs: SyslogEntry[];
  recentAlerts: Alert[];
  initialSubTab?: string;
  onNavigateTab?: (tab: string, subtab?: string) => void;
}

// Shared status -> color mapping so a badge's color always matches the status text it shows
function statusClasses(status: HealthStatus) {
  switch (status) {
    case 'critical':
      return { icon: 'bg-rose-500/20 border-rose-500/30 text-rose-600 dark:text-rose-400', badge: 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/30' };
    case 'warning':
      return { icon: 'bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400', badge: 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30' };
    case 'healthy':
      return { icon: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30' };
    default:
      return { icon: 'bg-slate-500/20 border-slate-500/30 text-slate-500 dark:text-slate-400', badge: 'bg-slate-500/20 text-slate-600 dark:text-slate-300 border-slate-500/30' };
  }
}

function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

function usageColor(pct: number) {
  return pct >= 80 ? 'text-rose-600 dark:text-rose-300 border-rose-500' : pct >= 60 ? 'text-amber-600 dark:text-amber-300 border-amber-500' : 'text-emerald-600 dark:text-emerald-300 border-emerald-400';
}

export default function InfrastructureView({
  hypervisors,
  vms,
  nodes,
  edges,
  syslogs,
  recentAlerts,
  initialSubTab = 'topology',
  onNavigateTab,
}: InfrastructureViewProps) {
  const [subTab, setSubTab] = useState<'topology' | 'monitoring'>(
    initialSubTab === 'monitoring' ? 'monitoring' : 'topology'
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-fw');
  const [selectedHypervisorId, setSelectedHypervisorId] = useState<string>('hyp-01');
  const [nodeDetailTab, setNodeDetailTab] = useState<'overview' | 'interfaces' | 'performance' | 'logs' | 'alerts' | 'vm-info'>('overview');
  const [hypDetailTab, setHypDetailTab] = useState<'overview' | 'performance' | 'vms' | 'datastores' | 'alerts' | 'logs'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  // Performance sample data
  const perfData = [
    { t: '14:45', cpu: 45, mem: 60, sto: 75, ready: 1.2, latency: 5.2 },
    { t: '15:00', cpu: 52, mem: 65, sto: 78, ready: 2.1, latency: 12.4 },
    { t: '15:15', cpu: 65, mem: 72, sto: 81, ready: 4.8, latency: 38.6 },
    { t: '15:30', cpu: 62, mem: 70, sto: 80, ready: 3.5, latency: 32.1 },
    { t: '15:42', cpu: 65, mem: 72, sto: 81, ready: 4.8, latency: 38.6 },
  ];

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[1];
  const selectedHyp = hypervisors.find((h) => h.id === selectedHypervisorId) || hypervisors[0];

  // A topology node that represents a VM can be cross-referenced to its real
  // VirtualMachine record (and from there, its host) by matching IP address.
  const matchedVm = vms.find((v) => v.ipAddress === selectedNode.ipAddress);
  const matchedVmHost = matchedVm ? hypervisors.find((h) => h.id === matchedVm.hypervisorId) : undefined;
  const nodeAlerts = recentAlerts.filter(
    (a) => (matchedVm && a.entityId === matchedVm.id) || a.entityName === selectedNode.label
  );

  // Syslog ของโหนดที่เลือกอยู่ — จับคู่ผ่าน VM ที่ IP ตรงกัน หรือชื่อโหนดตรงกับ source
  const nodeLogs = syslogs.filter(
    (s) => (matchedVm && s.sourceId === matchedVm.id) || s.sourceName === selectedNode.label
  );

  const hypVms = vms.filter((v) => v.hypervisorId === selectedHyp.id);
  const hypAlerts = recentAlerts.filter((a) => a.entityId === selectedHyp.id || a.entityName === selectedHyp.name);
  const hypLogs = syslogs.filter((s) => s.sourceId === selectedHyp.id);

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-300">
      {/* SubTab Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Infrastructure</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subTab === 'topology'
              ? 'แผนผังโครงสร้างเครือข่ายและระบบเสมือน (Interactive Topology Tree)'
              : 'ติดตามสถานะอุปกรณ์เครือข่าย และ Hypervisor (Device & Hypervisor Monitoring)'}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-slate-950/60 backdrop-blur-md p-1 rounded-xl border border-slate-200 dark:border-white/10">
          <button
            onClick={() => setSubTab('topology')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'topology'
                ? 'bg-blue-600/80 text-slate-900 dark:text-white shadow-lg shadow-blue-500/20 border border-blue-400/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <Network className="w-4 h-4" />
            Infrastructure Topology
          </button>
          <button
            onClick={() => setSubTab('monitoring')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'monitoring'
                ? 'bg-blue-600/80 text-slate-900 dark:text-white shadow-lg shadow-blue-500/20 border border-blue-400/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <Server className="w-4 h-4" />
            Device & Hypervisor Monitoring
          </button>
        </div>
      </div>

      {/* SUBTAB 1: TOPOLOGY */}
      {subTab === 'topology' && (
        <div className="space-y-6">
          {/* Topology Controls Toolbar */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 shadow-sm">
                <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Auto Layout
              </button>
              <button className="px-3 py-1.5 bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 shadow-sm">
                <Maximize2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Fit to Screen
              </button>
              <button className="px-3 py-1.5 bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 shadow-sm">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Refresh
              </button>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span> Healthy
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span> Warning
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></span> Critical
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span> Unknown
              </span>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search device..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 w-44"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50"
              >
                <option value="All" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">All Types</option>
                <option value="firewall" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Firewall</option>
                <option value="switch" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Switch</option>
                <option value="vm" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Virtual Machine</option>
                <option value="hypervisor" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Hypervisor</option>
              </select>
            </div>
          </div>

          {/* Topology Canvas Container */}
          <div className="bg-white dark:bg-slate-950/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 relative min-h-[460px] overflow-hidden shadow-2xl flex flex-col justify-between">
            {/* Canvas Control overlay */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-xl p-1 backdrop-blur-md shadow-lg">
              <button className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg">
                <ZoomOut className="w-4 h-4" />
              </button>
              <button className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Hierarchical Tree Canvas Visualization */}
            <div className="w-full h-full flex flex-col items-center justify-center space-y-8 my-4 py-2 relative">
              {/* SVG Connecting Edges Layer */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-slate-900/10 dark:stroke-white/20" style={{ zIndex: 0 }}>
                {/* Connector lines between hierarchy levels */}
                <line x1="50%" y1="60" x2="50%" y2="120" stroke="#EF4444" strokeWidth="2" strokeDasharray="4 4" className="animate-pulse" />
                <line x1="50%" y1="170" x2="50%" y2="230" stroke="#22C55E" strokeWidth="2" />
                {/* Branches from Core Switch to Edge Devices */}
                <path d="M 50% 270 L 15% 330" stroke="#22C55E" strokeWidth="2" fill="none" />
                <path d="M 50% 270 L 32% 330" stroke="#22C55E" strokeWidth="2" fill="none" />
                <path d="M 50% 270 L 50% 330" stroke="#F59E0B" strokeWidth="2" strokeDasharray="3 3" fill="none" />
                <path d="M 50% 270 L 68% 330" stroke="#22C55E" strokeWidth="2" fill="none" />
                <path d="M 50% 270 L 85% 330" stroke="#F59E0B" strokeWidth="2" fill="none" />
              </svg>

              {/* Level 1: Internet */}
              <div className="z-10">
                <div
                  onClick={() => setSelectedNodeId('node-internet')}
                  className={`px-5 py-2.5 bg-white dark:bg-white/5 backdrop-blur-md border rounded-2xl flex items-center gap-3 cursor-pointer transition-all shadow-lg ${
                    selectedNodeId === 'node-internet'
                      ? 'border-blue-500 ring-2 ring-blue-500/30'
                      : 'border-emerald-500/60 hover:border-emerald-500'
                  }`}
                >
                  <Radio className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">Internet</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">0.0.0.0/0</span>
                  </div>
                </div>
              </div>

              {/* Level 2: Firewall-VM (Critical) */}
              <div className="z-10">
                <div
                  onClick={() => setSelectedNodeId('node-fw')}
                  className={`px-5 py-3 bg-rose-500/10 backdrop-blur-md border-2 rounded-2xl flex items-center gap-3 cursor-pointer transition-all shadow-xl relative ${
                    selectedNodeId === 'node-fw'
                      ? 'border-rose-500 ring-4 ring-rose-500/20'
                      : 'border-rose-500/70 hover:border-rose-400'
                  }`}
                >
                  <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow">
                    2
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-500/30">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">Firewall-VM</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-500/20 text-rose-600 dark:text-rose-300 rounded border border-rose-500/30">Critical</span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">10.0.0.1</span>
                  </div>
                </div>
              </div>

              {/* Level 3: Core Switch */}
              <div className="z-10">
                <div
                  onClick={() => setSelectedNodeId('node-sw')}
                  className={`px-5 py-2.5 bg-white dark:bg-white/5 backdrop-blur-md border rounded-2xl flex items-center gap-3 cursor-pointer transition-all shadow-lg ${
                    selectedNodeId === 'node-sw'
                      ? 'border-blue-500 ring-2 ring-blue-500/30'
                      : 'border-emerald-500/60 hover:border-emerald-500'
                  }`}
                >
                  <Network className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">Core-Switch-01</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">10.0.0.2</span>
                  </div>
                </div>
              </div>

              {/* Level 4: Edge Nodes Row */}
              <div className="z-10 flex flex-wrap items-center justify-center gap-4 w-full max-w-4xl px-4">
                {/* Edge Router */}
                <div
                  onClick={() => setSelectedNodeId('node-router')}
                  className={`p-3 bg-white dark:bg-white/5 backdrop-blur-md border rounded-xl flex items-center gap-2.5 cursor-pointer transition-all ${
                    selectedNodeId === 'node-router' ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-emerald-500/50 hover:border-emerald-500'
                  }`}
                >
                  <Server className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <div className="text-left">
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">Edge-Router-01</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">10.0.1.1</span>
                  </div>
                </div>

                {/* Web VM */}
                <div
                  onClick={() => setSelectedNodeId('node-web')}
                  className={`p-3 bg-white dark:bg-white/5 backdrop-blur-md border rounded-xl flex items-center gap-2.5 cursor-pointer transition-all relative ${
                    selectedNodeId === 'node-web' ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-emerald-500/50 hover:border-emerald-500'
                  }`}
                >
                  <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <div className="text-left">
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">Web-VM-01</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">10.0.1.10</span>
                  </div>
                </div>

                {/* App VM (ERP) - Warning */}
                <div
                  onClick={() => setSelectedNodeId('node-app')}
                  className={`p-3 bg-white dark:bg-white/5 backdrop-blur-md border rounded-xl flex items-center gap-2.5 cursor-pointer transition-all relative ${
                    selectedNodeId === 'node-app' ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-amber-500/70 hover:border-amber-400'
                  }`}
                >
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    !
                  </span>
                  <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <div className="text-left">
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">App-VM-01</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">10.0.1.20</span>
                  </div>
                </div>

                {/* DB VM */}
                <div
                  onClick={() => setSelectedNodeId('node-db')}
                  className={`p-3 bg-white dark:bg-white/5 backdrop-blur-md border rounded-xl flex items-center gap-2.5 cursor-pointer transition-all ${
                    selectedNodeId === 'node-db' ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-emerald-500/50 hover:border-emerald-500'
                  }`}
                >
                  <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <div className="text-left">
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">DB-VM-01</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">10.0.1.30</span>
                  </div>
                </div>

                {/* IDS VM */}
                <div
                  onClick={() => setSelectedNodeId('node-ids')}
                  className={`p-3 bg-white dark:bg-white/5 backdrop-blur-md border rounded-xl flex items-center gap-2.5 cursor-pointer transition-all relative ${
                    selectedNodeId === 'node-ids' ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-amber-500/70 hover:border-amber-400'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <div className="text-left">
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">IDS-VM-01</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">10.0.1.40</span>
                  </div>
                </div>
              </div>

              {/* Minimap Box overlay */}
              <div className="absolute bottom-3 right-3 w-32 h-20 bg-white dark:bg-slate-950/80 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-xl p-1.5 flex flex-col justify-between shadow-lg">
                <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Minimap</span>
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 opacity-60">
                  <div className="w-4 h-1.5 bg-emerald-500 rounded"></div>
                  <div className="w-6 h-2 bg-rose-500 rounded"></div>
                  <div className="w-8 h-1.5 bg-emerald-500 rounded"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Topology Selected Node Detail Panel (at bottom of canvas) */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold ${statusClasses(selectedNode.status).icon}`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">{selectedNode.label}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-bold uppercase ${statusClasses(selectedNode.status).badge}`}>
                      {selectedNode.status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{selectedNode.ipAddress}</span>
                </div>
              </div>

              {/* Tabs for Node Detail Panel */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200 dark:border-white/10 overflow-x-auto">
                {(['overview', 'interfaces', 'performance', 'logs', 'alerts', 'vm-info'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setNodeDetailTab(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                      nodeDetailTab === t ? 'bg-blue-600/80 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {t === 'vm-info' ? 'VM Info' : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Detail Tab Contents */}
            {nodeDetailTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                {/* 1. Device Information */}
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-2.5">
                  <h4 className="font-bold text-slate-600 dark:text-slate-300 text-xs border-b border-slate-200 dark:border-white/10 pb-1.5 uppercase">
                    Device Information
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Type:</span> <span className="font-semibold text-slate-900 dark:text-white capitalize">{matchedVm ? `Virtual Machine (${matchedVm.role})` : selectedNode.nodeType}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">IP Address:</span> <span className="font-mono text-slate-900 dark:text-white">{selectedNode.ipAddress}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Vendor / Model:</span> <span className="font-semibold text-blue-600 dark:text-blue-400">{matchedVm?.vendorModel ?? '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Uptime:</span> <span className="text-slate-900 dark:text-white">{matchedVm ? formatUptime(matchedVm.uptimeSeconds) : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Location Host:</span> <span className="text-slate-900 dark:text-white">{matchedVmHost?.name ?? '—'}</span></div>
                  </div>
                </div>

                {/* 2. Resource Utilization */}
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-2.5">
                  <h4 className="font-bold text-slate-600 dark:text-slate-300 text-xs border-b border-slate-200 dark:border-white/10 pb-1.5 uppercase">
                    Resource Utilization
                  </h4>
                  {matchedVm ? (
                    <div className="grid grid-cols-3 gap-2 text-center py-1">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">CPU</span>
                        <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold mx-auto ${usageColor(matchedVm.cpuUsage)}`}>
                          {matchedVm.cpuUsage}%
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">Memory</span>
                        <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold mx-auto ${usageColor(matchedVm.memoryUsage)}`}>
                          {matchedVm.memoryUsage}%
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">Storage</span>
                        <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold mx-auto ${usageColor(matchedVm.storageUsage)}`}>
                          {matchedVm.storageUsage}%
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 py-3">อุปกรณ์นี้ไม่มีข้อมูลเมตริกระดับ VM ในระบบ</p>
                  )}
                </div>

                {/* 3. Status Summary */}
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-2.5">
                  <h4 className="font-bold text-slate-600 dark:text-slate-300 text-xs border-b border-slate-200 dark:border-white/10 pb-1.5 uppercase">
                    Status Summary
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">Overall Status:</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase border ${statusClasses(selectedNode.status).badge}`}>
                        {selectedNode.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">Active Alerts:</span>
                      <span className={`font-bold ${nodeAlerts.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {nodeAlerts.length} Alerts
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">Last Seen:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{matchedVm?.lastSeen ?? '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Tab */}
            {nodeDetailTab === 'performance' && (
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-3 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white">Performance Trend (ตัวอย่างข้อมูลย้อนหลัง 1 ชั่วโมง)</h4>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={perfData}>
                      <XAxis dataKey="t" stroke="#64748B" fontSize={10} />
                      <YAxis stroke="#64748B" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                      <Line type="monotone" dataKey="cpu" name="CPU %" stroke="#3B82F6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="mem" name="Memory %" stroke="#A855F7" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Alerts Tab */}
            {nodeDetailTab === 'alerts' && (
              <div className="space-y-2 text-xs">
                {nodeAlerts.length === 0 ? (
                  <p className="text-slate-500 py-4 text-center">ไม่มี Alert ที่เกี่ยวข้องกับอุปกรณ์นี้</p>
                ) : (
                  nodeAlerts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{a.title}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">{a.lastSeen}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize border ${statusClasses(a.severity === 'critical' ? 'critical' : a.severity === 'warning' ? 'warning' : 'unknown').badge}`}>
                        {a.severity}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* VM Info Tab */}
            {nodeDetailTab === 'vm-info' && (
              matchedVm ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex justify-between bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3"><span className="text-slate-500 dark:text-slate-400">Role:</span><span className="text-slate-900 dark:text-white font-semibold capitalize">{matchedVm.role}</span></div>
                  <div className="flex justify-between bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3"><span className="text-slate-500 dark:text-slate-400">Health:</span><span className="text-slate-900 dark:text-white font-semibold capitalize">{matchedVm.health}</span></div>
                  <div className="flex justify-between bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3"><span className="text-slate-500 dark:text-slate-400">I/O Wait:</span><span className="text-slate-900 dark:text-white font-semibold">{matchedVm.ioWaitPercent}%</span></div>
                  <div className="flex justify-between bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3"><span className="text-slate-500 dark:text-slate-400">Hypervisor Host:</span><span className="text-slate-900 dark:text-white font-semibold">{matchedVmHost?.name ?? '—'}</span></div>
                </div>
              ) : (
                <p className="text-slate-500 text-xs py-4 text-center">โหนดนี้ไม่ใช่ Virtual Machine จึงไม่มีข้อมูล VM Info</p>
              )
            )}

            {/* Logs Tab (Unified Syslog Viewer Aligned to NTP Time!) */}
            {nodeDetailTab === 'logs' && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between bg-white dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/10">
                  <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Unified Syslog (อ้างอิงเวลา NTP เดียวกันกับ Metric Telemetry)
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Syslog Collector Active
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl p-3 font-mono space-y-2 max-h-48 overflow-y-auto">
                  {nodeLogs.length === 0 ? (
                    <p className="text-slate-500 text-center py-4 font-sans">ไม่มี Syslog จากโหนดนี้</p>
                  ) : (
                    nodeLogs.map((log) => (
                      <div key={log.id} className="text-slate-500 dark:text-slate-400 flex items-start gap-3 border-b border-slate-200 dark:border-white/5 pb-1.5">
                        <span className="text-blue-600 dark:text-blue-400 shrink-0 font-bold">{log.timestamp}</span>
                        <span className="text-amber-600 dark:text-amber-400 shrink-0 font-bold">[{log.sourceName}]</span>
                        <span className={`flex-1 ${log.severityLevel <= 2 ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-700 dark:text-slate-200'}`}>
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => onNavigateTab?.('logs')}
                  className="w-full px-3 py-2 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-600 dark:text-blue-300 text-[11px] font-semibold hover:bg-blue-600/25 transition-colors"
                >
                  ค้นหา Log ทั้งหมดใน Log Explorer →
                </button>
              </div>
            )}

            {/* Interfaces Tab */}
            {nodeDetailTab === 'interfaces' && (
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                      <th className="pb-2">Interface</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Utilization</th>
                      <th className="pb-2">Packet Loss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    <tr>
                      <td className="py-2 font-mono text-slate-900 dark:text-white">vtnet0 (WAN)</td>
                      <td className="py-2 text-emerald-600 dark:text-emerald-400 font-bold">UP</td>
                      <td className="py-2 text-slate-900 dark:text-white">82%</td>
                      <td className="py-2 text-rose-600 dark:text-rose-400 font-bold">2.1%</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-slate-900 dark:text-white">vtnet1 (LAN)</td>
                      <td className="py-2 text-emerald-600 dark:text-emerald-400 font-bold">UP</td>
                      <td className="py-2 text-slate-900 dark:text-white">45%</td>
                      <td className="py-2 text-emerald-600 dark:text-emerald-400 font-bold">0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: DEVICE & HYPERVISOR MONITORING */}
      {subTab === 'monitoring' && (
        <div className="space-y-6">
          {/* Hypervisor KPI Summary Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-1 shadow-lg">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Total Hypervisors</span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">6</span>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Healthy 5</span> · <span className="text-amber-600 dark:text-amber-400 font-bold">Warning 1</span>
              </div>
            </div>

            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-1 shadow-lg">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Total VMs</span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">128</span>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Running 102</span> · <span className="text-rose-600 dark:text-rose-400 font-bold">Stopped 26</span>
              </div>
            </div>

            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-1 shadow-lg">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Total vCPU</span>
              <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">256</span>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Used 152 (59%)</div>
            </div>

            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-1 shadow-lg">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Total Memory</span>
              <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 tabular-nums">1.02 TB</span>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Used 612 GB (58%)</div>
            </div>

            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-1 shadow-lg">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Total Storage</span>
              <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">12.4 TB</span>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Used 6.7 TB (54%)</div>
            </div>
          </div>

          {/* Hypervisors Table */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Hypervisor Hosts (VMware ESXi & Proxmox VE)
              </h3>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter host..."
                    className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                    <th className="pb-3 font-semibold">#</th>
                    <th className="pb-3 font-semibold">Hypervisor</th>
                    <th className="pb-3 font-semibold">Type / Version</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">CPU Usage</th>
                    <th className="pb-3 font-semibold">Memory Usage</th>
                    <th className="pb-3 font-semibold">Storage Usage</th>
                    <th className="pb-3 font-semibold">VMs</th>
                    <th className="pb-3 font-semibold">Alerts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {hypervisors.map((hyp, idx) => {
                    const isSelected = hyp.id === selectedHypervisorId;
                    return (
                      <tr
                        key={hyp.id}
                        onClick={() => setSelectedHypervisorId(hyp.id)}
                        className={`hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                          isSelected ? 'bg-slate-100 dark:bg-white/10 font-medium border-l-4 border-l-blue-500' : ''
                        }`}
                      >
                        <td className="py-3 font-mono text-slate-500 dark:text-slate-400">{idx + 1}</td>
                        <td className="py-3">
                          <div className="font-bold text-slate-900 dark:text-white">{hyp.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{hyp.ipAddress}</div>
                        </td>
                        <td className="py-3 text-slate-500 dark:text-slate-400">{hyp.version}</td>
                        <td className="py-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                              hyp.status === 'warning'
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {hyp.status}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-100 dark:bg-white/10 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                              <div
                                className={`h-full rounded-full ${hyp.cpuUsage >= 80 ? 'bg-rose-500' : 'bg-blue-500'}`}
                                style={{ width: `${hyp.cpuUsage}%` }}
                              ></div>
                            </div>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{hyp.cpuUsage}%</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-100 dark:bg-white/10 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                              <div
                                className="h-full rounded-full bg-purple-500"
                                style={{ width: `${hyp.memoryUsage}%` }}
                              ></div>
                            </div>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{hyp.memoryUsage}%</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-100 dark:bg-white/10 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                              <div
                                className="h-full rounded-full bg-emerald-400"
                                style={{ width: `${hyp.storageUsage}%` }}
                              ></div>
                            </div>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{hyp.storageUsage}%</span>
                          </div>
                        </td>
                        <td className="py-3 font-mono text-slate-900 dark:text-white">
                          {hyp.vmCount} / {hyp.vmCapacity}
                        </td>
                        <td className="py-3">
                          {hyp.alertCount > 0 ? (
                            <span className="text-rose-600 dark:text-rose-300 font-bold bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
                              {hyp.alertCount} Alerts
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Hypervisor Detail Panel with Specific Virtualization Metrics */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{selectedHyp.name}</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase border ${statusClasses(selectedHyp.status).badge}`}>
                    {selectedHyp.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {selectedHyp.ipAddress} · {selectedHyp.version}
                </p>
              </div>

              {/* Specific Virtualization Metric Cards (CPU Ready Time, Memory Ballooning, Storage Latency, Virtual Switch) */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                {(['overview', 'performance', 'vms', 'datastores', 'alerts', 'logs'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setHypDetailTab(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                      hypDetailTab === t ? 'bg-blue-600/80 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Overview Tab: Specific Virtualization Metrics Cards */}
            {hypDetailTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium block">CPU Ready Time</span>
                  <span className={`text-xl font-bold tabular-nums ${selectedHyp.cpuReadyTimePercent > 4 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {selectedHyp.cpuReadyTimePercent}%
                  </span>
                  <p className="text-[10px] text-slate-500">Threshold &lt; 5.0% (เวลารอคิว CPU)</p>
                </div>

                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium block">Memory Ballooning</span>
                  <span className={`text-xl font-bold tabular-nums ${selectedHyp.memoryBallooningMb > 500 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {selectedHyp.memoryBallooningMb} MB
                  </span>
                  <p className="text-[10px] text-slate-500">Reclaimed Memory from Guest</p>
                </div>

                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium block">Storage Latency</span>
                  <span className={`text-xl font-bold tabular-nums ${selectedHyp.storageLatencyMs > 10 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {selectedHyp.storageLatencyMs} ms
                  </span>
                  <p className="text-[10px] text-slate-500">Threshold &lt; 10 ms (Datastore I/O)</p>
                </div>

                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium block">vSwitch Dropped Packets</span>
                  <span className={`text-xl font-bold tabular-nums ${selectedHyp.vswitchDroppedPackets > 50 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {selectedHyp.vswitchDroppedPackets} pkts
                  </span>
                  <p className="text-[10px] text-slate-500">Virtual Switch Congestion</p>
                </div>
              </div>
            )}

            {/* Performance Tab: Line Chart over 1 Hour */}
            {hypDetailTab === 'performance' && (
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">Performance Metrics Trend (1 Hour)</h4>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={perfData}>
                      <XAxis dataKey="t" stroke="#64748B" fontSize={10} />
                      <YAxis stroke="#64748B" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                      <Line type="monotone" dataKey="cpu" name="CPU Usage %" stroke="#3B82F6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="mem" name="Memory Usage %" stroke="#A855F7" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="latency" name="Latency (ms)" stroke="#EF4444" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* VMs Tab: VMs hosted on this hypervisor */}
            {hypDetailTab === 'vms' && (
              <div className="space-y-2 text-xs">
                {hypVms.length === 0 ? (
                  <p className="text-slate-500 py-4 text-center">ไม่มี VM บน Host นี้</p>
                ) : (
                  hypVms.map((v) => (
                    <div key={v.id} className="flex items-center justify-between bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{v.name}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">{v.ipAddress} · {v.role}</p>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-blue-600 dark:text-blue-400">CPU {v.cpuUsage}%</span>
                        <span className="text-purple-600 dark:text-purple-400">Mem {v.memoryUsage}%</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase border ${statusClasses(v.health).badge}`}>{v.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Datastores Tab: this host's own storage capacity (mock data models one datastore per host) */}
            {hypDetailTab === 'datastores' && (
              <div className="bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-xs space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white">Datastore หลักของ {selectedHyp.name}</h4>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Capacity:</span><span className="text-slate-900 dark:text-white font-mono">{selectedHyp.usedStorageTb} / {selectedHyp.totalStorageTb} TB</span></div>
                <div className="w-full bg-slate-100 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${(selectedHyp.usedStorageTb / selectedHyp.totalStorageTb) * 100}%` }}></div>
                </div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Latency:</span><span className={selectedHyp.storageLatencyMs > 10 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>{selectedHyp.storageLatencyMs} ms</span></div>
              </div>
            )}

            {/* Alerts Tab */}
            {hypDetailTab === 'alerts' && (
              <div className="space-y-2 text-xs">
                {hypAlerts.length === 0 ? (
                  <p className="text-slate-500 py-4 text-center">ไม่มี Alert ที่เกี่ยวข้องกับ Host นี้</p>
                ) : (
                  hypAlerts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{a.title}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">{a.lastSeen}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize border ${statusClasses(a.severity === 'critical' ? 'critical' : a.severity === 'warning' ? 'warning' : 'unknown').badge}`}>
                        {a.severity}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Logs Tab */}
            {hypDetailTab === 'logs' && (
              <div className="bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl p-3 font-mono space-y-2 text-xs max-h-48 overflow-y-auto">
                {hypLogs.length === 0 ? (
                  <p className="text-slate-500 text-center py-4 font-sans">ไม่มี Syslog จาก Host นี้</p>
                ) : (
                  hypLogs.map((log) => (
                    <div key={log.id} className="text-slate-500 dark:text-slate-400 flex items-start gap-3 border-b border-slate-200 dark:border-white/5 pb-1.5">
                      <span className="text-blue-600 dark:text-blue-400 shrink-0 font-bold">{log.timestamp}</span>
                      <span className={`flex-1 ${log.severityLevel <= 2 ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-700 dark:text-slate-200'}`}>{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
