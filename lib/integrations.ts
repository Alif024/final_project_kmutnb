/**
 * ข้อมูลประกอบของ "ประเภทการเชื่อมต่อ" (Integration Types)
 *
 * ใช้ร่วมกันระหว่าง Add Integration Wizard (`components/AddIntegrationModal.tsx`)
 * และการ์ดรายการเชื่อมต่อในหน้า Settings (`components/views/SettingsView.tsx`)
 * เพื่อให้ไอคอน สี ฟิลด์ที่ต้องกรอก และปุ่มของแต่ละประเภทตรงกันทั้งสองที่
 */
import { IntegrationDetail, IntegrationType } from '@/types/ai-noc';

export type IntegrationAccent = 'blue' | 'orange' | 'purple' | 'emerald';

export interface IntegrationTypeMeta {
  type: IntegrationType;
  /** ชื่อเริ่มต้นที่เติมให้ในขั้นตอนกรอกข้อมูล */
  defaultName: string;
  /** ชื่อประเภทแบบสั้นสำหรับปุ่มเลือกในวิซาร์ด */
  label: string;
  /** ตัวอักษรย่อในไอคอนสี่เหลี่ยมของการ์ด เช่น vC, PVE */
  badge: string;
  description: string;
  accent: IntegrationAccent;
  /** ป้ายกำกับและ placeholder ของช่องปลายทาง (IP / URL) */
  targetLabel: string;
  targetPlaceholder: string;
  defaultPort?: string;
  /** ต้องกรอก Username/Password หรือไม่ (Webhook ใช้ Token แทน) */
  needsCredentials: boolean;
  /** ปลายทางเป็น URL (Webhook) แทนที่จะเป็น IP/FQDN */
  targetIsUrl: boolean;
  /** การ์ดของประเภทนี้มีปุ่ม Sync Now หรือไม่ */
  supportsSync: boolean;
  /** ข้อความบนปุ่มทดสอบของการ์ด */
  testLabel: string;
  /** ป้ายสถานะเมื่อเชื่อมต่อสำเร็จ */
  connectedLabel: string;
}

export const INTEGRATION_TYPES: IntegrationTypeMeta[] = [
  {
    type: 'vmware-vcenter',
    defaultName: 'VMware vCenter Server',
    label: 'VMware vCenter',
    badge: 'vC',
    description: 'ดึงข้อมูล ESXi Hosts, VM และเมตริก vSphere ผ่าน REST API',
    accent: 'blue',
    targetLabel: 'IP Address / FQDN ของ vCenter',
    targetPlaceholder: '10.0.0.101',
    defaultPort: '443',
    needsCredentials: true,
    targetIsUrl: false,
    supportsSync: true,
    testLabel: 'Test Connection',
    connectedLabel: 'Connected',
  },
  {
    type: 'proxmox-ve',
    defaultName: 'Proxmox VE Cluster',
    label: 'Proxmox VE',
    badge: 'PVE',
    description: 'ดึงข้อมูล Node, VM/LXC และสถานะคลัสเตอร์ผ่าน Proxmox API',
    accent: 'orange',
    targetLabel: 'IP Address / FQDN ของ Proxmox Node',
    targetPlaceholder: '10.0.0.121',
    defaultPort: '8006',
    needsCredentials: true,
    targetIsUrl: false,
    supportsSync: true,
    testLabel: 'Test Connection',
    connectedLabel: 'Connected',
  },
  {
    type: 'syslog-metric',
    defaultName: 'Syslog & Metric Server',
    label: 'Syslog / Metric',
    badge: 'LOG',
    description: 'รับ Syslog และเมตริกจาก Syslogd, Prometheus หรือ SNMP Collector',
    accent: 'purple',
    targetLabel: 'IP Address ของ Log/Metric Server',
    targetPlaceholder: '10.0.0.201',
    defaultPort: '514',
    needsCredentials: false,
    targetIsUrl: false,
    supportsSync: false,
    testLabel: 'Test Connection',
    connectedLabel: 'NTP Synced',
  },
  {
    type: 'webhook-notify',
    defaultName: 'Webhook Notification Gateway',
    label: 'LINE / Webhook',
    badge: 'NOTI',
    description: 'ส่งการแจ้งเตือนออกไปยัง LINE Notify หรือ Webhook ปลายทางอื่น',
    accent: 'emerald',
    targetLabel: 'Webhook URL ปลายทาง',
    targetPlaceholder: 'https://notify-api.line.me/api/notify',
    needsCredentials: false,
    targetIsUrl: true,
    supportsSync: false,
    testLabel: 'Send Test Alert',
    connectedLabel: 'Active',
  },
];

// เขียนคลาสเต็มไว้ตรงๆ เพราะ Tailwind สแกนหาชื่อคลาสจากสตริงในซอร์ส
// (ถ้าประกอบชื่อคลาสด้วยตัวแปร เช่น `bg-${accent}-500/20` จะไม่ถูก generate)
export const ACCENT_CLASSES: Record<IntegrationAccent, { icon: string; ring: string }> = {
  blue: {
    icon: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
    ring: 'border-blue-500 bg-blue-500/10',
  },
  orange: {
    icon: 'bg-orange-500/20 text-orange-500 dark:text-orange-400 border-orange-500/30',
    ring: 'border-orange-500 bg-orange-500/10',
  },
  purple: {
    icon: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30',
    ring: 'border-purple-500 bg-purple-500/10',
  },
  emerald: {
    icon: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    ring: 'border-emerald-500 bg-emerald-500/10',
  },
};

const FALLBACK_META = INTEGRATION_TYPES[0];

export function getIntegrationMeta(type: IntegrationType): IntegrationTypeMeta {
  return INTEGRATION_TYPES.find((t) => t.type === type) ?? FALLBACK_META;
}

/**
 * สร้างบรรทัด log ของการทดสอบการเชื่อมต่อ (จำลอง) ตามประเภทของปลายทาง
 * ใช้ทั้งจากวิซาร์ด (ค่าที่ผู้ใช้เพิ่งกรอก) และจากการ์ดในหน้า Settings (ค่าที่บันทึกไว้แล้ว)
 */
export function buildConnectionTestSteps(params: {
  type: IntegrationType;
  target: string;
  port?: string;
  username?: string;
  protocol?: string;
}): string[] {
  const { type, target, port, username, protocol } = params;

  switch (type) {
    case 'webhook-notify':
      return [
        `POST ${target} — กำลังส่งข้อความทดสอบ...`,
        'ตรวจสอบ Access Token: ผ่าน',
        'ปลายทางตอบกลับ: 200 OK',
      ];
    case 'syslog-metric':
      return [
        `เปิด Listener ${protocol ?? 'UDP'}/${port ?? '514'} ไปยัง ${target}...`,
        'ตรวจสอบการซิงก์เวลา (NTP): ตรงกัน',
        'รับ Syslog ทดสอบสำเร็จ',
      ];
    default:
      return [
        `เชื่อมต่อ ${target}${port ? `:${port}` : ''} ...`,
        `ยืนยันตัวตนด้วยบัญชี ${username?.trim() || 'ที่บันทึกไว้'}: ผ่าน`,
        'เรียก API รายการทรัพยากร: 200 OK',
      ];
  }
}

export const DETAIL_TONE_CLASSES: Record<NonNullable<IntegrationDetail['tone']>, string> = {
  default: 'text-slate-600 dark:text-slate-300',
  positive: 'text-emerald-600 dark:text-emerald-400 font-semibold',
  warning: 'text-amber-600 dark:text-amber-400 font-bold',
  strong: 'text-slate-900 dark:text-white font-semibold',
};
