'use client';

import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  Download,
  Printer,
  Sparkles,
  CheckCircle2,
  BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Incident } from '@/types/ai-noc';

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

interface ReportsViewProps {
  incidents: Incident[];
  initialSubTab?: string;
  onNavigateTab?: (tab: string, subtab?: string) => void;
}

export default function ReportsView({
  incidents,
  initialSubTab = 'executive',
  onNavigateTab,
}: ReportsViewProps) {
  const [subTab, setSubTab] = useState<'executive' | 'postmortem'>(
    initialSubTab === 'postmortem' ? 'postmortem' : 'executive'
  );
  const [selectedIncidentId, setSelectedIncidentId] = useState('INC-2569-0524-0001');

  const availTrendData = [
    { day: '18 พ.ค.', avail: 99.95 },
    { day: '19 พ.ค.', avail: 99.98 },
    { day: '20 พ.ค.', avail: 99.92 },
    { day: '21 พ.ค.', avail: 99.99 },
    { day: '22 พ.ค.', avail: 99.97 },
    { day: '23 พ.ค.', avail: 99.96 },
    { day: '24 พ.ค.', avail: 99.98 },
  ];

  const severityData = [
    { name: 'Critical', count: 3, fill: '#EF4444' },
    { name: 'Warning', count: 8, fill: '#F59E0B' },
    { name: 'Info', count: 3, fill: '#3B82F6' },
  ];

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || incidents[0];

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-300">
      {/* SubTab Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Reports & Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subTab === 'executive'
              ? 'รายงานสรุปผู้บริหารประจำวัน (Daily Executive Summary Report)'
              : 'รายงานสรุปสาเหตุและการแก้ไข Incident เชิงลึก (Incident Post-Mortem Report)'}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-white/5 backdrop-blur-md p-1 rounded-xl border border-slate-200 dark:border-white/10">
          <button
            onClick={() => setSubTab('executive')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'executive'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Executive Summary Report
          </button>
          <button
            onClick={() => setSubTab('postmortem')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'postmortem'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <FileText className="w-4 h-4" />
            Incident Post-Mortem Report
          </button>
        </div>
      </div>

      {/* SUBTAB 1: EXECUTIVE SUMMARY REPORT */}
      {subTab === 'executive' && (
        <div className="space-y-6">
          {/* Controls: Date Picker & Export Buttons */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-black/20 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-900 dark:text-white">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>ประจำวันที่: 24 พฤษภาคม 2569</span>
              </div>

              <select className="bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none">
                <option value="all" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">ทั้งหมด (All Infrastructure)</option>
                <option value="virt" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Virtualization Platform</option>
                <option value="net" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Network Infrastructure</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => alert('Exporting PDF Report...')}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export PDF
              </button>
              <button
                onClick={() => alert('Exporting Excel Data...')}
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export Excel
              </button>
              <button
                onClick={() => window.print()}
                className="p-2 bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all"
                title="Print Report"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Executive KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-2 shadow-lg">
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium block">System Availability</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">99.98%</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">↑ 0.02%</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">SLA Target: 99.90% (ผ่านเกณฑ์มาตรฐาน)</span>
            </div>

            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-2 shadow-lg">
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium block">Total Incidents</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">14</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">แก้ไขแล้ว 13</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">ค้างดำเนินการ: 1 Incident</span>
            </div>

            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-2 shadow-lg">
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium block">MTTR (Mean Time To Resolve)</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">1h 23m</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">เร็วกว่าเดิม 18m</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">เฉลี่ยเวลาแก้ไขปัญหา</span>
            </div>

            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-2 shadow-lg">
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium block">AI Agent Accuracy</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 tabular-nums">96.4%</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">92 Automations Approved</span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-3 shadow-lg">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Availability Trend (7 Days)</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={availTrendData}>
                    <XAxis dataKey="day" stroke="#94A3B8" fontSize={10} />
                    <YAxis domain={[99.8, 100]} stroke="#94A3B8" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                    <Line type="monotone" dataKey="avail" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-4 bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-3 shadow-lg">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Incident Severity Distribution</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={severityData}>
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} />
                    <YAxis stroke="#94A3B8" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Executive AI Narrative Report Box */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">สรุปผลการดำเนินงานสำหรับผู้บริหาร (Executive AI Narrative Summary)</h3>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-200 space-y-3 leading-relaxed">
              <p>
                ในรอบวันที่ 24 พฤษภาคม 2569 ภาพรวมโครงสร้างพื้นฐานด้านไอทีและระบบเครือข่ายมีเสถียรภาพอยู่ในระดับสูงมาก (System Availability 99.98%) โดยสามารถควบคุมผลกระทบต่อระบบงานหลักขององค์กร (เช่น ERP และ Database) ได้ตามเป้าหมาย SLA
              </p>
              <p>
                เหตุการณ์สำคัญที่เกิดขึ้นในรอบวันคือ ปัญหา Storage Latency บน ESXi Host-01 ซึ่ง AI Agent ได้ทำการตรวจจับ root cause และเสนอแนะให้ทำ Live Migration ย้าย ERP-VM ไปยัง Host-02 โดยได้รับการอนุมัติจากวิศวกรศูนย์ NOC และดำเนินการสำเร็จภายในเวลา 10 นาที โดยผู้ใช้งานไม่ได้รับผลกระทบจาก Downtime
              </p>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                ข้อเสนอแนะเชิงป้องกันสำหรับระยะยาว: ควรพิจารณาปรับปรุง Storage Array I/O Tiering และขยาย Bandwidth บน WAN Link เพื่อรองรับการเติบโตของทราฟฟิกในไตรมาสหน้า
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: INCIDENT POST-MORTEM REPORT */}
      {subTab === 'postmortem' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-6 shadow-lg">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded font-bold text-xs uppercase border ${
                      selectedIncident.status === 'resolved'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : selectedIncident.status === 'investigating'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {selectedIncident.status === 'resolved'
                      ? 'RESOLVED'
                      : selectedIncident.status === 'investigating'
                      ? 'INVESTIGATING'
                      : 'OPEN'}
                  </span>
                  <h3 className="font-extrabold text-xl text-slate-900 dark:text-white">{selectedIncident.title}</h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                  <span>Incident ID: {selectedIncident.id}</span>
                  <span>•</span>
                  <span>Total Downtime: <strong>{formatDuration(selectedIncident.durationSeconds)}</strong></span>
                </div>
              </div>

              <button
                onClick={() => alert('Exporting Post-Mortem PDF...')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow flex items-center gap-2 shrink-0"
              >
                <Download className="w-4 h-4" /> Export Post-Mortem PDF
              </button>
            </div>

            {/* Timeline Section */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-slate-500 dark:text-slate-400 uppercase">Incident Lifecycle Timeline</h4>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                <div className="bg-slate-100 dark:bg-black/20 p-3 rounded-xl border border-slate-200 dark:border-white/10">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block">1. Detection</span>
                  <span className="font-bold text-slate-900 dark:text-white block mt-1">13:18:45</span>
                  <span className="text-[10px] text-red-600 dark:text-red-400">Alert Triggered</span>
                </div>
                <div className="bg-slate-100 dark:bg-black/20 p-3 rounded-xl border border-slate-200 dark:border-white/10">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block">2. AI Diagnosis</span>
                  <span className="font-bold text-slate-900 dark:text-white block mt-1">13:19:10</span>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400">RCA Confirmed</span>
                </div>
                <div className="bg-slate-100 dark:bg-black/20 p-3 rounded-xl border border-slate-200 dark:border-white/10">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block">3. Human Approval</span>
                  <span className="font-bold text-slate-900 dark:text-white block mt-1">13:22:04</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400">Approved by Engineer</span>
                </div>
                <div className="bg-slate-100 dark:bg-black/20 p-3 rounded-xl border border-slate-200 dark:border-white/10">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block">4. Execution</span>
                  <span className="font-bold text-slate-900 dark:text-white block mt-1">13:25:30</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Live Migration</span>
                </div>
                <div className="bg-slate-100 dark:bg-black/20 p-3 rounded-xl border border-slate-200 dark:border-white/10">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block">5. Resolution</span>
                  <span className="font-bold text-slate-900 dark:text-white block mt-1">13:28:12</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Resolved</span>
                </div>
              </div>
            </div>

            {/* Lessons Learned & Action Items */}
            <div className="bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-2.5">
              <h4 className="font-bold text-xs text-emerald-600 dark:text-emerald-400 uppercase">Lessons Learned & Preventive Action Items</h4>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  เพิ่ม Storage Array Auto-Tiering Rule เมื่อ Latency เกิน 20 ms เป็นเวลาต่อเนื่อง 3 นาที
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ปรับแต่ง AI Threshold สำหรับการส่งแจ้งเตือน Live Migration ให้เร็วขึ้น 5 นาที
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
