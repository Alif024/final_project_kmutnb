/**
 * ชั้นเชื่อมต่อระบบค้นพบอุปกรณ์ (Device Discovery Adapter)
 *
 * รวมรายชื่ออุปกรณ์ที่ "ตรวจพบจริง" จาก 3 ต้นทาง แล้วแปลงให้เป็นรูปแบบเดียวกัน
 * (`DiscoveredDevice`) เพื่อให้หน้า Infrastructure แสดงเป็นคลังอุปกรณ์ที่ผู้ใช้
 * ลากลงผัง Topology เองได้
 *
 *   1. Zabbix (JSON-RPC)      — อุปกรณ์เครือข่ายผ่าน SNMP และ Linux VM ที่ลง Zabbix Agent
 *   2. VMware vCenter (REST)  — Host/VM จาก Service ที่ Hypervisor Type 1 เตรียมมาให้
 *   3. Proxmox VE (REST)      — Node/VM จาก API ของคลัสเตอร์
 *
 * ⚠️ โมดูลนี้ใช้ได้เฉพาะฝั่ง Server (อ่าน Credential จาก Environment Variable)
 *    ห้าม import เข้า Client Component — ให้เรียกผ่าน `GET /api/discovery` แทน
 *
 * พฤติกรรมเมื่อยังไม่ได้ตั้งค่า:
 *    ต้นทางใดไม่ได้ตั้งค่า env หรือเรียกไม่สำเร็จ จะ fallback เป็นข้อมูลจำลอง
 *    ของต้นทางนั้นโดยอัตโนมัติ และรายงานกลับใน `sources[].live = false`
 *    (รูปแบบเดียวกับ `/api/ai/chat` ที่ยังตอบได้แม้ไม่มี GEMINI_API_KEY)
 */
import {
  DiscoveredDevice,
  DiscoveredDeviceKind,
  DiscoveredNeighbor,
  DiscoveryResult,
  DiscoverySourceId,
  DiscoverySourceStatus,
  HealthStatus,
  NeighborProtocol,
} from '@/types/ai-noc';
import {
  MOCK_HYPERVISORS,
  MOCK_LLDP_NEIGHBORS,
  MOCK_NETWORK_DEVICES,
  MOCK_VMS,
} from './mock-data';

/** เวลารอสูงสุดต่อหนึ่งคำขอไปยังระบบต้นทาง */
const REQUEST_TIMEOUT_MS = 8000;

const SOURCE_LABELS: Record<DiscoverySourceId, string> = {
  zabbix: 'Zabbix (SNMP / Agent)',
  'vmware-vcenter': 'VMware vCenter',
  'proxmox-ve': 'Proxmox VE',
};

/**
 * ห้องแล็บมักใช้ใบรับรองแบบ Self-signed ทำให้ fetch ปฏิเสธการเชื่อมต่อ
 * ตั้ง `DISCOVERY_ALLOW_INSECURE_TLS=true` เพื่อข้ามการตรวจใบรับรอง
 *
 * ⚠️ ปิดการตรวจใบรับรองทั้งโปรเซส ใช้ได้เฉพาะเครื่องทดสอบภายในเท่านั้น
 *    ห้ามเปิดบนเครื่องที่ให้บริการจริง
 */
function applyTlsPolicy(): void {
  if (process.env.DISCOVERY_ALLOW_INSECURE_TLS === 'true') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
}

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
}

/** ตัด / ท้าย URL ออก เพื่อให้ต่อ path ได้โดยไม่เกิด // ซ้อน */
function trimUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

/** เดาชนิดอุปกรณ์จากชื่อ ใช้กับอุปกรณ์ SNMP ที่ไม่ได้ระบุชนิดมาให้ */
function guessKindFromName(name: string): DiscoveredDeviceKind {
  const n = name.toLowerCase();
  if (n.includes('firewall') || n.includes('fw') || n.includes('pfsense')) return 'firewall';
  if (n.includes('switch') || n.includes('sw-')) return 'switch';
  if (n.includes('router') || n.includes('rtr') || n.includes('gateway')) return 'router';
  if (n.includes('nas') || n.includes('storage') || n.includes('datastore')) return 'storage';
  return 'unknown';
}

/* ──────────────────────────────────────────────────────────────────────────
   1. Zabbix — JSON-RPC API
   ────────────────────────────────────────────────────────────────────────── */

/**
 * เรียก Zabbix JSON-RPC (`<url>/api_jsonrpc.php`)
 *
 * ใช้การยืนยันตัวตนแบบ `Authorization: Bearer <token>` ซึ่งรองรับตั้งแต่
 * Zabbix 6.4 ขึ้นไป (เวอร์ชันเก่ากว่านั้นต้องส่ง token ในฟิลด์ `auth` ของ body แทน)
 * สร้าง Token ได้ที่ Users → API tokens
 */
async function zabbixRpc<T>(url: string, token: string, method: string, params: unknown): Promise<T> {
  const res = await fetch(`${trimUrl(url)}/api_jsonrpc.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json-rpc',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
    signal: timeoutSignal(),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Zabbix HTTP ${res.status} ${res.statusText}`);
  }

  const payload = (await res.json()) as { result?: T; error?: { message: string; data?: string } };
  if (payload.error) {
    throw new Error(`Zabbix API: ${payload.error.message} ${payload.error.data ?? ''}`.trim());
  }
  if (payload.result === undefined) {
    throw new Error('Zabbix API ตอบกลับโดยไม่มีฟิลด์ result');
  }
  return payload.result;
}

/** ชนิด Interface ของ Zabbix: 1=Agent, 2=SNMP, 3=IPMI, 4=JMX */
interface ZabbixInterface {
  interfaceid: string;
  ip: string;
  dns: string;
  type: string;
  main: string;
  available: string;
}

interface ZabbixHost {
  hostid: string;
  host: string;
  name: string;
  status: string;
  interfaces?: ZabbixInterface[];
  inventory?: { os?: string; type?: string; vendor?: string } | [];
}

/** Interface ที่ Zabbix ใช้เฝ้าระวังจริง (main = 1) ถ้าไม่มีให้ใช้ตัวแรก */
function primaryInterface(host: ZabbixHost): ZabbixInterface | undefined {
  const list = host.interfaces ?? [];
  return list.find((i) => i.main === '1') ?? list[0];
}

/** available: 0=ยังไม่ทราบ, 1=ติดต่อได้, 2=ติดต่อไม่ได้ */
function zabbixStatus(host: ZabbixHost, iface?: ZabbixInterface): HealthStatus {
  if (host.status === '1') return 'unknown'; // ถูกปิดการเฝ้าระวังไว้
  switch (iface?.available) {
    case '1':
      return 'healthy';
    case '2':
      return 'critical';
    default:
      return 'unknown';
  }
}

/**
 * ผลของการค้นหาจาก Zabbix — คืนเพื่อนบ้านมาด้วย เพราะต้องใช้ hostid ชุดเดียวกัน
 * ในการค้น Item ของ LLDP/CDP ต่อ
 */
interface ZabbixDiscovery {
  devices: DiscoveredDevice[];
  neighbors: DiscoveredNeighbor[];
}

async function fetchZabbixDevices(): Promise<ZabbixDiscovery> {
  const url = process.env.ZABBIX_URL;
  const token = process.env.ZABBIX_TOKEN;
  if (!url || !token) throw new Error('ยังไม่ได้ตั้งค่า ZABBIX_URL / ZABBIX_TOKEN');

  const hosts = await zabbixRpc<ZabbixHost[]>(url, token, 'host.get', {
    output: ['hostid', 'host', 'name', 'status'],
    selectInterfaces: ['interfaceid', 'ip', 'dns', 'type', 'main', 'available'],
    selectInventory: ['os', 'type', 'vendor'],
    // เอาเฉพาะโฮสต์ที่ยังเฝ้าระวังอยู่ (0 = monitored)
    filter: { status: '0' },
  });

  const devices: DiscoveredDevice[] = hosts.map((host) => {
    const iface = primaryInterface(host);
    const isSnmp = iface?.type === '2';
    const inventory = Array.isArray(host.inventory) ? undefined : host.inventory;

    return {
      id: `zabbix:${host.hostid}`,
      nativeId: host.hostid,
      name: host.name || host.host,
      ipAddress: iface?.ip || iface?.dns || '',
      source: 'zabbix' as const,
      method: isSnmp ? ('snmp' as const) : ('zabbix-agent' as const),
      // อุปกรณ์ SNMP มักเป็นอุปกรณ์เครือข่าย ส่วน Agent มักติดตั้งบน VM
      kind: isSnmp ? guessKindFromName(host.name || host.host) : ('vm' as const),
      status: zabbixStatus(host, iface),
      osOrVendor: inventory?.os || inventory?.type || inventory?.vendor || undefined,
      lastSeen: undefined,
    };
  });

  // เพื่อนบ้านอ่านไม่ได้ไม่ควรทำให้รายชื่ออุปกรณ์ทั้งชุดล้มไปด้วย
  const hostIdToDeviceId = new Map(hosts.map((h) => [h.hostid, `zabbix:${h.hostid}`]));
  const neighbors = await fetchZabbixNeighbors(url, token, hostIdToDeviceId).catch((e) => {
    console.warn('อ่านเพื่อนบ้าน LLDP/CDP จาก Zabbix ไม่สำเร็จ:', errorMessage(e));
    return [] as DiscoveredNeighbor[];
  });

  return { devices, neighbors };
}

/* ──────────────────────────────────────────────────────────────────────────
   2. VMware vCenter — REST API (vSphere 7.0 ขึ้นไป)
   ────────────────────────────────────────────────────────────────────────── */

/**
 * ขอ Session Token จาก vCenter ด้วย Basic Auth
 * (เวอร์ชันก่อน 7.0 ใช้ path `/rest/com/vmware/cis/session` แทน)
 */
async function vcenterLogin(url: string, username: string, password: string): Promise<string> {
  const res = await fetch(`${trimUrl(url)}/api/session`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    },
    signal: timeoutSignal(),
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`vCenter login ล้มเหลว: HTTP ${res.status}`);
  // ตอบกลับเป็นสตริง token ที่ถูกครอบด้วยเครื่องหมายคำพูดใน JSON
  return (await res.json()) as string;
}

async function vcenterGet<T>(url: string, session: string, path: string): Promise<T> {
  const res = await fetch(`${trimUrl(url)}${path}`, {
    headers: { 'vmware-api-session-id': session },
    signal: timeoutSignal(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`vCenter ${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

interface VCenterHost {
  host: string;
  name: string;
  connection_state: string; // CONNECTED | DISCONNECTED | NOT_RESPONDING
  power_state: string;
}

interface VCenterVm {
  vm: string;
  name: string;
  power_state: string; // POWERED_ON | POWERED_OFF | SUSPENDED
}

async function fetchVCenterDevices(): Promise<DiscoveredDevice[]> {
  const url = process.env.VCENTER_URL;
  const username = process.env.VCENTER_USERNAME;
  const password = process.env.VCENTER_PASSWORD;
  if (!url || !username || !password) {
    throw new Error('ยังไม่ได้ตั้งค่า VCENTER_URL / VCENTER_USERNAME / VCENTER_PASSWORD');
  }

  const session = await vcenterLogin(url, username, password);
  const [hosts, vms] = await Promise.all([
    vcenterGet<VCenterHost[]>(url, session, '/api/vcenter/host'),
    vcenterGet<VCenterVm[]>(url, session, '/api/vcenter/vm'),
  ]);

  const hostDevices: DiscoveredDevice[] = hosts.map((h) => ({
    id: `vmware-vcenter:${h.host}`,
    nativeId: h.host,
    name: h.name,
    // vCenter คืนเฉพาะชื่อที่ใช้ตอนเพิ่มโฮสต์ ซึ่งอาจเป็น FQDN หรือ IP ก็ได้
    ipAddress: /^\d+\.\d+\.\d+\.\d+$/.test(h.name) ? h.name : '',
    source: 'vmware-vcenter',
    method: 'hypervisor-api',
    kind: 'hypervisor',
    status: h.connection_state === 'CONNECTED' ? 'healthy' : 'critical',
    osOrVendor: 'VMware ESXi',
  }));

  const vmDevices: DiscoveredDevice[] = vms.map((v) => ({
    id: `vmware-vcenter:${v.vm}`,
    nativeId: v.vm,
    name: v.name,
    // IP ของ Guest ต้องเรียก /api/vcenter/vm/{vm}/guest/identity เพิ่มรายตัว
    // (ต้องมี VMware Tools) จึงเว้นว่างไว้เพื่อไม่ให้ยิงคำขอจำนวนมากต่อรอบ
    ipAddress: '',
    source: 'vmware-vcenter',
    method: 'hypervisor-api',
    kind: 'vm',
    status: v.power_state === 'POWERED_ON' ? 'healthy' : 'unknown',
  }));

  return [...hostDevices, ...vmDevices];
}

/* ──────────────────────────────────────────────────────────────────────────
   3. Proxmox VE — REST API
   ────────────────────────────────────────────────────────────────────────── */

/**
 * ใช้ API Token แทนการ Login ด้วยรหัสผ่าน
 * รูปแบบ Header: `PVEAPIToken=<user>@<realm>!<tokenid>=<secret>`
 * สร้างได้ที่ Datacenter → Permissions → API Tokens
 */
async function proxmoxGet<T>(url: string, tokenHeader: string, path: string): Promise<T> {
  const res = await fetch(`${trimUrl(url)}${path}`, {
    headers: { Authorization: `PVEAPIToken=${tokenHeader}` },
    signal: timeoutSignal(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Proxmox ${path}: HTTP ${res.status}`);
  const payload = (await res.json()) as { data: T };
  return payload.data;
}

interface ProxmoxNode {
  node: string;
  status: string; // online | offline
}

interface ProxmoxResource {
  vmid: number;
  name?: string;
  node: string;
  status: string; // running | stopped
  type: string; // qemu | lxc
}

async function fetchProxmoxDevices(): Promise<DiscoveredDevice[]> {
  const url = process.env.PROXMOX_URL;
  const token = process.env.PROXMOX_TOKEN;
  if (!url || !token) throw new Error('ยังไม่ได้ตั้งค่า PROXMOX_URL / PROXMOX_TOKEN');

  const [nodes, resources] = await Promise.all([
    proxmoxGet<ProxmoxNode[]>(url, token, '/api2/json/nodes'),
    proxmoxGet<ProxmoxResource[]>(url, token, '/api2/json/cluster/resources?type=vm'),
  ]);

  const nodeDevices: DiscoveredDevice[] = nodes.map((n) => ({
    id: `proxmox-ve:node-${n.node}`,
    nativeId: n.node,
    name: n.node,
    // Proxmox ไม่ได้คืน IP ของ Node มากับรายการนี้
    ipAddress: '',
    source: 'proxmox-ve',
    method: 'hypervisor-api',
    kind: 'hypervisor',
    status: n.status === 'online' ? 'healthy' : 'critical',
    osOrVendor: 'Proxmox VE',
  }));

  const vmDevices: DiscoveredDevice[] = resources.map((r) => ({
    id: `proxmox-ve:${r.type}-${r.vmid}`,
    nativeId: String(r.vmid),
    name: r.name || `${r.type}-${r.vmid}`,
    // ต้องเรียก /nodes/{node}/qemu/{vmid}/agent/network-get-interfaces เพิ่ม
    // ซึ่งต้องมี QEMU Guest Agent จึงเว้นว่างไว้
    ipAddress: '',
    source: 'proxmox-ve',
    method: 'hypervisor-api',
    kind: 'vm',
    status: r.status === 'running' ? 'healthy' : 'unknown',
    parentName: r.node,
    osOrVendor: r.type === 'lxc' ? 'LXC Container' : 'QEMU/KVM',
  }));

  return [...nodeDevices, ...vmDevices];
}

/* ──────────────────────────────────────────────────────────────────────────
   เพื่อนบ้าน LLDP / CDP — "พอร์ตนี้ปลายสายคือใคร"
   ────────────────────────────────────────────────────────────────────────── */

/**
 * ดึงตารางเพื่อนบ้านที่อุปกรณ์ประกาศผ่าน LLDP/CDP ออกมาจาก Zabbix
 *
 * ค่าต้นทางจริงคือ SNMP walk ที่ Zabbix ทำไว้ให้แล้ว:
 *   LLDP-MIB      lldpRemSysName   1.0.8802.1.1.2.1.4.1.1.9
 *                 lldpRemPortId    1.0.8802.1.1.2.1.4.1.1.7
 *                 lldpRemManAddr   1.0.8802.1.1.2.1.5.1.4
 *   CISCO-CDP-MIB cdpCacheDeviceId    1.3.6.1.4.1.9.9.23.1.2.1.1.6
 *                 cdpCacheDevicePort  1.3.6.1.4.1.9.9.23.1.2.1.1.7
 *                 cdpCacheAddress     1.3.6.1.4.1.9.9.23.1.2.1.1.4
 *
 * ⚠️ Zabbix เก็บค่าพวกนี้เป็น Item ที่เกิดจาก Low-level Discovery ซึ่ง
 *    **ชื่อคีย์ขึ้นกับ Template ที่ใช้** ไม่มีมาตรฐานกลาง โค้ดนี้จึงจับคู่แบบยืดหยุ่น
 *    และเปิดให้ตั้งคำนำหน้าคีย์เองผ่าน ZABBIX_NEIGHBOR_KEYS (คั่นด้วยจุลภาค)
 *    ถ้าต่อเครื่องจริงแล้วไม่พบข้อมูล ให้ดูชื่อคีย์จริงใน Zabbix แล้วตั้งค่านี้ให้ตรง
 *
 * Zabbix 5.4 ขึ้นไปไม่คืน lastvalue จาก item.get แล้ว จึงต้องอ่านค่าล่าสุด
 * ผ่าน history.get อีกทอด (ค่าเป็นข้อความ จึงใช้ history 4 = text และ 1 = str)
 */
interface ZabbixItem {
  itemid: string;
  hostid: string;
  key_: string;
}

interface ZabbixHistory {
  itemid: string;
  value: string;
  clock: string;
}

/** ดึงเลขดัชนีในวงเล็บเหลี่ยมของคีย์ เช่น lldp.rem.sysname[Gi0/1] -> "Gi0/1" */
function keyIndex(key: string): string | null {
  const m = key.match(/\[(.+)\]\s*$/);
  return m ? m[1] : null;
}

/** ส่วนของคีย์ก่อนวงเล็บ แปลงเป็นตัวพิมพ์เล็กเพื่อเทียบแบบหลวม ๆ */
function keyStem(key: string): string {
  return key.split('[')[0].toLowerCase();
}

async function fetchZabbixNeighbors(
  url: string,
  token: string,
  hostIdToDeviceId: Map<string, string>
): Promise<DiscoveredNeighbor[]> {
  const prefixes = (process.env.ZABBIX_NEIGHBOR_KEYS ?? 'lldp,cdp')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  // ค้นทีละคำนำหน้า เพราะ item.get รับ search ได้ชุดเดียวต่อครั้ง
  const itemGroups = await Promise.all(
    prefixes.map((prefix) =>
      zabbixRpc<ZabbixItem[]>(url, token, 'item.get', {
        output: ['itemid', 'hostid', 'key_'],
        hostids: [...hostIdToDeviceId.keys()],
        search: { key_: prefix },
        startSearch: true,
      })
    )
  );
  const items = itemGroups.flat();
  if (items.length === 0) return [];

  const history = await zabbixRpc<ZabbixHistory[]>(url, token, 'history.get', {
    output: 'extend',
    itemids: items.map((i) => i.itemid),
    // 4 = text, 1 = character — ค่าของ LLDP/CDP เป็นข้อความเสมอ
    history: 4,
    sortfield: 'clock',
    sortorder: 'DESC',
    limit: items.length * 4,
  }).catch(() => [] as ZabbixHistory[]);

  const latest = new Map<string, string>();
  for (const h of history) {
    if (!latest.has(h.itemid)) latest.set(h.itemid, h.value);
  }

  /** รวม Item ที่มาจากพอร์ตเดียวกัน (ดัชนีในวงเล็บตรงกัน) ให้เป็นเพื่อนบ้านหนึ่งรายการ */
  const grouped = new Map<
    string,
    { hostid: string; index: string; protocol: NeighborProtocol; fields: Map<string, string> }
  >();

  for (const item of items) {
    const index = keyIndex(item.key_);
    if (!index) continue;
    const value = latest.get(item.itemid);
    if (!value) continue;

    const stem = keyStem(item.key_);
    const protocol: NeighborProtocol = stem.includes('cdp') ? 'cdp' : 'lldp';
    const groupKey = `${item.hostid}|${protocol}|${index}`;
    const group =
      grouped.get(groupKey) ??
      { hostid: item.hostid, index, protocol, fields: new Map<string, string>() };
    group.fields.set(stem, value);
    grouped.set(groupKey, group);
  }

  const neighbors: DiscoveredNeighbor[] = [];
  for (const group of grouped.values()) {
    const localDeviceId = hostIdToDeviceId.get(group.hostid);
    if (!localDeviceId) continue;

    const pick = (...needles: string[]) => {
      for (const [stem, value] of group.fields) {
        if (needles.some((n) => stem.includes(n))) return value;
      }
      return undefined;
    };

    // ชื่อปลายทาง: LLDP ใช้ sysname, CDP ใช้ deviceid
    const remoteSysName = pick('sysname', 'deviceid', 'remotename');
    if (!remoteSysName) continue;

    neighbors.push({
      localDeviceId,
      // บาง Template เก็บชื่อพอร์ตฝั่งเราไว้เป็น Item ต่างหาก ถ้าไม่มีก็ใช้ดัชนีในคีย์
      localInterface: pick('locport', 'localport', 'ifname', 'localif') ?? group.index,
      protocol: group.protocol,
      remoteSysName,
      remotePortId: pick('portid', 'deviceport', 'remoteport'),
      remoteMgmtIp: pick('manaddr', 'mgmtaddr', 'cacheaddress', 'address'),
    });
  }

  return neighbors;
}

/* ──────────────────────────────────────────────────────────────────────────
   ข้อมูลจำลอง — ใช้เมื่อยังไม่ได้ตั้งค่าต้นทางจริง
   ────────────────────────────────────────────────────────────────────────── */

/** เพื่อนบ้านจำลอง — อ้าง id อุปกรณ์ให้ตรงกับที่ mockSnmpDevices สร้างไว้ */
function mockNeighbors(): DiscoveredNeighbor[] {
  return MOCK_LLDP_NEIGHBORS.map((n) => ({
    ...n,
    localDeviceId: `zabbix:${n.localDeviceId}`,
    remoteMgmtIp: n.remoteMgmtIp || undefined,
  }));
}

/** อุปกรณ์เครือข่ายที่ Zabbix ค้นพบผ่าน SNMP */
function mockSnmpDevices(): DiscoveredDevice[] {
  return MOCK_NETWORK_DEVICES.map((d) => ({
    id: `zabbix:${d.id}`,
    nativeId: d.id,
    name: d.name,
    ipAddress: d.ipAddress,
    source: 'zabbix',
    method: 'snmp',
    kind: d.type === 'load-balancer' ? 'unknown' : d.type,
    status: d.status,
    osOrVendor: d.isVirtual ? 'Virtual Appliance' : 'Physical Network Device',
    lastSeen: d.lastSeen,
    tags: [`SNMP ${d.interfaces.length} interfaces`],
  }));
}

/** Linux VM ที่ติดตั้ง Zabbix Agent ไว้ */
function mockAgentDevices(): DiscoveredDevice[] {
  return MOCK_VMS.map((vm) => ({
    id: `zabbix:${vm.id}`,
    nativeId: vm.id,
    name: vm.name,
    ipAddress: vm.ipAddress,
    source: 'zabbix',
    method: 'zabbix-agent',
    kind: guessKindFromName(vm.name) === 'unknown' ? 'vm' : guessKindFromName(vm.name),
    status: vm.health,
    osOrVendor: vm.vendorModel,
    parentName: MOCK_HYPERVISORS.find((h) => h.id === vm.hypervisorId)?.name,
    lastSeen: vm.lastSeen,
    tags: vm.role ? [vm.role] : undefined,
  }));
}

/** Host/Node ที่ได้จาก Service ของ Hypervisor Type 1 */
function mockHypervisorDevices(source: DiscoverySourceId): DiscoveredDevice[] {
  const wantedType = source === 'vmware-vcenter' ? 'vmware-esxi' : 'proxmox-ve';
  return MOCK_HYPERVISORS.filter((h) => h.type === wantedType).map((h) => ({
    id: `${source}:${h.id}`,
    nativeId: h.id,
    name: h.name,
    ipAddress: h.ipAddress,
    source,
    method: 'hypervisor-api',
    kind: 'hypervisor',
    status: h.status,
    osOrVendor: h.version,
    tags: [`${h.vmCount} VMs`],
  }));
}

function mockDevicesFor(source: DiscoverySourceId): DiscoveredDevice[] {
  if (source === 'zabbix') return [...mockSnmpDevices(), ...mockAgentDevices()];
  return mockHypervisorDevices(source);
}

/* ──────────────────────────────────────────────────────────────────────────
   จุดเรียกใช้หลัก
   ────────────────────────────────────────────────────────────────────────── */

/**
 * ดึงรายชื่ออุปกรณ์จากทุกต้นทาง
 *
 * แต่ละต้นทางทำงานแยกกัน — ถ้าต้นทางหนึ่งล่มหรือยังไม่ได้ตั้งค่า อีกสองต้นทาง
 * ยังคืนผลตามปกติ และต้นทางที่พลาดจะถูกแทนด้วยข้อมูลจำลองพร้อมแจ้งสาเหตุกลับไป
 * ให้หน้าจอแสดงว่าอุปกรณ์ชุดนั้นยังไม่ใช่ของจริง
 */
export async function discoverDevices(): Promise<DiscoveryResult> {
  applyTlsPolicy();

  const fetchers: Record<DiscoverySourceId, () => Promise<ZabbixDiscovery>> = {
    // มีเพียง Zabbix ที่ให้ข้อมูลเพื่อนบ้าน — อีกสองต้นทางคืนรายการว่าง
    zabbix: fetchZabbixDevices,
    'vmware-vcenter': async () => ({ devices: await fetchVCenterDevices(), neighbors: [] }),
    'proxmox-ve': async () => ({ devices: await fetchProxmoxDevices(), neighbors: [] }),
  };

  const sourceIds = Object.keys(fetchers) as DiscoverySourceId[];

  const results = await Promise.all(
    sourceIds.map(async (id) => {
      try {
        const { devices, neighbors } = await fetchers[id]();
        return { id, devices, neighbors, live: true as const, error: undefined };
      } catch (e) {
        // ยังไม่ได้ตั้งค่า หรือเรียกไม่สำเร็จ → ใช้ข้อมูลจำลองของต้นทางนี้แทน
        return {
          id,
          devices: mockDevicesFor(id),
          neighbors: id === 'zabbix' ? mockNeighbors() : [],
          live: false as const,
          error: errorMessage(e),
        };
      }
    })
  );

  const devices = results.flatMap((r) => r.devices);
  const sources: DiscoverySourceStatus[] = results.map((r) => ({
    id: r.id,
    label: SOURCE_LABELS[r.id],
    live: r.live,
    deviceCount: r.devices.length,
    error: r.error,
  }));

  return {
    devices: devices.sort((a, b) => a.name.localeCompare(b.name)),
    neighbors: results.flatMap((r) => r.neighbors),
    sources,
    fetchedAt: new Date().toISOString(),
  };
}
