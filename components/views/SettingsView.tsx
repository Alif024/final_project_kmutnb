'use client';

import React, { useState } from 'react';
import {
  Settings,
  Server,
  Sliders,
  Users,
  Shield,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Save,
  Key,
  Bell,
  Cpu,
  Brain,
  Lock,
  Eye,
  UserCheck,
  Clock,
  Terminal
} from 'lucide-react';
import { UserRole, AuditLogEntry } from '@/types/ai-noc';

interface SettingsViewProps {
  userRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  auditLogs: AuditLogEntry[];
  initialSubTab?: string;
}

export default function SettingsView({
  userRole,
  onRoleChange,
  auditLogs,
  initialSubTab = 'integrations',
}: SettingsViewProps) {
  const [subTab, setSubTab] = useState<'integrations' | 'system' | 'rbac' | 'audit'>(
    initialSubTab === 'system'
      ? 'system'
      : initialSubTab === 'rbac'
      ? 'rbac'
      : initialSubTab === 'audit'
      ? 'audit'
      : 'integrations'
  );

  // System config state
  const [aiModel, setAiModel] = useState('gemini-3.6-flash');
  const [cpuReadyThreshold, setCpuReadyThreshold] = useState('5.0');
  const [storageLatencyThreshold, setStorageLatencyThreshold] = useState('10.0');
  const [packetLossThreshold, setPacketLossThreshold] = useState('1.0');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-300">
      {/* SubTab Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-400" />
            Settings & System Administration
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {subTab === 'integrations'
              ? 'จัดการการเชื่อมต่อภายนอก (vCenter, Proxmox, Syslog Server, Webhook)'
              : subTab === 'system'
              ? 'การตั้งค่า AI Engine, Threshold และ นโยบายความปลอดภัย'
              : subTab === 'rbac'
              ? 'จัดการสิทธิ์ผู้ใช้งาน (Role-Based Access Control: Admin, Engineer, Viewer)'
              : 'ประวัติการทำรายการทั้งหมดในระบบ (Human-in-the-Loop Audit Trail Log)'}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white/5 backdrop-blur-md p-1 rounded-xl border border-white/10 overflow-x-auto">
          <button
            onClick={() => setSubTab('integrations')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              subTab === 'integrations' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Server className="w-4 h-4" /> Integrations
          </button>
          <button
            onClick={() => setSubTab('system')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              subTab === 'system' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Sliders className="w-4 h-4" /> System Config
          </button>
          <button
            onClick={() => setSubTab('rbac')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              subTab === 'rbac' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4" /> RBAC Users
          </button>
          <button
            onClick={() => setSubTab('audit')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              subTab === 'audit' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Clock className="w-4 h-4" /> Audit Log
          </button>
        </div>
      </div>

      {/* SUBTAB 1: INTEGRATION CONFIG */}
      {subTab === 'integrations' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg">
            <h3 className="font-bold text-sm text-white">การเชื่อมต่อระบบโครงสร้างพื้นฐานและซอฟต์แวร์ติดตาม</h3>
            <button
              onClick={() => alert('Add Integration wizard')}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> เพิ่มการเชื่อมต่อ (Add Integration)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. VMware vCenter */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg hover:border-white/20 transition-all">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/30">
                    vC
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">VMware vCenter Server</h4>
                    <span className="text-xs text-slate-400 font-mono">10.0.0.100</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase">
                  Connected
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between"><span>API Status:</span> <span className="text-emerald-400 font-semibold">200 OK</span></div>
                <div className="flex justify-between"><span>Last Sync:</span> <span className="font-mono text-white">2 นาทีที่แล้ว</span></div>
                <div className="flex justify-between"><span>Managed Hosts:</span> <span className="text-white font-bold">4 ESXi Hosts</span></div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-2">
                <button className="px-3 py-1.5 bg-black/20 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-white/10 transition-all">
                  Test Connection
                </button>
                <button className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg text-xs font-semibold border border-blue-500/30 transition-all">
                  Sync Now
                </button>
              </div>
            </div>

            {/* 2. Proxmox VE Cluster */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg hover:border-white/20 transition-all">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold border border-orange-500/30">
                    PVE
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Proxmox VE Cluster</h4>
                    <span className="text-xs text-slate-400 font-mono">10.0.0.120</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase">
                  Connected
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between"><span>API Status:</span> <span className="text-emerald-400 font-semibold">200 OK</span></div>
                <div className="flex justify-between"><span>Last Sync:</span> <span className="font-mono text-white">1 นาทีที่แล้ว</span></div>
                <div className="flex justify-between"><span>Managed Nodes:</span> <span className="text-white font-bold">2 PVE Nodes</span></div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-2">
                <button className="px-3 py-1.5 bg-black/20 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-white/10 transition-all">
                  Test Connection
                </button>
                <button className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg text-xs font-semibold border border-blue-500/30 transition-all">
                  Sync Now
                </button>
              </div>
            </div>

            {/* 3. Unified Syslog & Monitoring Server */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg hover:border-white/20 transition-all">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold border border-purple-500/30">
                    LOG
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Unified Syslog & Metric Server</h4>
                    <span className="text-xs text-slate-400 font-mono">10.0.0.200</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase">
                  NTP Synced
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between"><span>Service:</span> <span className="text-emerald-400 font-semibold">Syslogd + Prometheus</span></div>
                <div className="flex justify-between"><span>Ingestion Rate:</span> <span className="font-mono text-white">1,240 msg/sec</span></div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-2">
                <button className="px-3 py-1.5 bg-black/20 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-white/10 transition-all">
                  Test Connection
                </button>
              </div>
            </div>

            {/* 4. LINE / Webhook Alerts */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg hover:border-white/20 transition-all">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold border border-emerald-500/30">
                    NOTI
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">LINE Notify & Webhook Gateway</h4>
                    <span className="text-xs text-slate-400">Group: NOC Critical Alerts</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase">
                  Active
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between"><span>Target:</span> <span className="text-white font-semibold">https://notify-api.line.me</span></div>
                <div className="flex justify-between"><span>Alert Level:</span> <span className="text-amber-400 font-bold">Critical & High Only</span></div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-2">
                <button className="px-3 py-1.5 bg-black/20 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-white/10 transition-all">
                  Send Test Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: SYSTEM CONFIG */}
      {subTab === 'system' && (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-6 shadow-lg max-w-4xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              การตั้งค่า AI Engine & Threshold Configuration
            </h3>

            <button
              onClick={handleSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {isSaved ? 'บันทึกเรียบร้อย!' : 'บันทึกการตั้งค่า'}
            </button>
          </div>

          <div className="space-y-5 text-xs">
            {/* Model Selector */}
            <div className="space-y-1.5">
              <label className="font-bold text-white block">โมเดล AI หลักสำหรับ AI-NOC Engine:</label>
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 font-semibold"
              >
                <option value="gemini-3.6-flash" className="bg-slate-900">Gemini 3.6 Flash (ความเร็วสูง และแม่นยำสูง - แนะนำ)</option>
                <option value="gemini-3.5-pro" className="bg-slate-900">Gemini 3.5 Pro (เน้นการวิเคราะห์เหตุผลเชิงลึก)</option>
              </select>
            </div>

            {/* Threshold Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-white/10">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 block">CPU Ready Time Limit (%):</label>
                <input
                  type="text"
                  value={cpuReadyThreshold}
                  onChange={(e) => setCpuReadyThreshold(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 block">Storage Latency Limit (ms):</label>
                <input
                  type="text"
                  value={storageLatencyThreshold}
                  onChange={(e) => setStorageLatencyThreshold(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 block">Packet Loss Limit (%):</label>
                <input
                  type="text"
                  value={packetLossThreshold}
                  onChange={(e) => setPacketLossThreshold(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-2.5 text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: RBAC USER ROLES & DEMO SWITCHER */}
      {subTab === 'rbac' && (
        <div className="space-y-6">
          {/* Role Switching Demo Control Card */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-400" />
                  ทดสอบเปลี่ยนสิทธิ์ผู้ใช้งาน (Role Switcher for Evaluation Demo)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  เลือกบทบาทเพื่อทดสอบสิทธิ์การใช้งานในหน้าอนุมัติและจัดการระบบ
                </p>
              </div>

              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                สิทธิ์ปัจจุบัน: {userRole.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                onClick={() => onRoleChange('admin')}
                className={`p-3 rounded-xl border text-left text-xs transition-all ${
                  userRole === 'admin'
                    ? 'bg-purple-600/80 text-white font-bold border-purple-400 shadow-lg'
                    : 'bg-black/20 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">Admin (สิทธิ์เต็ม)</span>
                  <Lock className="w-4 h-4 text-purple-300" />
                </div>
                <p className="text-[10px] opacity-80 mt-1">อนุมัติ, รันคำสั่ง, เปิด/ปิด Auto-Execute Rules</p>
              </button>

              <button
                onClick={() => onRoleChange('engineer')}
                className={`p-3 rounded-xl border text-left text-xs transition-all ${
                  userRole === 'engineer'
                    ? 'bg-blue-600/80 text-white font-bold border-blue-400 shadow-lg'
                    : 'bg-black/20 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">NOC Engineer</span>
                  <Shield className="w-4 h-4 text-blue-300" />
                </div>
                <p className="text-[10px] opacity-80 mt-1">อนุมัติและปฏิเสธคำสั่งของ AI ได้</p>
              </button>

              <button
                onClick={() => onRoleChange('viewer')}
                className={`p-3 rounded-xl border text-left text-xs transition-all ${
                  userRole === 'viewer'
                    ? 'bg-slate-600/80 text-white font-bold border-slate-400 shadow-lg'
                    : 'bg-black/20 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">Viewer (Read-Only)</span>
                  <Eye className="w-4 h-4 text-slate-300" />
                </div>
                <p className="text-[10px] opacity-80 mt-1">ดูข้อมูลได้อย่างเดียว ไม่สามารถกดอนุมัติได้</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: AUDIT LOG */}
      {subTab === 'audit' && (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Human-in-the-Loop Audit Trail Log (บันทึกประวัติการอนุมัติและรันคำสั่ง)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="pb-3 font-semibold">Timestamp</th>
                  <th className="pb-3 font-semibold">User Role</th>
                  <th className="pb-3 font-semibold">Action Title</th>
                  <th className="pb-3 font-semibold">Decision</th>
                  <th className="pb-3 font-semibold">Details / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-all">
                    <td className="py-2.5 text-blue-400 font-bold">{log.timestamp}</td>
                    <td className="py-2.5 text-white capitalize">{log.userRole}</td>
                    <td className="py-2.5 font-bold text-white">{log.actionTitle}</td>
                    <td className="py-2.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          log.decision === 'Approved & Executed'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {log.decision}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400 max-w-xs truncate">{log.detailsReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
