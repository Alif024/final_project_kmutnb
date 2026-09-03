export type Severity = 'critical' | 'warning' | 'info';
export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';
export type UserRole = 'admin' | 'operator' | 'engineer' | 'viewer';

export interface Hypervisor {
  id: string;
  name: string;                 // "ESXi-Host-01"
  ipAddress: string;            // "10.0.0.101"
  type: 'vmware-esxi' | 'proxmox-ve';
  version: string;              // "7.0 U3"
  status: HealthStatus;
  cpuUsage: number;             // 0-100
  memoryUsage: number;
  storageUsage: number;
  totalVcpu: number;
  usedVcpu: number;
  totalMemoryGb: number;
  usedMemoryGb: number;
  totalStorageTb: number;
  usedStorageTb: number;
  vmCount: number;
  vmCapacity: number;           // max vms limit e.g. 32
  alertCount: number;
  uptimeSeconds: number;
  // Specific Virtualization Metrics
  cpuReadyTimePercent: number;
  memoryBallooningMb: number;
  storageLatencyMs: number;
  vswitchDroppedPackets: number;
  lastUpdate: string;           // ISO 8601
}

export interface VirtualMachine {
  id: string;
  name: string;                 // "ERP-VM"
  ipAddress: string;
  hypervisorId: string;
  status: 'running' | 'stopped' | 'suspended';
  health: HealthStatus;
  role: 'firewall' | 'router' | 'web' | 'app' | 'db' | 'ids' | 'monitoring' | 'log' | 'backup' | 'other';
  vendorModel?: string;         // "pfSense 2.7.2"
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
  ioWaitPercent: number;
  uptimeSeconds: number;
  activeAlerts: number;
  lastSeen: string;
}

export interface NetworkInterface {
  name: string;                 // "Gi0/1"
  adminStatus: 'up' | 'down';
  operStatus: 'up' | 'down';
  inOctets: number;
  outOctets: number;
  errorRate: number;
  packetLossPercent: number;
  utilizationPercent: number;
}

export interface NetworkDevice {
  id: string;
  name: string;
  ipAddress: string;
  type: 'router' | 'switch' | 'firewall' | 'load-balancer';
  isVirtual: boolean;
  status: HealthStatus;
  interfaces: NetworkInterface[];
  snmpCommunity?: string;
  lastSeen: string;
}

export interface TopologyNode {
  id: string;
  label: string;
  ipAddress: string;
  nodeType: 'internet' | 'firewall' | 'switch' | 'router' | 'vm' | 'hypervisor';
  status: HealthStatus;
  alertBadge: number;
  position: { x: number; y: number };
  role?: string;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  linkStatus: 'up' | 'down' | 'degraded';
  bandwidthMbps?: number;
}

export interface SyslogEntry {
  id: string;
  timestamp: string;            // NTP synced (HH:mm:ss)
  sourceId: string;             // ผูกกับ Hypervisor.id หรือ VirtualMachine.id
  sourceName: string;
  sourceIp?: string;
  facility: string;             // vmkernel, hostd, kernel, pfSense, suricata, graylog ...
  severityLevel: number;        // 0-7 ตาม RFC 5424
  message: string;
  parsedFields?: Record<string, string>;
  stream?: LogStreamId;         // Graylog Stream ที่ข้อความนี้ถูกจัดเข้า
  incidentId?: string;          // ผูกกับ Incident เมื่อเป็นหลักฐานของเหตุการณ์นั้น
}

// ---------------------------------------------------------------------------
// Log Explorer (Graylog-backed) — ดู lib/log-source.ts
// ---------------------------------------------------------------------------

export type LogStreamId =
  | 'stream-esxi'
  | 'stream-proxmox'
  | 'stream-network'
  | 'stream-app'
  | 'stream-security'
  | 'stream-ainoc';

/** ช่วงเวลาย้อนหลังนับจากเวลาอ้างอิงล่าสุดของ Telemetry */
export type LogTimeRange = '15m' | '1h' | '4h' | 'all';

export interface LogQuery {
  /** คำค้นแบบข้อความอิสระ ค้นใน message, sourceName และ facility */
  search: string;
  /** ระดับความรุนแรงที่เลือก (0-7) — ว่าง = ทุกระดับ */
  severities: number[];
  /** sourceId ที่เลือก — ว่าง = ทุกต้นทาง */
  sources: string[];
  /** Stream ที่เลือก — ว่าง = ทุก Stream */
  streams: LogStreamId[];
  /** ช่วงเวลาบนกราฟที่คลิกเลือกไว้ เก็บเป็นป้ายเวลาเริ่มช่วง เช่น "13:15" — ว่าง = ทุกช่วง */
  buckets: string[];
  range: LogTimeRange;
  /** จำกัดเฉพาะ Log ที่ผูกกับ Incident นี้ */
  incidentId?: string;
}

/** ตัวเลือกพร้อมจำนวนผลลัพธ์ สำหรับแถบกรองด้านข้าง */
export interface LogFacet {
  value: string;
  label: string;
  count: number;
}

export interface LogHistogramBucket {
  label: string;                // "13:15" = เวลาเริ่มของช่วง
  count: number;
  errorCount: number;           // severityLevel <= 3
  /** ผู้ใช้คลิกเลือกช่วงนี้ไว้หรือไม่ */
  selected: boolean;
}

export interface LogSearchResult {
  entries: SyslogEntry[];
  /** จำนวนทั้งหมดในคลัง (ก่อนกรอง) */
  totalCount: number;
  /** จำนวนที่ตรงเงื่อนไข */
  matchedCount: number;
  histogram: LogHistogramBucket[];
  sourceFacets: LogFacet[];
  severityFacets: LogFacet[];
  streamFacets: LogFacet[];
  /** เวลาที่ใช้ค้น (จำลอง) */
  tookMs: number;
  /** คิวรีรูปแบบ Graylog ที่เทียบเท่ากับเงื่อนไขนี้ */
  graylogQuery: string;
}

export interface MetricSample {
  timestamp: string;
  entityId: string;
  metricName: string;
  value: number;
  unit: string;
}

export interface Alert {
  id: string;
  title: string;
  entityId: string;
  entityName: string;
  severity: Severity;
  status: 'active' | 'acknowledged' | 'resolved';
  occurrenceCount: number;
  firstSeen: string;
  lastSeen: string;
  incidentId?: string;
}

export interface Incident {
  id: string;                   // "INC-2569-0524-0001"
  title: string;                // "Users cannot access ERP System"
  severity: Severity;
  status: 'open' | 'investigating' | 'resolved';
  detectedAt: string;
  startedAt: string;
  resolvedAt?: string;
  durationSeconds: number;
  affectedUsers: number;
  detectedBy: 'ai-engine' | 'manual' | 'threshold';
  rootCauseCategory: 'performance-resource' | 'network-connectivity'
                   | 'configuration-change' | 'security' | 'hardware-failure' | 'other';
}

export interface RootCauseStep {
  order: number;
  title: string;
  entityName: string;
  timestamp: string;
  severity: Severity;
  description: string;
  /** id ของ SyslogEntry ที่เป็นหลักฐานรองรับขั้นนี้ */
  logRefs?: string[];
}

export interface Evidence {
  metricName: string;
  source: string;
  value: number;
  unit: string;
  threshold: number;
  thresholdOperator: '<' | '>';
  breached: boolean;
  series: { t: string; v: number }[];
}

export interface Diagnosis {
  id: string;
  incidentId: string;
  confidence: number;           // 0-100
  rootCauseTitle: string;
  rootCauseSummary: string;
  impactLevel: 'high' | 'medium' | 'low';
  chain: RootCauseStep[];
  evidence: Evidence[];
  modelUsed: string;
  generatedAt: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  sourceType: 'ai-diagnosis' | 'ai-analysis';
  sourceRefId: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  status: 'pending-action' | 'pending-approval' | 'executed' | 'not-recommended' | 'rejected';
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  recommendationId: string;
  actionType: 'live-migration' | 'restart-service' | 'update-vm-resource'
            | 'clear-cache' | 'adjust-disk-io' | 'check-network-path';
  actionTitle: string;
  reason: string;
  parameters: Record<string, string>;
  expectedImpacts: { text: string; tone: 'positive' | 'caution' | 'negative' }[];
  estimatedTimeMinutes: number;
  confidence: number;
  commandPreview: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed' | 'scheduled';
  requiresRole: 'admin' | 'operator';
  createdAt: string;
  decidedBy?: string;
  decidedAt?: string;
  rejectReason?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userRole: UserRole;
  actionTitle: string;
  decision: 'Approved & Executed' | 'Rejected' | 'Pending';
  commandExecuted?: string;
  detailsReason?: string;
  username?: string;
  role?: UserRole;
  action?: string;
  targetEntity?: string;
  result?: 'success' | 'failed';
  ipAddress?: string;
}

export type AuditLog = AuditLogEntry;

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citedEntities?: string[];
  feedback?: 'up' | 'down';
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  lastMessage: string;
}

// ---------------------------------------------------------------------------
// Integrations (Settings → Integrations)
// ---------------------------------------------------------------------------

export type IntegrationType =
  | 'vmware-vcenter'
  | 'proxmox-ve'
  | 'syslog-metric'
  | 'webhook-notify';

export type IntegrationConnectionState = 'connected' | 'pending' | 'error';

export interface IntegrationDetail {
  label: string;                // "API Status:", "Last Sync:"
  value: string;
  tone?: 'default' | 'positive' | 'warning' | 'strong';
}

export interface Integration {
  id: string;
  type: IntegrationType;
  name: string;                 // "VMware vCenter Server"
  target: string;               // IP, URL หรือชื่อกลุ่มปลายทาง
  port?: string;
  username?: string;
  protocol?: string;         // เฉพาะ Syslog/Metric: UDP | TCP | TLS
  statusLabel: string;          // "Connected", "NTP Synced", "Active", "รอทดสอบ"
  connectionState: IntegrationConnectionState;
  details: IntegrationDetail[];
  addedAt?: string;             // เวลาที่เพิ่มผ่าน Add Integration Wizard
}
