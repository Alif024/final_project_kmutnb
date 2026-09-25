'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import StatusBar from '@/components/StatusBar';
import RejectReasonModal from '@/components/RejectReasonModal';

// Views
import DashboardView from '@/components/views/DashboardView';
import InfrastructureView from '@/components/views/InfrastructureView';
import LogExplorerView from '@/components/views/LogExplorerView';
import AIAnalysisView from '@/components/views/AIAnalysisView';
import ActionCenterView from '@/components/views/ActionCenterView';
import ReportsView from '@/components/views/ReportsView';
import SettingsView from '@/components/views/SettingsView';

// Mock Data & Types
import {
  MOCK_HYPERVISORS,
  MOCK_VMS,
  MOCK_INCIDENT_01,
  MOCK_DIAGNOSIS_01,
  MOCK_RECOMMENDATIONS,
  MOCK_APPROVALS,
  MOCK_ALERTS,
  MOCK_CHAT_SESSIONS,
  MOCK_CHAT_MESSAGES,
  MOCK_AUDIT_LOGS,
  MOCK_INTEGRATIONS,
  MOCK_NETWORK_DEVICES,
} from '@/lib/mock-data';
import { UserRole, ApprovalRequest, AuditLogEntry, Recommendation, Integration, Alert } from '@/types/ai-noc';
import { canManuallyExecute } from '@/lib/execution-policy';
import { getAllLogs } from '@/lib/log-source';
import { getIntegrationMeta } from '@/lib/integrations';

export default function Page() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState('default');
  const [userRole, setUserRole] = useState<UserRole>('engineer');

  // Interactive Data States
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(MOCK_APPROVALS);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(MOCK_RECOMMENDATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(MOCK_AUDIT_LOGS);
  // สถานะรับทราบต้องอยู่ต่อเมื่อสลับไปหน้าอื่นแล้วกลับ Dashboard
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const handleAcknowledgeAlert = (id: string) => {
    if (userRole === 'viewer') return;
    setAlerts((previous) => previous.map((alert) =>
      alert.id === id && alert.status === 'active' ? { ...alert, status: 'acknowledged' } : alert
    ));
  };
  // เก็บไว้ที่นี่แทนภายใน SettingsView เพราะ View ถูก unmount ทุกครั้งที่สลับแท็บ
  const [integrations, setIntegrations] = useState<Integration[]>(MOCK_INTEGRATIONS);

  // Modals state
  const [rejectModalReq, setRejectModalReq] = useState<ApprovalRequest | null>(null);

  // Telemetry refresh timestamp (mock — no real collector to poll yet)
  const [lastUpdate, setLastUpdate] = useState('24/05/2569 15:42:18');
  const handleRefresh = () => {
    setLastUpdate(new Date().toLocaleDateString('th-TH') + ' ' + new Date().toLocaleTimeString('th-TH'));
  };

  // Handle Tab Navigation
  const handleNavigateTab = (tab: string, subtab: string = 'default') => {
    setActiveTab(tab === 'infrastructure' && subtab === 'monitoring' ? 'monitoring' : tab);
    setActiveSubTab(subtab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Approve Confirmation
  const handleConfirmApprove = (id: string) => {
    const targetReq = approvals.find((a) => a.id === id);
    if (!targetReq || !canManuallyExecute(targetReq, userRole)) return;

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
        commandExecuted: targetReq.commandPreview,
        detailsReason: `อนุมัติแบบ Manual และจำลองการรันสำเร็จ (Role: ${userRole.toUpperCase()})`,
      };
      return [newLog, ...prev];
    });
  };

  // Handle Reject Confirmation
  const handleConfirmReject = (id: string, rejectionReason: string) => {
    const targetReq = approvals.find((a) => a.id === id);
    if (!targetReq || !canManuallyExecute(targetReq, userRole)) return;

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

  // เพิ่มรายการเชื่อมต่อใหม่จาก Add Integration Wizard (ต่อท้ายรายการเดิม)
  const handleAddIntegration = (integration: Integration) => {
    setIntegrations((prev) => [...prev, integration]);
  };

  // ลบรายการเชื่อมต่อออกจากระบบ (ยืนยันผ่าน DeleteIntegrationModal มาแล้ว)
  const handleRemoveIntegration = (id: string) => {
    setIntegrations((prev) => prev.filter((i) => i.id !== id));
  };

  // ทดสอบการเชื่อมต่อผ่าน (จำลอง) — อัปเดตสถานะการ์ดให้เป็น Connected
  const handleIntegrationTested = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              connectionState: 'connected',
              statusLabel: getIntegrationMeta(i.type).connectedLabel,
              details: i.details.map((d) =>
                d.label === 'API Status:' ? { ...d, value: '200 OK', tone: 'positive' as const } : d
              ),
            }
          : i
      )
    );
  };

  const pendingApprovalCount = approvals.filter((a) => a.status === 'pending').length;

  return (
    // เปลือกแอปสูงเท่าจอพอดีและไม่เลื่อนเอง (h-screen + overflow-hidden)
    // การเลื่อนทั้งหมดเกิดใน <main> หรือลึกลงไป — TopBar/StatusBar ที่เป็น fixed
    // จึงไม่มีทางทับเนื้อหา และ View ที่อยากเต็มจอก็รับความสูงที่แน่นอนไปใช้ได้
    <div className="h-screen bg-slate-50 dark:bg-[#020617] text-[#F8FAFC] font-sans flex flex-col selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Frosted Glass Ambient Glow Background Lights */}
      <div className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${activeTab === 'dashboard' ? 'hidden' : ''}`}>
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-blue-400/10 dark:bg-blue-600/20 rounded-full blur-[130px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-400/10 dark:bg-emerald-600/10 rounded-full blur-[160px]"></div>
        <div className="absolute top-[25%] right-[15%] w-[35%] h-[35%] bg-indigo-400/10 dark:bg-indigo-600/15 rounded-full blur-[120px]"></div>
      </div>

      <div className="flex flex-1 min-h-0 relative z-10">
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
          className={`flex-1 flex flex-col min-w-0 min-h-0 bg-transparent pt-14 pb-9 transition-all duration-300 ${
            collapsed ? "ml-[72px]" : "ml-[240px]"
          }`}
        >
          {/* TopBar */}
          <TopBar
            collapsed={collapsed}
            activeAlertCount={alerts.filter((alert) => alert.status !== 'resolved').length}
            onRefresh={handleRefresh}
            title={
              activeTab === 'dashboard'
                ? 'NOC Dashboard'
                : activeTab === 'infrastructure'
                ? 'Infrastructure Topology'
                : activeTab === 'monitoring'
                ? 'Device & Hypervisor Monitoring'
                : activeTab === 'logs'
                ? 'Log Explorer'
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

          {/* View Container — เป็นพื้นที่เลื่อนหลักของแอป
              เพราะเปลือกด้านนอกสูงเท่าจอพอดี main จึงมีความสูงที่แน่นอนเสมอ
              • View ทั่วไปที่ยาวกว่าจอ จะเลื่อนอยู่ใน main แทนการเลื่อนทั้งหน้า
              • View ที่อยากเต็มจอ (Log Explorer) ใส่ `lg:flex-1 lg:min-h-0`
                ที่ตัวเอง แล้วจัดการเลื่อนภายในคอลัมน์ของตัวเอง */}
          <main
            className={`flex-1 min-h-0 overflow-y-auto flex flex-col p-4 sm:p-6 w-full mx-auto ${activeTab === 'dashboard' ? 'max-w-[1600px]' : 'lg:p-8 max-w-7xl'} ${
              // Log Explorer เป็น View เต็มจอที่จัดขอบเอง — ตัด padding ล่างออก
              // เพื่อให้ก้นคอลัมน์ชิดขอบบนของ StatusBar พอดี
              activeTab === 'logs' ? 'lg:pb-0' : ''
            }`}
          >
            {activeTab === 'dashboard' && (
              <DashboardView
                hypervisors={MOCK_HYPERVISORS}
                recentAlerts={alerts}
                onAcknowledgeAlert={handleAcknowledgeAlert}
                canAcknowledge={userRole !== 'viewer'}
                onNavigateTab={handleNavigateTab}
                onSelectIncident={() => handleNavigateTab('ai-analysis', 'diagnosis')}
                onRefresh={handleRefresh}
              />
            )}

            {(activeTab === 'infrastructure' || activeTab === 'monitoring') && (
              <InfrastructureView
                key={activeTab}
                mode={activeTab === 'monitoring' ? 'monitoring' : 'topology'}
                hypervisors={MOCK_HYPERVISORS}
                vms={MOCK_VMS}
                networkDevices={MOCK_NETWORK_DEVICES}
                syslogs={getAllLogs()}
                recentAlerts={alerts}
                onNavigateTab={handleNavigateTab}
              />
            )}

            {activeTab === 'logs' && (
              <LogExplorerView
                incidentId={MOCK_INCIDENT_01.id}
                // เข้ามาจากปุ่ม "ดู Log ทั้งหมด" ในหน้า AI Analysis → กรองเฉพาะหลักฐานของ Incident นี้
                initialQuery={
                  activeSubTab === 'incident' ? { incidentId: MOCK_INCIDENT_01.id } : undefined
                }
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
                onConfirmApprove={handleConfirmApprove}
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
                integrations={integrations}
                onAddIntegration={handleAddIntegration}
                onRemoveIntegration={handleRemoveIntegration}
                onIntegrationTested={handleIntegrationTested}
                initialSubTab={activeSubTab}
              />
            )}
          </main>

          {/* Fixed Bottom Status Bar (spans the main content column only) */}
          <StatusBar
            collapsed={collapsed}
            lastUpdate={lastUpdate}
            onRefresh={handleRefresh}
            isCollectorActive={true}
            isAiRunning={true}
          />
        </div>
      </div>

      {/* Human-in-the-Loop Rejection Reason Modal */}
      {/* key={rejectModalReq?.id} forces a fresh instance per request, so a
          previously typed rejection reason never carries over */}
      <RejectReasonModal
        key={rejectModalReq?.id}
        request={rejectModalReq}
        onClose={() => setRejectModalReq(null)}
        onConfirmReject={handleConfirmReject}
      />
    </div>
  );
}
