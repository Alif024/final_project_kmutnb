'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import StatusBar from '@/components/StatusBar';
import CommandPreviewModal from '@/components/CommandPreviewModal';
import RejectReasonModal from '@/components/RejectReasonModal';

// Views
import DashboardView from '@/components/views/DashboardView';
import InfrastructureView from '@/components/views/InfrastructureView';
import AIAnalysisView from '@/components/views/AIAnalysisView';
import ActionCenterView from '@/components/views/ActionCenterView';
import ReportsView from '@/components/views/ReportsView';
import SettingsView from '@/components/views/SettingsView';

// Mock Data & Types
import {
  MOCK_HYPERVISORS,
  MOCK_VMS,
  MOCK_TOPOLOGY_NODES,
  MOCK_TOPOLOGY_EDGES,
  MOCK_INCIDENT_01,
  MOCK_DIAGNOSIS_01,
  MOCK_RECOMMENDATIONS,
  MOCK_APPROVALS,
  MOCK_SYSLOGS,
  MOCK_ALERTS,
  MOCK_CHAT_SESSIONS,
  MOCK_CHAT_MESSAGES,
  MOCK_AUDIT_LOGS,
} from '@/lib/mock-data';
import { UserRole, ApprovalRequest, AuditLogEntry, Recommendation } from '@/types/ai-noc';

export default function Page() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState('default');
  const [userRole, setUserRole] = useState<UserRole>('engineer');

  // Interactive Data States
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(MOCK_APPROVALS);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(MOCK_RECOMMENDATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(MOCK_AUDIT_LOGS);

  // Modals state
  const [approveModalReq, setApproveModalReq] = useState<ApprovalRequest | null>(null);
  const [rejectModalReq, setRejectModalReq] = useState<ApprovalRequest | null>(null);

  // Handle Tab Navigation
  const handleNavigateTab = (tab: string, subtab: string = 'default') => {
    setActiveTab(tab);
    setActiveSubTab(subtab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Approve Confirmation
  const handleConfirmApprove = (id: string, commandExecuted: string) => {
    const targetReq = approvals.find((a) => a.id === id);
    if (!targetReq) return;

    // Update approval item
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'executed' } : a))
    );

    // Update corresponding recommendation
    setRecommendations((prev) =>
      prev.map((r) => (r.id === targetReq.recommendationId ? { ...r, status: 'executed' } : r))
    );

    // Add Audit Log Entry
    setAuditLogs((prev) => {
      const newLog: AuditLogEntry = {
        id: `audit-${prev.length + 1}`,
        timestamp: new Date().toLocaleDateString('th-TH') + ' ' + new Date().toLocaleTimeString('th-TH'),
        userRole: userRole,
        actionTitle: targetReq.actionTitle,
        decision: 'Approved & Executed',
        commandExecuted: commandExecuted,
        detailsReason: `อนุมัติและรันคำสั่งสำเร็จ โดยวิศวกรประจำศูนย์ NOC (Role: ${userRole.toUpperCase()})`,
      };
      return [newLog, ...prev];
    });
  };

  // Handle Reject Confirmation
  const handleConfirmReject = (id: string, rejectionReason: string) => {
    const targetReq = approvals.find((a) => a.id === id);
    if (!targetReq) return;

    // Update approval item
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'rejected' } : a))
    );

    // Update corresponding recommendation
    setRecommendations((prev) =>
      prev.map((r) => (r.id === targetReq.recommendationId ? { ...r, status: 'not-recommended' } : r))
    );

    // Add Audit Log Entry
    setAuditLogs((prev) => {
      const newLog: AuditLogEntry = {
        id: `audit-${prev.length + 1}`,
        timestamp: new Date().toLocaleDateString('th-TH') + ' ' + new Date().toLocaleTimeString('th-TH'),
        userRole: userRole,
        actionTitle: targetReq.actionTitle,
        decision: 'Rejected',
        detailsReason: `เหตุผลการปฏิเสธ: ${rejectionReason}`,
      };
      return [newLog, ...prev];
    });
  };

  const pendingApprovalCount = approvals.filter((a) => a.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#020617] text-[#F8FAFC] font-sans flex flex-col selection:bg-blue-600 selection:text-white relative overflow-x-hidden">
      {/* Frosted Glass Ambient Glow Background Lights */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-blue-600/20 rounded-full blur-[130px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[160px]"></div>
        <div className="absolute top-[25%] right-[15%] w-[35%] h-[35%] bg-indigo-600/15 rounded-full blur-[120px]"></div>
      </div>

      <div className="flex flex-1 min-h-screen relative z-10">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => handleNavigateTab(tab, 'default')}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          userRole={userRole}
          setUserRole={setUserRole}
          pendingApprovalCount={pendingApprovalCount}
        />

        {/* Main Content Column */}
        <div
          className={`flex-1 flex flex-col min-w-0 bg-transparent pt-14 pb-9 transition-all duration-300 ${
            collapsed ? "ml-[72px]" : "ml-[240px]"
          }`}
        >
          {/* TopBar */}
          <TopBar
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            activeAlertCount={MOCK_ALERTS.length}
            onRefresh={() => {}}
            title={
              activeTab === 'dashboard'
                ? 'NOC Dashboard'
                : activeTab === 'infrastructure'
                ? 'Infrastructure View'
                : activeTab === 'ai-analysis'
                ? 'AI Analysis'
                : activeTab === 'action-center'
                ? 'Action Center'
                : activeTab === 'reports'
                ? 'Reports & Analytics'
                : 'Settings & Administration'
            }
            subtitle="AI Network Operation Center System"
          />

          {/* View Container */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                hypervisors={MOCK_HYPERVISORS}
                recentAlerts={MOCK_ALERTS}
                onNavigateTab={handleNavigateTab}
                onSelectIncident={() => handleNavigateTab('ai-analysis', 'diagnosis')}
              />
            )}

            {activeTab === 'infrastructure' && (
              <InfrastructureView
                hypervisors={MOCK_HYPERVISORS}
                vms={MOCK_VMS}
                nodes={MOCK_TOPOLOGY_NODES}
                edges={MOCK_TOPOLOGY_EDGES}
                syslogs={MOCK_SYSLOGS}
                recentAlerts={MOCK_ALERTS}
                initialSubTab={activeSubTab}
                onNavigateTab={handleNavigateTab}
              />
            )}

            {activeTab === 'ai-analysis' && (
              <AIAnalysisView
                diagnosis={MOCK_DIAGNOSIS_01}
                incident={MOCK_INCIDENT_01}
                chatSessions={MOCK_CHAT_SESSIONS}
                chatMessages={MOCK_CHAT_MESSAGES}
                initialSubTab={activeSubTab}
                onNavigateTab={handleNavigateTab}
              />
            )}

            {activeTab === 'action-center' && (
              <ActionCenterView
                recommendations={recommendations}
                approvals={approvals}
                userRole={userRole}
                initialSubTab={activeSubTab}
                onOpenApproveModal={(req) => setApproveModalReq(req)}
                onOpenRejectModal={(req) => setRejectModalReq(req)}
                onNavigateTab={handleNavigateTab}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                incidents={[MOCK_INCIDENT_01]}
                initialSubTab={activeSubTab}
                onNavigateTab={handleNavigateTab}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                userRole={userRole}
                onRoleChange={setUserRole}
                auditLogs={auditLogs}
                initialSubTab={activeSubTab}
              />
            )}
          </main>

          {/* Fixed Bottom Status Bar (spans the main content column only) */}
          <StatusBar
            collapsed={collapsed}
            lastUpdate="24/05/2569 15:42:18"
            onRefresh={() => {}}
            isCollectorActive={true}
            isAiRunning={true}
          />
        </div>
      </div>

      {/* Human-in-the-Loop Command Execution Preview Modal */}
      <CommandPreviewModal
        request={approveModalReq}
        onClose={() => setApproveModalReq(null)}
        onConfirmApprove={handleConfirmApprove}
      />

      {/* Human-in-the-Loop Rejection Reason Modal */}
      <RejectReasonModal
        request={rejectModalReq}
        onClose={() => setRejectModalReq(null)}
        onConfirmReject={handleConfirmReject}
      />
    </div>
  );
}
