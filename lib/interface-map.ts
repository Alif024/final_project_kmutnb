/**
 * สรุปว่า "พอร์ตไหนของอุปกรณ์ต่อกับเครื่องอะไร" สำหรับแสดงตอนชี้เมาส์ที่กล่องบนผัง
 *
 * รวมข้อมูลสองทางเข้าด้วยกันโดยใช้ลำดับความสำคัญเดียวกับแท็บ Interfaces:
 *   1. ค่าที่ผู้ดูแลระบบระบุเองบนเส้นเชื่อม (ชนะเสมอ เพราะเป็นการยืนยันด้วยตาคน)
 *   2. ค่าที่อุปกรณ์ประกาศเองผ่าน LLDP/CDP
 *
 * ตั้งใจไม่รวมสถานะ up/down ของพอร์ตไว้ที่นี่ — ผังมีสีเส้นบอกสถานะอยู่แล้ว
 * (ดู `lib/link-verification.ts`) tooltip นี้ตอบคำถามเดียวคือปลายสายคือใคร
 */
import { DiscoveredDevice, DiscoveredNeighbor, TopologyLayoutLink } from '@/types/ai-noc';

export interface InterfacePeer {
  /** พอร์ตของอุปกรณ์ตัวนี้ เช่น "Gi0/1" */
  port: string;
  /** ชื่ออุปกรณ์ปลายสาย */
  peerName: string;
  /** พอร์ตของปลายทาง ถ้ารู้ */
  peerPort?: string;
  /** ที่มาของข้อมูล ใช้ตัดสินว่าอันไหนทับอันไหนได้ */
  source: 'manual' | 'lldp' | 'cdp';
}

interface BuildContext {
  devices: DiscoveredDevice[];
  neighbors: DiscoveredNeighbor[];
  links: TopologyLayoutLink[];
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
  const nameOf = (deviceId: string) =>
    ctx.devices.find((d) => d.id === deviceId)?.name ?? 'อุปกรณ์ที่หายไป';

  const add = (deviceId: string, entry: InterfacePeer) => {
    const list = byDevice.get(deviceId) ?? [];
    // พอร์ตเดิมที่มีค่าจากผู้ใช้แล้ว ห้ามให้ค่าที่ตรวจพบมาทับ
    if (list.some((e) => sameName(e.port, entry.port))) return;
    list.push(entry);
    byDevice.set(deviceId, list);
  };

  // 1) ค่าที่ระบุเองบนเส้นเชื่อม
  for (const link of ctx.links) {
    if (link.sourceInterface) {
      add(link.source, {
        port: link.sourceInterface,
        peerName: nameOf(link.target),
        peerPort: link.targetInterface,
        source: 'manual',
      });
    }
    if (link.targetInterface) {
      add(link.target, {
        port: link.targetInterface,
        peerName: nameOf(link.source),
        peerPort: link.sourceInterface,
        source: 'manual',
      });
    }
  }

  // 2) ค่าที่อุปกรณ์ประกาศเองผ่าน LLDP/CDP
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
