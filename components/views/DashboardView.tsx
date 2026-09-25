'use client';

import React, { useState } from 'react';
import { Activity, AlertCircle, AlertTriangle, ArrowUpRight, Bot, Check, ChevronDown, ChevronRight, Cpu, Layers, RefreshCw, Server, ShieldAlert, Sparkles } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Alert, Hypervisor, Severity } from '@/types/ai-noc';
import { cn } from '@/lib/utils';

interface DashboardViewProps {
  hypervisors: Hypervisor[];
  recentAlerts: Alert[];
  onNavigateTab: (tab: string, subtab?: string) => void;
  onSelectIncident?: (id: string) => void;
  onRefresh?: () => void;
  onAcknowledgeAlert: (id: string) => void;
  canAcknowledge: boolean;
}

const panel = 'rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs';
const severityStyle: Record<Severity, { badge: string; dot: string; color: string }> = {
  critical: { badge: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20', dot: 'bg-rose-500 ring-rose-100 dark:ring-rose-500/15', color: '#ef4444' },
  warning: { badge: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20', dot: 'bg-amber-500 ring-amber-100 dark:ring-amber-500/15', color: '#f59e0b' },
  info: { badge: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20', dot: 'bg-blue-500 ring-blue-100 dark:ring-blue-500/15', color: '#3b82f6' },
};

function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-semibold capitalize', severityStyle[severity].badge)}>{severity}</span>;
}

function MetricCard({ title, value, icon, children, segments, alert = false }: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  children: React.ReactNode;
  segments: { percent: number; color: string }[];
  alert?: boolean;
}) {
  return (
    <div className={cn(panel, 'p-4 transition-shadow hover:shadow-md', alert && 'bg-gradient-to-br from-rose-50/70 via-white to-amber-50/40 dark:from-rose-950/30 dark:via-slate-900 dark:to-amber-950/20 border-rose-200/80 dark:border-rose-900/60')}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={cn('text-xs font-semibold', alert ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400')}>{title}</span>{icon}
      </div>
      <div className={cn('text-3xl font-bold tracking-tight tabular-nums', alert ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white')}>{value}</div>
      <div className="mt-2.5 flex min-h-5 flex-wrap items-center justify-between gap-1 text-[11px]">{children}</div>
      <div className="mt-3 flex h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
        {segments.map((segment, i) => <div key={i} className={cn('h-full', segment.color)} style={{ width: Math.min(100, Math.max(0, segment.percent)) + '%' }} />)}
      </div>
    </div>
  );
}

export default function DashboardView({ hypervisors, recentAlerts, onNavigateTab, onSelectIncident, onRefresh, onAcknowledgeAlert, canAcknowledge }: DashboardViewProps) {
  const [timeRange, setTimeRange] = useState('1h');
  const [filter, setFilter] = useState<'all' | Severity>('all');
  const [notice, setNotice] = useState('');
  const alerts = recentAlerts.filter((alert) => alert.status !== 'resolved');
  const count = (severity: Severity) => alerts.filter((alert) => alert.severity === severity).length;
  const percentage = (value: number, total: number) => total ? value / total * 100 : 0;
  const healthyHosts = hypervisors.filter((host) => host.status === 'healthy').length;
  const otherHosts = hypervisors.length - healthyHosts;
  const visibleAlerts = alerts.filter((alert) => filter === 'all' || alert.severity === filter);
  const topIssues = [...alerts].sort((a, b) => b.occurrenceCount - a.occurrenceCount).slice(0, 5);
  const maxOccurrences = Math.max(1, ...topIssues.map((alert) => alert.occurrenceCount));
  const donut = (['critical', 'warning', 'info'] as const).map((severity) => ({ name: severity, value: count(severity), color: severityStyle[severity].color }));
  const chartData = alerts.length ? donut : [{ name: 'ไม่มีการแจ้งเตือน', value: 1, color: '#cbd5e1' }];
  const openDiagnosis = (alert: Alert) => {
    if (alert.incidentId && onSelectIncident) onSelectIncident(alert.incidentId);
    else onNavigateTab('ai-analysis', 'chat');
  };
  const iconBox = (color: string, icon: React.ReactNode) => <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', color)}>{icon}</span>;

  return (
    <div className="space-y-6 pb-6 text-slate-800 dark:text-slate-200 animate-in fade-in duration-300" style={{ fontFamily: 'var(--font-prompt), var(--font-inter), sans-serif' }}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">ภาพรวมสุขภาพของระบบเครือข่ายและโครงสร้างพื้นฐาน</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select aria-label="ช่วงเวลาของ Dashboard" value={timeRange} onChange={(e) => { setTimeRange(e.target.value); setNotice('เปลี่ยนช่วงเวลาแล้ว — ข้อมูลในต้นแบบยังเป็นชุดจำลองเดิม'); }} className="appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-3 pr-8 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="1h">1 ชั่วโมงที่แล้ว (Last 1 Hour)</option>
              <option value="6h">6 ชั่วโมงที่แล้ว (Last 6 Hours)</option>
              <option value="24h">24 ชั่วโมงที่แล้ว (Last 24 Hours)</option>
              <option value="7d">7 วันล่าสุด (Last 7 Days)</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
          <button title="รีเฟรชข้อมูล" aria-label="รีเฟรช Dashboard" onClick={() => { onRefresh?.(); setNotice('อัปเดตเวลารีเฟรชแล้ว'); }} className={cn(panel, 'rounded-xl p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800')}><RefreshCw className="h-4 w-4" /></button>
        </div>
      </div>

      <section className="space-y-3" aria-label="ตัวชี้วัดสถานะระบบ">
        <div className="flex justify-between px-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
          <span>ตัวชี้วัดสถานะระบบหลัก (SYSTEM STATUS & AI)</span>
          <span className="hidden md:inline">ทรัพยากรโครงสร้างพื้นฐาน (INFRASTRUCTURE ASSETS)</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard title="Network Health" value="98%" icon={iconBox('bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400', <Activity className="h-4 w-4" />)} segments={[{ percent: 98, color: 'bg-emerald-500' }]}>
            <span className="flex items-center font-semibold text-emerald-600 dark:text-emerald-400"><ArrowUpRight className="h-3.5 w-3.5" />Excellent</span><span className="text-[10px] text-slate-400">↑ 2% จากชั่วโมงที่แล้ว</span>
          </MetricCard>
          <MetricCard title="AI Confidence" value="94%" icon={iconBox('bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400', <Cpu className="h-4 w-4" />)} segments={[{ percent: 94, color: 'bg-purple-500' }]}>
            <span className="flex items-center gap-0.5 font-semibold text-purple-600 dark:text-purple-400"><Sparkles className="h-3.5 w-3.5" />High Confidence</span><span className="text-[10px] text-slate-400">↑ 3% จากชั่วโมงที่แล้ว</span>
          </MetricCard>
          <MetricCard alert title="Active Alerts" value={<>{alerts.length}<span className="ml-2 text-xs font-medium text-slate-400">รายการ</span></>} icon={iconBox('bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400', <AlertTriangle className="h-4 w-4" />)} segments={[{ percent: percentage(count('critical'), alerts.length), color: 'bg-rose-500' }]}>
            <span className="rounded bg-rose-100 px-1.5 py-0.5 font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">Critical {count('critical')}</span><span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">Warning {count('warning')}</span>
          </MetricCard>
          <MetricCard title="Total Devices" value="82" icon={iconBox('bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400', <Server className="h-4 w-4" />)} segments={[{ percent: 54 / 82 * 100, color: 'bg-emerald-500' }, { percent: 28 / 82 * 100, color: 'bg-rose-400' }]}>
            <span className="text-emerald-600 dark:text-emerald-400">● Online 54</span><span className="text-rose-500 dark:text-rose-400">● Offline 28</span>
          </MetricCard>
          <MetricCard title="Total VMs" value="128" icon={iconBox('bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400', <Layers className="h-4 w-4" />)} segments={[{ percent: 102 / 128 * 100, color: 'bg-emerald-500' }, { percent: 26 / 128 * 100, color: 'bg-slate-300 dark:bg-slate-600' }]}>
            <span className="text-emerald-600 dark:text-emerald-400">● Running 102</span><span className="text-slate-400">● Stopped 26</span>
          </MetricCard>
          <MetricCard title="Total Hypervisors" value={hypervisors.length} icon={iconBox('bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400', <Cpu className="h-4 w-4" />)} segments={[{ percent: percentage(healthyHosts, hypervisors.length), color: 'bg-emerald-500' }, { percent: percentage(otherHosts, hypervisors.length), color: 'bg-amber-400' }]}>
            <span className="text-emerald-600 dark:text-emerald-400">● Healthy {healthyHosts}</span><span className="text-amber-600 dark:text-amber-400">● ต้องตรวจสอบ {otherHosts}</span>
          </MetricCard>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className={cn(panel, 'flex flex-col justify-between p-5 xl:col-span-3')}>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100"><ShieldAlert className="h-7 w-7 rounded-lg bg-amber-50 p-1.5 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" />Alert Summary</h3>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300">Total {alerts.length}</span>
            </div>
            <div className="relative mx-auto my-6 h-44 w-44" role="img" aria-label={'แจ้งเตือน ' + alerts.length + ' รายการ: Critical ' + count('critical') + ', Warning ' + count('warning') + ', Info ' + count('info')}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" innerRadius={65} outerRadius={83} stroke="none" startAngle={90} endAngle={-270}>
                    {chartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  {alerts.length > 0 && <Tooltip contentStyle={{ background: '#1e293b', border: 0, borderRadius: 8, color: '#fff', fontSize: 12 }} itemStyle={{ color: '#fff' }} formatter={(value, name) => [String(value) + ' รายการ', name]} />}
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-2xl text-slate-900 dark:text-white">{alerts.length}</strong><span className="mt-1 text-[10px] font-bold tracking-wider text-slate-400">ALERTS</span></div>
            </div>
            <div className="space-y-2.5 px-2">
              {donut.map((entry) => <div key={entry.name} className="flex justify-between text-xs"><span className="flex items-center gap-2 capitalize text-slate-600 dark:text-slate-400"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />{entry.name}</span><span className="font-medium text-slate-800 dark:text-slate-200">{entry.value} <span className="font-normal text-slate-400">({Math.round(percentage(entry.value, alerts.length))}%)</span></span></div>)}
            </div>
          </div>
          <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
            <button onClick={() => onNavigateTab('ai-analysis', 'diagnosis')} className="w-full rounded-xl border border-purple-100 dark:border-purple-500/20 bg-purple-50/70 dark:bg-purple-500/10 p-3 text-left hover:bg-purple-100 dark:hover:bg-purple-500/15">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300"><Bot className="h-3.5 w-3.5" />AI Insight</span>
              <span className="text-[11px] leading-relaxed text-purple-900 dark:text-purple-200">ตรวจพบ Storage Latency บน Host-01 สูง 38.6 ms แนะนำให้ตรวจสอบ SAN Datastore</span>
            </button>
          </div>
        </section>

        <section className={cn(panel, 'flex min-w-0 flex-col p-5 xl:col-span-5')}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100"><Activity className="h-7 w-7 rounded-lg bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" />Recent Alerts</h3>
            <div className="flex flex-wrap gap-1" role="group" aria-label="กรองระดับการแจ้งเตือน">
              {(['all', 'critical', 'warning'] as const).map((value) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)} className={cn('rounded px-2 py-1 text-[11px] font-medium', filter === value ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800')}>{value === 'all' ? 'ทั้งหมด' : value === 'critical' ? 'วิกฤต (' + count(value) + ')' : 'เตือน (' + count(value) + ')'}</button>)}
            </div>
          </div>
          <div className="mt-2 max-h-[380px] space-y-1 divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto pr-1">
            {visibleAlerts.length === 0 && <p className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">ไม่มีการแจ้งเตือนในระดับนี้</p>}
            {visibleAlerts.map((alert) => <article key={alert.id} className="rounded-xl p-2 py-3 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/60">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4', severityStyle[alert.severity].dot)} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold leading-relaxed text-slate-900 dark:text-slate-100">{alert.title}</span><SeverityBadge severity={alert.severity} /></div>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400"><Server className="h-3 w-3 shrink-0" />{alert.entityName} · เกิดซ้ำ {alert.occurrenceCount} ครั้ง</p>
                  </div>
                </div>
                <span className="shrink-0 text-[10px] text-slate-400">{alert.lastSeen}</span>
              </div>
              <div className="mt-2 flex flex-wrap justify-end gap-2 border-t border-dashed border-slate-200/60 dark:border-slate-700 pt-2">
                <button onClick={() => openDiagnosis(alert)} className="flex items-center gap-1 rounded-lg bg-purple-50 dark:bg-purple-500/10 px-2.5 py-1 text-[11px] font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-500/20"><Sparkles className="h-3 w-3" />AI วินิจฉัย</button>
                <button disabled={alert.status === 'acknowledged' || !canAcknowledge} onClick={() => { onAcknowledgeAlert(alert.id); setNotice('รับทราบการแจ้งเตือน: ' + alert.title); }} title={!canAcknowledge ? 'Viewer มีสิทธิ์อ่านอย่างเดียว' : undefined} className={cn('flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium disabled:cursor-default', alert.status === 'acknowledged' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50')}>{alert.status === 'acknowledged' ? <><Check className="h-3 w-3" />รับทราบแล้ว</> : 'รับทราบ'}</button>
              </div>
            </article>)}
          </div>
        </section>

        <section className={cn(panel, 'flex min-w-0 flex-col justify-between p-5 xl:col-span-4')}>
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2"><AlertCircle className="h-7 w-7 shrink-0 rounded-lg bg-rose-50 p-1.5 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" /><div><h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Top 5 Issues</h3><p className="text-[11px] text-slate-400">ปัญหาที่เกิดซ้ำบ่อยสุดในระบบ</p></div></div>
              <button onClick={() => onNavigateTab('ai-analysis', 'diagnosis')} className="flex shrink-0 items-center text-xs font-medium text-blue-600 dark:text-blue-400">View All<ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
            <div className="mt-3 space-y-3">
              {topIssues.length === 0 && <p className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">ไม่มีปัญหาที่เกิดซ้ำ</p>}
              {topIssues.map((issue, index) => <button key={issue.id} onClick={() => openDiagnosis(issue)} className="w-full rounded-xl border border-slate-100 dark:border-slate-800 p-2.5 text-left transition-colors hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/60">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">{index + 1}</span>
                  <span className="min-w-0 flex-1 text-xs font-semibold leading-relaxed text-slate-800 dark:text-slate-200">{issue.title}</span>
                  <SeverityBadge severity={issue.severity} />
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-400">เกิดซ้ำ {issue.occurrenceCount} ครั้ง</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full" style={{ width: percentage(issue.occurrenceCount, maxOccurrences) + '%', backgroundColor: severityStyle[issue.severity].color }} /></div>
              </button>)}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">ดำเนินการแก้ไข: <strong className="text-slate-700 dark:text-slate-200">Manual</strong></span>
            <button onClick={() => onNavigateTab('action-center', 'approvals')} className="font-semibold text-blue-600 dark:text-blue-400">ตรวจสอบคำสั่งแก้ไข<ChevronRight className="inline h-3 w-3" /></button>
          </div>
        </section>
      </div>
      <p role="status" className="text-xs text-slate-500 dark:text-slate-400">{notice}</p>
    </div>
  );
}
