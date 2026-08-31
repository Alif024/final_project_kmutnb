'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Filter,
  ArrowUpDown,
  Sparkles,
  Ban,
  Terminal,
} from 'lucide-react';
import { Recommendation, ApprovalRequest, UserRole } from '@/types/ai-noc';

interface ActionCenterViewProps {
  recommendations: Recommendation[];
  approvals: ApprovalRequest[];
  userRole: UserRole;
  initialSubTab?: string;
  onOpenApproveModal: (request: ApprovalRequest) => void;
  onOpenRejectModal: (request: ApprovalRequest) => void;
  onNavigateTab: (tab: string, subtab?: string) => void;
}

export default function ActionCenterView({
  recommendations: initialRecs,
  approvals: initialApprovals,
  userRole,
  initialSubTab = 'recommendations',
  onOpenApproveModal,
  onOpenRejectModal,
  onNavigateTab,
}: ActionCenterViewProps) {
  const [subTab, setSubTab] = useState<'recommendations' | 'approvals'>(
    initialSubTab === 'approvals' ? 'approvals' : 'recommendations'
  );
  const [recFilter, setRecFilter] = useState('all');
  const [autoExecute, setAutoExecute] = useState(false);
  const [approvalFilter, setApprovalFilter] = useState<'pending' | 'executed' | 'rejected'>('pending');

  const filteredApprovals = initialApprovals.filter((appr) => appr.status === approvalFilter);
  const filteredRecs =
    recFilter === 'all' ? initialRecs : initialRecs.filter((rec) => rec.status === recFilter);

  const recCountByPriority = (priority: Recommendation['priority']) =>
    initialRecs.filter((rec) => rec.priority === priority).length;

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-300">
      {/* SubTab Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Action Center
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subTab === 'recommendations'
              ? 'ข้อเสนอแนะและแนวทางแก้ไขจาก AI (Recommendation Center)'
              : 'อนุมัติหรือปฏิเสธการดำเนินการของ AI (AI Agent Approval - Human-in-the-Loop Gatekeeper)'}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-white/5 backdrop-blur-md p-1 rounded-xl border border-slate-200 dark:border-white/10">
          <button
            onClick={() => setSubTab('recommendations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'recommendations'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Recommendation Center
          </button>
          <button
            onClick={() => setSubTab('approvals')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all relative ${
              subTab === 'approvals'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            AI Agent Approval
            {initialApprovals.filter((a) => a.status === 'pending').length > 0 && (
              <span className="w-5 h-5 bg-red-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center ml-1">
                {initialApprovals.filter((a) => a.status === 'pending').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SUBTAB 1: RECOMMENDATION CENTER */}
      {subTab === 'recommendations' && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 cursor-pointer hover:border-slate-400 dark:hover:border-white/20 transition-colors">
              <span className="text-xs text-slate-600 dark:text-slate-300 block font-medium">ทั้งหมด</span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{initialRecs.length}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">รายการข้อเสนอแนะ</span>
            </div>

            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-red-500/30 rounded-2xl p-4 cursor-pointer hover:border-red-500 transition-colors">
              <span className="text-xs text-red-600 dark:text-red-400 block font-bold">Critical</span>
              <span className="text-2xl font-extrabold text-red-600 dark:text-red-400 tabular-nums">{recCountByPriority('critical')}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">ความสำคัญสูงสุด</span>
            </div>

            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-amber-500/30 rounded-2xl p-4 cursor-pointer hover:border-amber-500 transition-colors">
              <span className="text-xs text-amber-600 dark:text-amber-400 block font-bold">High</span>
              <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">{recCountByPriority('high')}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">ความสำคัญสูง</span>
            </div>

            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 cursor-pointer hover:border-slate-400 dark:hover:border-white/20 transition-colors">
              <span className="text-xs text-blue-600 dark:text-blue-400 block font-bold">Medium</span>
              <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">{recCountByPriority('medium')}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">ความสำคัญปานกลาง</span>
            </div>

            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 cursor-pointer hover:border-slate-400 dark:hover:border-white/20 transition-colors">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 block font-bold">Low</span>
              <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{recCountByPriority('low')}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">คำแนะนำทั่วไป</span>
            </div>
          </div>

          {/* Filter Bar & Sorting */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/20 p-1 rounded-xl border border-slate-200 dark:border-white/10">
              {(['all', 'pending-action', 'pending-approval', 'executed', 'not-recommended'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setRecFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    recFilter === st ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {st === 'all'
                    ? 'ทั้งหมด'
                    : st === 'pending-action'
                    ? 'รอดำเนินการ'
                    : st === 'pending-approval'
                    ? 'รออนุมัติ'
                    : st === 'executed'
                    ? 'ดำเนินการแล้ว'
                    : 'ไม่แนะนำ'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" /> Filter
              </button>
              <button className="px-3 py-1.5 bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5" /> เรียงตาม: ความสำคัญ
              </button>
            </div>
          </div>

          {/* Recommendations Table */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                    <th className="pb-3 font-semibold">Recommendation</th>
                    <th className="pb-3 font-semibold">แหล่งที่มา</th>
                    <th className="pb-3 font-semibold">ความสำคัญ</th>
                    <th className="pb-3 font-semibold">Confidence</th>
                    <th className="pb-3 font-semibold">สถานะ</th>
                    <th className="pb-3 font-semibold text-right">สร้างเมื่อ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredRecs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        ไม่พบรายการข้อเสนอแนะในหมวดนี้
                      </td>
                    </tr>
                  ) : (
                  filteredRecs.map((rec) => (
                    <tr
                      key={rec.id}
                      onClick={() => {
                        if (rec.status === 'pending-approval') {
                          setSubTab('approvals');
                        }
                      }}
                      className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <td className="py-3">
                        <div className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                          {rec.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{rec.description}</div>
                      </td>

                      <td className="py-3">
                        <span className="font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-black/20 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10">
                          {rec.sourceRefId}
                        </span>
                      </td>

                      <td className="py-3">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase ${
                            rec.priority === 'critical'
                              ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                              : rec.priority === 'high'
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : rec.priority === 'medium'
                              ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                              : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {rec.priority}
                        </span>
                      </td>

                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 dark:bg-black/20 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-white/10">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rec.confidence}%` }}></div>
                          </div>
                          <span className="font-mono text-[11px] text-slate-900 dark:text-white font-bold">{rec.confidence}%</span>
                        </div>
                      </td>

                      <td className="py-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            rec.status === 'pending-approval'
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-bold animate-pulse'
                              : rec.status === 'pending-action'
                              ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30'
                              : rec.status === 'executed'
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}
                        >
                          {rec.status === 'pending-approval'
                            ? 'รออนุมัติ'
                            : rec.status === 'pending-action'
                            ? 'รอดำเนินการ'
                            : rec.status === 'executed'
                            ? 'ดำเนินการแล้ว'
                            : 'ไม่แนะนำ'}
                        </span>
                      </td>

                      <td className="py-3 text-right font-mono text-slate-500 dark:text-slate-400">{rec.createdAt}</td>
                    </tr>
                  ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-white/10">
              <span>Showing {filteredRecs.length} of {initialRecs.length} results</span>
              <div className="flex items-center gap-1">
                <button className="px-2.5 py-1 bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded text-slate-900 dark:text-white font-bold">1</button>
              </div>
            </div>
          </div>

          {/* AI Insight Summary Card */}
          <div className="bg-gradient-to-r from-white to-purple-100 dark:from-purple-950/40 dark:to-blue-950/40 border border-purple-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg backdrop-blur-md">
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                AI Insight (สรุปเชิงลึกข้ามหลาย Recommendation)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                จากการวิเคราะห์ข้อมูลหลายแหล่ง พบว่า Storage Latency บน ESXi-Host-01 เป็นปัจจัยหลักที่ส่งผลกระทบต่อประสิทธิภาพของ ERP-VM แนะนำให้ย้าย VM ไปยัง Host-02 และตรวจสอบ Storage array ร่วมด้วย
              </p>
            </div>

            <button
              onClick={() => onNavigateTab('ai-analysis', 'diagnosis')}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shrink-0 flex items-center gap-1.5"
            >
              ดูรายละเอียดการวิเคราะห์ →
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB 2: AI AGENT APPROVAL (Human-in-the-Loop Gatekeeper) */}
      {subTab === 'approvals' && (
        <div className="space-y-6">
          {/* Controls & Auto-Execute Rule Toggle */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/20 p-1 rounded-xl border border-slate-200 dark:border-white/10">
              <button
                onClick={() => setApprovalFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  approvalFilter === 'pending' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                รออนุมัติ ({initialApprovals.filter((a) => a.status === 'pending').length})
              </button>
              <button
                onClick={() => setApprovalFilter('executed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  approvalFilter === 'executed' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ดำเนินการแล้ว
              </button>
              <button
                onClick={() => setApprovalFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  approvalFilter === 'rejected' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ปฏิเสธแล้ว
              </button>
            </div>

            {/* Auto-Execute Rules Toggle (Default OFF, Admin Only) */}
            <div className="flex items-center gap-3 bg-slate-100 dark:bg-black/20 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Auto-Execute Rules
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {autoExecute ? 'เปิดใช้งาน (เฉพาะ Low Risk)' : 'Off (มนุษย์ต้องอนุมัติเองเสมอ)'}
                </span>
              </div>

              <button
                disabled={userRole !== 'admin'}
                onClick={() => setAutoExecute(!autoExecute)}
                className={`w-12 h-6 rounded-full p-1 transition-colors relative ${
                  autoExecute ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-white/10'
                } ${userRole !== 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={userRole !== 'admin' ? 'ต้องใช้สิทธิ์ Admin ในการเปิด Auto-Execute Rules' : undefined}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    autoExecute ? 'translate-x-6' : 'translate-x-0'
                  }`}
                ></div>
              </button>
            </div>
          </div>

          {/* Approval Cards Stream */}
          <div className="space-y-6">
            {filteredApprovals.length === 0 ? (
              <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-12 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto opacity-80" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">ไม่มีรายการค้างรออนุมัติ</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">รายการขออนุมัติทั้งหมดได้รับการตรวจสอบจากวิศวกรประจำศูนย์ NOC เรียบร้อยแล้ว</p>
              </div>
            ) : (
              filteredApprovals.map((appr) => (
                <div
                  key={appr.id}
                  className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-lg relative hover:border-slate-400 dark:hover:border-white/20 transition-all"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-bold uppercase">
                        Critical
                      </span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
                        ต้องได้รับการอนุมัติ (Human Confirmation Required)
                      </span>
                    </div>

                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      สร้างเมื่อ: {appr.createdAt}
                    </span>
                  </div>

                  {/* 3 Columns Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
                    {/* Column 1: Context & Reason (4 cols) */}
                    <div className="lg:col-span-4 space-y-3 bg-slate-100 dark:bg-black/20 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                      <div>
                        <h4 className="font-extrabold text-base text-slate-900 dark:text-white">{appr.actionTitle}</h4>
                        <p className="text-slate-600 dark:text-slate-300 text-xs mt-1 leading-relaxed">{appr.reason}</p>
                      </div>

                      {/* Confidence Score Bar */}
                      <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-white/10">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-600 dark:text-slate-300">Confidence Score:</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{appr.confidence}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-black/20 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-white/10">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${appr.confidence}%` }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Action Details Table (4 cols) */}
                    <div className="lg:col-span-4 space-y-2 bg-slate-100 dark:bg-black/20 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                      <h5 className="font-bold text-xs text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-white/10 pb-1.5">
                        รายละเอียดการดำเนินการ
                      </h5>
                      <div className="space-y-1.5 text-xs">
                        {Object.entries(appr.parameters).map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">{k}:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200 font-mono">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Column 3: Expected Impact (4 cols) */}
                    <div className="lg:col-span-4 space-y-2 bg-slate-100 dark:bg-black/20 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                      <h5 className="font-bold text-xs text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-white/10 pb-1.5">
                        ผลกระทบคาดการณ์ (Expected Impact)
                      </h5>
                      <div className="space-y-2">
                        {appr.expectedImpacts.map((imp, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            {imp.tone === 'positive' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            )}
                            <span className={`text-xs ${imp.tone === 'positive' ? 'text-emerald-600 dark:text-emerald-300 font-medium' : 'text-amber-700 dark:text-amber-200'}`}>
                              {imp.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                    <button
                      onClick={() => onOpenApproveModal(appr)}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <Terminal className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      รายละเอียดเพิ่มเติม (Command Preview)
                    </button>

                    <button
                      onClick={() => onOpenRejectModal(appr)}
                      className="px-5 py-2 rounded-xl border border-red-500/50 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Ban className="w-4 h-4" />
                      ปฏิเสธ
                    </button>

                    <button
                      onClick={() => onOpenApproveModal(appr)}
                      disabled={userRole === 'viewer'}
                      className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={userRole === 'viewer' ? 'คุณไม่มีสิทธิ์ดำเนินการนี้ (Viewer Read-Only)' : undefined}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      อนุมัติ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
