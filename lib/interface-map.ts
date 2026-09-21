/**
 * สรุปว่า "พอร์ตไหนของอุปกรณ์ต่อกับเครื่องอะไร" สำหรับแสดงตอนชี้เมาส์ที่กล่องบนผัง
 *
 * ข้อมูลมาจากที่อุปกรณ์ประกาศตัวเองผ่าน LLDP/CDP เท่านั้น ระบบไม่เปิดให้กรอกเอง
 * เพราะคู่พอร์ตที่คนกรอกไว้จะไม่อัปเดตตามเมื่อมีการย้ายสายจริง
 *
 * ตั้งใจไม่รวมสถานะ up/down ของพอร์ตไว้ที่นี่ — ผังมีสีเส้นบอกสถานะอยู่แล้ว
 * (ดู `lib/link-verification.ts`) tooltip นี้ตอบคำถามเดียวคือปลายสายคือใคร
 */
import { DiscoveredDevice, DiscoveredNeighbor } from '@/types/ai-noc';

export interface InterfacePeer {
  /** พอร์ตของอุปกรณ์ตัวนี้ เช่น "Gi0/1" */
  port: string;
  /** ชื่ออุปกรณ์ปลายสาย */
  peerName: string;
  /** พอร์ตของปลายทาง ถ้ารู้ */
  peerPort?: string;
  /** โปรโตคอลที่ตรวจพบคู่นี้ */
  source: 'lldp' | 'cdp';
}

interface BuildContext {
  devices: DiscoveredDevice[];
  neighbors: DiscoveredNeighbor[];
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** จับชื่อ/IP ที่ปลายทางประกาศมา กลับไปหาอุปกรณ์ในระบบ (เทียบ IP ก่อนเพราะแม่นกว่า) */
function resolveNeighborName(neighbor: DiscoveredNeighbor, devices: DiscoveredDevice[]): string {
  if (neighbor.remoteMgmtIp) {
    const byIp = devices.find((d) => d.ipAddress === neighbor.remoteMgmtIp);
    if (byIp) return byIp.name;
  }
  const byName = devices.find((d) => sameName(d.name, neighbor.remoteSysName));
  return byName?.name ?? neighbor.remoteSysName;
}

/** เรียงชื่อพอร์ตแบบเข้าใจตัวเลข เพื่อให้ Gi0/2 มาก่อน Gi0/24 */
function comparePort(a: InterfacePeer, b: InterfacePeer): number {
  return a.port.localeCompare(b.port, undefined, { numeric: true });
}

/**
 * คืนรายการพอร์ตของแต่ละอุปกรณ์ ค้นด้วย `DiscoveredDevice.id`
 * อุปกรณ์ที่ไม่มีข้อมูลเลยจะไม่มีคีย์อยู่ใน Map
 */
export function buildInterfacePeers(ctx: BuildContext): Map<string, InterfacePeer[]> {
  const byDevice = new Map<string, InterfacePeer[]>();

  const add = (deviceId: string, entry: InterfacePeer) => {
    const list = byDevice.get(deviceId) ?? [];
    // พอร์ตเดียวกันประกาศซ้ำได้ทั้ง LLDP และ CDP — เก็บรายการแรกที่เจอพอ
    if (list.some((e) => sameName(e.port, entry.port))) return;
    list.push(entry);
    byDevice.set(deviceId, list);
  };

  for (const neighbor of ctx.neighbors) {
    add(neighbor.localDeviceId, {
      port: neighbor.localInterface,
      peerName: resolveNeighborName(neighbor, ctx.devices),
      peerPort: neighbor.remotePortId,
      source: neighbor.protocol,
    });
  }

  for (const list of byDevice.values()) list.sort(comparePort);
  return byDevice;
}
