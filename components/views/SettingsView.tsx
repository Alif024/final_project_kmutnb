'use client';

import React, { useState } from 'react';
import {
  Settings,
  Server,
  Sliders,
  Users,
  Shield,
  Plus,
  Save,
  Brain,
  Lock,
  Eye,
  UserCheck,
  Clock,
  Trash2,
  Loader2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { UserRole, AuditLogEntry, Integration } from '@/types/ai-noc';
import AddIntegrationModal from '@/components/AddIntegrationModal';
import DeleteIntegrationModal from '@/components/DeleteIntegrationModal';
import {
  ACCENT_CLASSES,
  DETAIL_TONE_CLASSES,
  buildConnectionTestSteps,
  getIntegrationMeta,
} from '@/lib/integrations';
import { useConnectionTest } from '@/hooks/use-connection-test';
import ConnectionTestConsole from '@/components/ConnectionTestConsole';

interface SettingsViewProps {
  userRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  auditLogs: AuditLogEntry[];
  integrations: Integration[];
  onAddIntegration: (integration: Integration) => void;
  onRemoveIntegration: (id: string) => void;
  onIntegrationTested: (id: string) => void;
  initialSubTab?: string;
}

export default function SettingsView({
  userRole,
  onRoleChange,
  auditLogs,
  integrations,
  onAddIntegration,
  onRemoveIntegration,
  onIntegrationTested,
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

  // Add Integration Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  // รายการที่กำลังรอยืนยันการลบ (null = ยังไม่ได้กดลบรายการใด)
  const [integrationToDelete, setIntegrationToDelete] = useState<Integration | null>(null);
  const connectedCount = integrations.filter((i) => i.connectionState === 'connected').length;
  const pendingCount = integrations.length - connectedCount;
  // Viewer เป็นสิทธิ์แบบอ่านอย่างเดียว จึงเพิ่มการเชื่อมต่อใหม่ไม่ได้
  const canManageIntegrations = userRole !== 'viewer';

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-300">
      {/* SubTab Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-500 dark:text-slate-400" />
            Settings & System Administration
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subTab === 'integrations'
              ? 'จัดการการเชื่อมต่อภายนอก (vCenter, Proxmox, Syslog Server, Webhook)'
              : subTab === 'system'
              ? 'การตั้งค่า AI Engine, Threshold และ นโยบายความปลอดภัย'
              : subTab === 'rbac'
              ? 'จัดการสิทธิ์ผู้ใช้งาน (Role-Based Access Control: Admin, Engineer, Viewer)'
              : 'ประวัติการทำรายการทั้งหมดในระบบ (Human-in-the-Loop Audit Trail Log)'}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-white/5 backdrop-blur-md p-1 rounded-xl border border-slate-200 dark:border-white/10 overflow-x-auto">
          <button
            onClick={() => setSubTab('integrations')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              subTab === 'integrations' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <Server className="w-4 h-4" /> Integrations
          </button>
          <button
            onClick={() => setSubTab('system')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              subTab === 'system' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <Sliders className="w-4 h-4" /> System Config
          </button>
          <button
            onClick={() => setSubTab('rbac')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              subTab === 'rbac' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4" /> RBAC Users
          </button>
          <button
            onClick={() => setSubTab('audit')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              subTab === 'audit' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <Clock className="w-4 h-4" /> Audit Log
          </button>
        </div>
      </div>

      {/* SUBTAB 1: INTEGRATION CONFIG */}
      {subTab === 'integrations' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                การเชื่อมต่อระบบโครงสร้างพื้นฐานและซอฟต์แวร์ติดตาม
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ทั้งหมด {integrations.length} รายการ · เชื่อมต่อแล้ว {connectedCount} · รอการทดสอบ {pendingCount}
              </p>
            </div>

            <button
              onClick={() => setIsWizardOpen(true)}
              disabled={!canManageIntegrations}
              title={
                canManageIntegrations
                  ? undefined
                  : 'สิทธิ์ Viewer ดูข้อมูลได้อย่างเดียว ไม่สามารถเพิ่มการเชื่อมต่อได้'
              }
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
            >
              <Plus className="w-4 h-4" /> เพิ่มการเชื่อมต่อ (Add Integration)
            </button>
          </div>

          {integrations.length === 0 ? (
            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-dashed border-slate-300 dark:border-white/15 rounded-2xl p-10 text-center space-y-2">
              <Server className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">ยังไม่มีการเชื่อมต่อในระบบ</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI-NOC จะไม่ได้รับข้อมูลจากภายนอกจนกว่าจะเพิ่มการเชื่อมต่ออย่างน้อย 1 รายการ
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {integrations.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  canManage={canManageIntegrations}
                  onRequestDelete={() => setIntegrationToDelete(integration)}
                  onTestPassed={() => onIntegrationTested(integration.id)}
                />
              ))}
            </div>
          )}

          {/* Mount เฉพาะตอนเปิด เพื่อให้วิซาร์ดเริ่มที่ขั้นตอนที่ 1 ด้วยฟอร์มว่างทุกครั้ง */}
          {isWizardOpen && (
            <AddIntegrationModal
              existingIntegrations={integrations}
              onClose={() => setIsWizardOpen(false)}
              onAdd={onAddIntegration}
            />
          )}

          {integrationToDelete && (
            <DeleteIntegrationModal
              integration={integrationToDelete}
              onClose={() => setIntegrationToDelete(null)}
              onConfirmDelete={onRemoveIntegration}
            />
          )}
        </div>
      )}

      {/* SUBTAB 2: SYSTEM CONFIG */}
      {subTab === 'system' && (
        <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-6 shadow-lg max-w-4xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
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
              <label className="font-bold text-slate-900 dark:text-white block">โมเดล AI หลักสำหรับ AI-NOC Engine:</label>
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 font-semibold"
              >
                <option value="gemini-3.6-flash" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Gemini 3.6 Flash (ความเร็วสูง และแม่นยำสูง - แนะนำ)</option>
                <option value="gemini-3.5-pro" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Gemini 3.5 Pro (เน้นการวิเคราะห์เหตุผลเชิงลึก)</option>
              </select>
            </div>

            {/* Threshold Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-200 dark:border-white/10">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-600 dark:text-slate-300 block">CPU Ready Time Limit (%):</label>
                <input
                  type="text"
                  value={cpuReadyThreshold}
                  onChange={(e) => setCpuReadyThreshold(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-600 dark:text-slate-300 block">Storage Latency Limit (ms):</label>
                <input
                  type="text"
                  value={storageLatencyThreshold}
                  onChange={(e) => setStorageLatencyThreshold(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-600 dark:text-slate-300 block">Packet Loss Limit (%):</label>
                <input
                  type="text"
                  value={packetLossThreshold}
                  onChange={(e) => setPacketLossThreshold(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono"
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
          <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  ทดสอบเปลี่ยนสิทธิ์ผู้ใช้งาน (Role Switcher for Evaluation Demo)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  เลือกบทบาทเพื่อทดสอบสิทธิ์การใช้งานในหน้าอนุมัติและจัดการระบบ
                </p>
              </div>

              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30">
                สิทธิ์ปัจจุบัน: {userRole.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                onClick={() => onRoleChange('admin')}
                className={`p-3 rounded-xl border text-left text-xs transition-all ${
                  userRole === 'admin'
                    ? 'bg-purple-600/80 text-slate-900 dark:text-white font-bold border-purple-400 shadow-lg'
                    : 'bg-slate-100 dark:bg-black/20 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">Admin (สิทธิ์เต็ม)</span>
                  <Lock className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                </div>
                <p className="text-[10px] opacity-80 mt-1">อนุมัติ, รันคำสั่ง, เปิด/ปิด Auto-Execute Rules</p>
              </button>

              <button
                onClick={() => onRoleChange('engineer')}
                className={`p-3 rounded-xl border text-left text-xs transition-all ${
                  userRole === 'engineer'
                    ? 'bg-blue-600/80 text-slate-900 dark:text-white font-bold border-blue-400 shadow-lg'
                    : 'bg-slate-100 dark:bg-black/20 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">NOC Engineer</span>
                  <Shield className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                </div>
                <p className="text-[10px] opacity-80 mt-1">อนุมัติและปฏิเสธคำสั่งของ AI ได้</p>
              </button>

              <button
                onClick={() => onRoleChange('viewer')}
                className={`p-3 rounded-xl border text-left text-xs transition-all ${
                  userRole === 'viewer'
                    ? 'bg-slate-600/80 text-slate-900 dark:text-white font-bold border-slate-400 shadow-lg'
                    : 'bg-slate-100 dark:bg-black/20 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">Viewer (Read-Only)</span>
                  <Eye className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </div>
                <p className="text-[10px] opacity-80 mt-1">ดูข้อมูลได้อย่างเดียว ไม่สามารถกดอนุมัติได้</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: AUDIT LOG */}
      {subTab === 'audit' && (
        <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Human-in-the-Loop Audit Trail Log (บันทึกประวัติการอนุมัติและรันคำสั่ง)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                  <th className="pb-3 font-semibold">Timestamp</th>
                  <th className="pb-3 font-semibold">User Role</th>
                  <th className="pb-3 font-semibold">Action Title</th>
                  <th className="pb-3 font-semibold">Decision</th>
                  <th className="pb-3 font-semibold">Details / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                    <td className="py-2.5 text-blue-600 dark:text-blue-400 font-bold">{log.timestamp}</td>
                    <td className="py-2.5 text-slate-900 dark:text-white capitalize">{log.userRole}</td>
                    <td className="py-2.5 font-bold text-slate-900 dark:text-white">{log.actionTitle}</td>
                    <td className="py-2.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          log.decision === 'Approved & Executed'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                        }`}
                      >
                        {log.decision}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400 max-w-xs truncate">{log.detailsReason}</td>
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

/**
 * การ์ดแสดงสถานะการเชื่อมต่อ 1 รายการ — เรนเดอร์จากข้อมูลใน `integrations`
 * ทั้งรายการตั้งต้นและรายการที่เพิ่มผ่าน Add Integration Wizard
 */
function IntegrationCard({
  integration,
  canManage,
  onRequestDelete,
  onTestPassed,
}: {
  integration: Integration;
  canManage: boolean;
  onRequestDelete: () => void;
  onTestPassed: () => void;
}) {
  const meta = getIntegrationMeta(integration.type);
  const { state: testState, logs: testLogs, runTest } = useConnectionTest();
  const [isResultCollapsed, setIsResultCollapsed] = useState(false);

  const handleTest = () => {
    // ทดสอบใหม่ทั้งที ให้กางกล่องผลลัพธ์ให้เห็นเสมอ
    setIsResultCollapsed(false);
    runTest(
      buildConnectionTestSteps({
        type: integration.type,
        target: integration.target,
        port: integration.port,
        username: integration.username,
        protocol: integration.protocol,
      }),
      onTestPassed
    );
  };

  const statusBadgeClass =
    integration.connectionState === 'connected'
      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
      : integration.connectionState === 'pending'
      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
      : 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30';

  return (
    <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-lg hover:border-slate-400 dark:hover:border-white/20 transition-all">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-xs border ${ACCENT_CLASSES[meta.accent].icon}`}
          >
            {meta.badge}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{integration.name}</h4>
            <span
              className={`text-xs text-slate-500 dark:text-slate-400 block truncate ${
                meta.targetIsUrl ? '' : 'font-mono'
              }`}
            >
              {integration.target}
              {integration.port ? `:${integration.port}` : ''}
            </span>
          </div>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded border text-xs font-bold uppercase whitespace-nowrap ${statusBadgeClass}`}
        >
          {integration.statusLabel}
        </span>
      </div>

      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
        {integration.details.map((detail, idx) => (
          <div key={idx} className="flex justify-between gap-3">
            <span>{detail.label}</span>
            <span className={`text-right break-all ${DETAIL_TONE_CLASSES[detail.tone ?? 'default']}`}>
              {detail.value}
            </span>
          </div>
        ))}
      </div>

      {/* กล่องผลการทดสอบ — แสดงหลังกดปุ่มทดสอบครั้งแรกเท่านั้น เพื่อไม่ให้การ์ดยาวเกินจำเป็น */}
      {testState !== 'idle' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              ผลการทดสอบการเชื่อมต่อ (จำลอง):
            </span>
            {/* ย่อ/ขยายกล่องผลลัพธ์ — log ยังอยู่ครบ กลับมากางดูได้โดยไม่ต้องทดสอบใหม่ */}
            <button
              onClick={() => setIsResultCollapsed((prev) => !prev)}
              aria-expanded={!isResultCollapsed}
              aria-label={
                isResultCollapsed ? 'แสดงผลการทดสอบการเชื่อมต่อ' : 'ซ่อนผลการทดสอบการเชื่อมต่อ'
              }
              className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex items-center gap-1"
            >
              {isResultCollapsed ? (
                <>
                  แสดงผลลัพธ์ <ChevronDown className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  ซ่อนผลลัพธ์ <ChevronUp className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {!isResultCollapsed && (
            <ConnectionTestConsole
              state={testState}
              logs={testLogs}
              idleMessage=""
              successMessage={
                meta.type === 'webhook-notify'
                  ? 'ส่งการแจ้งเตือนทดสอบสำเร็จ'
                  : 'การเชื่อมต่อสำเร็จ — ระบบพร้อมรับข้อมูล'
              }
            />
          )}
        </div>
      )}

      <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
        <button
          onClick={onRequestDelete}
          disabled={!canManage}
          title={
            canManage
              ? 'ลบการเชื่อมต่อนี้ออกจากระบบ'
              : 'สิทธิ์ Viewer ดูข้อมูลได้อย่างเดียว ไม่สามารถลบการเชื่อมต่อได้'
          }
          aria-label={`ลบการเชื่อมต่อ ${integration.name}`}
          className="px-3 py-1.5 bg-red-400/10 dark:bg-red-600/20 hover:bg-red-600/30 text-red-600 dark:text-red-300 rounded-lg text-xs font-semibold border border-red-500/30 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-400/10 dark:disabled:hover:bg-red-600/20"
        >
          <Trash2 className="w-3.5 h-3.5" /> ลบ
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTest}
            disabled={testState === 'testing'}
            className="px-3 py-1.5 bg-slate-100 dark:bg-black/20 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg text-xs font-medium border border-slate-200 dark:border-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {testState === 'testing' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> กำลังทดสอบ...
              </>
            ) : (
              meta.testLabel
            )}
          </button>
          {meta.supportsSync && (
            <button className="px-3 py-1.5 bg-blue-400/10 dark:bg-blue-600/20 hover:bg-blue-600/30 text-blue-600 dark:text-blue-300 rounded-lg text-xs font-semibold border border-blue-500/30 transition-all">
              Sync Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
