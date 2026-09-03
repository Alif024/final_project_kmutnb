/**
 * ชุดข้อมูลจำลองของระบบ AI-NOC
 *
 * ข้อมูลทั้งหมดอ่านจากไฟล์เดียวคือ `lib/mock-data.json` — ยังไม่มีการดึงข้อมูล
 * จากเครื่องจริง (vCenter / Proxmox / SNMP / Syslog) โมดูลนี้ทำหน้าที่แค่
 * ผูกชนิดข้อมูล (TypeScript types) ให้กับ JSON และ re-export ตามชื่อเดิม
 * เมื่อจะต่อข้อมูลจริงในอนาคต ให้เปลี่ยนเฉพาะที่มาของ `data` ในไฟล์นี้
 */
import {
  Hypervisor,
  VirtualMachine,
  TopologyNode,
  TopologyEdge,
  Alert,
  Incident,
  Diagnosis,
  Recommendation,
  ApprovalRequest,
  AuditLog,
  ChatSession,
  ChatMessage,
  SyslogEntry,
  Integration
} from '@/types/ai-noc';
import mockDataJson from './mock-data.json';

export interface MockData {
  hypervisors: Hypervisor[];
  virtualMachines: VirtualMachine[];
  topologyNodes: TopologyNode[];
  topologyEdges: TopologyEdge[];
  alerts: Alert[];
  incident: Incident;
  diagnosis: Diagnosis;
  recommendations: Recommendation[];
  approvals: ApprovalRequest[];
  auditLogs: AuditLog[];
  chatSessions: ChatSession[];
  chatMessages: ChatMessage[];
  syslogs: SyslogEntry[];
  integrations: Integration[];
}

// JSON ให้ชนิดเป็น string กว้างๆ จึง cast กลับเป็น union types ที่ประกาศไว้ใน types/ai-noc
const data = mockDataJson as unknown as MockData;

export default data;

export const initialHypervisors: Hypervisor[] = data.hypervisors;
export const initialVMs: VirtualMachine[] = data.virtualMachines;
export const initialTopologyNodes: TopologyNode[] = data.topologyNodes;
export const initialTopologyEdges: TopologyEdge[] = data.topologyEdges;
export const initialRecentAlerts: Alert[] = data.alerts;
export const sampleIncident: Incident = data.incident;
export const sampleDiagnosis: Diagnosis = data.diagnosis;
export const initialRecommendations: Recommendation[] = data.recommendations;
export const initialApprovals: ApprovalRequest[] = data.approvals;
export const initialAuditLogs: AuditLog[] = data.auditLogs;
export const initialChatSessions: ChatSession[] = data.chatSessions;
export const initialChatMessages: ChatMessage[] = data.chatMessages;
export const sampleSyslogs: SyslogEntry[] = data.syslogs;
export const initialIntegrations: Integration[] = data.integrations;

// Alias Exports matching app imports
export const MOCK_HYPERVISORS = initialHypervisors;
export const MOCK_VMS = initialVMs;
export const MOCK_TOPOLOGY_NODES = initialTopologyNodes;
export const MOCK_TOPOLOGY_EDGES = initialTopologyEdges;
export const MOCK_ALERTS = initialRecentAlerts;
export const MOCK_INCIDENT_01 = sampleIncident;
export const MOCK_DIAGNOSIS_01 = sampleDiagnosis;
export const MOCK_RECOMMENDATIONS = initialRecommendations;
export const MOCK_APPROVALS = initialApprovals;
export const MOCK_AUDIT_LOGS = initialAuditLogs;
export const MOCK_CHAT_SESSIONS = initialChatSessions;
export const MOCK_CHAT_MESSAGES = initialChatMessages;
export const MOCK_SYSLOGS = sampleSyslogs;
export const MOCK_INTEGRATIONS = initialIntegrations;
