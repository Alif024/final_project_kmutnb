/**
 * ตรวจสอบเส้นเชื่อมบนผังเทียบกับสิ่งที่อุปกรณ์ประกาศจริงผ่าน LLDP/CDP
 *
 * ผังเป็นสิ่งที่ผู้ดูแลระบบวาดเอง จึงอาจไม่ตรงกับการเดินสายจริง โมดูลนี้เอาผัง
 * มาเทียบกับตารางเพื่อนบ้านที่ตรวจพบ แล้วบอกว่าแต่ละเส้น "เชื่อถือได้แค่ไหน"
 *
 * เจตนาของสี (ใช้ร่วมกับ TopologyBuilder):
 *   เขียว  ยืนยันแล้ว  — LLDP/CDP ยืนยันว่าปลายสายคืออุปกรณ์ตัวนี้จริง
 *   แดง    พอร์ตดับ    — พอร์ตที่ผูกกับเส้นนี้มีสถานะ down อยู่
 *   เทาทึบ ต่อผิด      — ข้อมูลที่ได้ขัดแย้งกับเส้นที่วาดไว้
 *   เทาจาง ยังไม่ยืนยัน — ไม่มีข้อมูล LLDP/CDP ให้ตรวจ (ไม่ได้แปลว่าผิด)
 *
 * แยกกรณี "ยังไม่ยืนยัน" ออกจาก "ต่อผิด" เพราะอุปกรณ์ที่ไม่ได้เปิด LLDP/CDP
 * หรือ VM ที่ไม่มีข้อมูลพอร์ต จะไม่มีทางยืนยันได้เลย ถ้าเหมารวมเป็นต่อผิด
 * จะกลายเป็นกล่าวหาผังที่ถูกต้องอยู่แล้ว
 */
import {
  DiscoveredDevice,
  DiscoveredNeighbor,
  NetworkDevice,
  TopologyLayoutLink,
} from '@/types/ai-noc';

export type LinkVerdict = 'verified' | 'down' | 'mismatch' | 'unverified';

export interface LinkVerification {
  verdict: LinkVerdict;
  /** คำอธิบายสำหรับแสดงตอนชี้เมาส์ที่เส้น */
  reason: string;
  sourcePort?: string;
  targetPort?: string;
  speedMbps?: number;
  connectionStatus?: 'up' | 'down' | 'degraded' | 'unknown';
}

export const VERDICT_COLOR: Record<LinkVerdict, string> = {
  verified: '#22C55E',
  down: '#EF4444',
  mismatch: '#94A3B8',
  unverified: '#64748B',
};

export const VERDICT_LABEL: Record<LinkVerdict, string> = {
  verified: 'ยืนยันแล้ว',
  down: 'พอร์ตดับ',
  mismatch: 'ต่อผิด',
  unverified: 'ยังไม่ยืนยัน',
};

interface VerifyContext {
  devices: DiscoveredDevice[];
  neighbors: DiscoveredNeighbor[];
  networkDevices: NetworkDevice[];
}

/** เทียบชื่อแบบไม่สนตัวพิมพ์และช่องว่างหัวท้าย */
function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * เพื่อนบ้านรายนี้หมายถึงอุปกรณ์ตัวนี้หรือไม่
 * เทียบ IP ก่อนเพราะแม่นกว่า แล้วค่อยเทียบชื่อที่ประกาศมา
 */
function neighborIsDevice(neighbor: DiscoveredNeighbor, device: DiscoveredDevice): boolean {
  if (neighbor.remoteMgmtIp && device.ipAddress && neighbor.remoteMgmtIp === device.ipAddress) {
    return true;
  }
  return sameName(neighbor.remoteSysName, device.name);
}

/** ข้อมูลพอร์ตของอุปกรณ์ (มีเฉพาะอุปกรณ์ที่ค้นพบผ่าน SNMP) */
function findInterface(
  ctx: VerifyContext,
  device: DiscoveredDevice,
  portName: string
): NetworkDevice['interfaces'][number] | undefined {
  const record = ctx.networkDevices.find(
    (n) => (!!device.ipAddress && n.ipAddress === device.ipAddress) || sameName(n.name, device.name)
  );
  return record?.interfaces.find((i) => sameName(i.name, portName));
}

/** ตรวจเส้นเชื่อมหนึ่งเส้น */
export function verifyLink(link: TopologyLayoutLink, ctx: VerifyContext): LinkVerification {
  const source = ctx.devices.find((d) => d.id === link.source);
  const target = ctx.devices.find((d) => d.id === link.target);

  if (!source || !target) {
    return {
      verdict: 'unverified',
      reason: 'อุปกรณ์ปลายทางหายไปจากผลการค้นหาล่าสุด',
    };
  }

  const neighborsOf = (device: DiscoveredDevice) =>
    ctx.neighbors.filter((n) => n.localDeviceId === device.id);

  /**
   * พอร์ตที่ฝั่งนี้ใช้ต่อไปหาอีกฝั่ง
   *
   * ใช้ค่าที่เขียนไว้บนเส้นก่อน (เขียนตอนกดสร้างเส้นจากผลการตรวจจับ) ถ้าไม่มี
   * ก็หาจากตารางเพื่อนบ้านโดยตรง เพราะเส้นที่ผู้ใช้ลากเองในโหมดเชื่อมต่อจะไม่มี
   * ชื่อพอร์ตติดมา แต่ยังควรตรวจสถานะพอร์ตให้ได้
   */
  const portOf = (self: DiscoveredDevice, other: DiscoveredDevice, stored?: string) =>
    stored ?? neighborsOf(self).find((n) => neighborIsDevice(n, other))?.localInterface ??
    neighborsOf(other).find((n) => neighborIsDevice(n, self))?.remotePortId;

  const sides = [
    { device: source, port: portOf(source, target, link.sourceInterface) },
    { device: target, port: portOf(target, source, link.targetInterface) },
  ];

  // 1) พอร์ตดับมาก่อนเสมอ — ต่อให้ LLDP ยังจำเพื่อนบ้านเดิมไว้ สายก็ใช้งานไม่ได้
  for (const side of sides) {
    if (!side.port) continue;
    const iface = findInterface(ctx, side.device, side.port);
    if (!iface) continue;
    if (iface.operStatus === 'down' || iface.adminStatus === 'down') {
      return {
        verdict: 'down',
        reason: `พอร์ต ${side.port} ของ ${side.device.name} มีสถานะ ${
          iface.adminStatus === 'down' ? 'admin down' : 'down'
        }`,
      };
    }
  }

  // พอร์ตที่บันทึกไว้ต้องตรงกับปลายทาง แม้พอร์ตอื่นของเครื่องจะพบเพื่อนบ้านตัวนั้น
  for (const side of sides) {
    const other = side.device.id === source.id ? target : source;
    const onPort = side.port && neighborsOf(side.device).find((n) => sameName(n.localInterface, side.port!));
    if (onPort && !neighborIsDevice(onPort, other)) {
      return { verdict: 'mismatch', reason: `พอร์ต ${side.port} ของ ${side.device.name} ต่อกับ ${onPort.remoteSysName} ไม่ตรงกับเส้นบนผัง` };
    }
  }

  // 2) ฝั่งใดฝั่งหนึ่งประกาศว่าเห็นอีกฝั่งอยู่จริง ถือว่ายืนยันแล้ว
  for (const [self, other] of [
    [source, target],
    [target, source],
  ] as const) {
    const localPort = self.id === source.id ? link.sourceInterface : link.targetInterface;
    const remotePort = self.id === source.id ? link.targetInterface : link.sourceInterface;
    const match = neighborsOf(self).find((n) => neighborIsDevice(n, other) &&
      (!localPort || sameName(localPort, n.localInterface)) &&
      (!remotePort || !n.remotePortId || sameName(remotePort, n.remotePortId)));
    if (match) {
      return {
        verdict: 'verified',
        reason: `${match.protocol.toUpperCase()} จาก ${self.name} พอร์ต ${match.localInterface} ยืนยันว่าปลายสายคือ ${other.name}${
          match.remotePortId ? ` พอร์ต ${match.remotePortId}` : ''
        }`,
      };
    }
  }

  // 3) พอร์ตที่ผูกไว้ประกาศว่าต่อกับอุปกรณ์อื่น — ขัดแย้งชัดเจน
  for (const side of sides) {
    if (!side.port) continue;
    const onPort = neighborsOf(side.device).find((n) => sameName(n.localInterface, side.port!));
    if (onPort) {
      return {
        verdict: 'mismatch',
        reason: `พอร์ต ${side.port} ของ ${side.device.name} ประกาศว่าต่อกับ ${onPort.remoteSysName} ไม่ใช่อุปกรณ์ที่เส้นนี้ลากไว้`,
      };
    }
  }

  // 4) มีรายการเพื่อนบ้านของฝั่งใดฝั่งหนึ่ง แต่ไม่มีอีกฝั่งอยู่ในรายการนั้น
  const withNeighbors = [source, target].filter((d) => neighborsOf(d).length > 0);
  if (withNeighbors.length > 0) {
    const names = withNeighbors.map((d) => d.name).join(' และ ');
    return {
      verdict: 'mismatch',
      reason: `${names} รายงานเพื่อนบ้านผ่าน LLDP/CDP แต่ไม่มีอุปกรณ์ปลายทางของเส้นนี้อยู่ในรายการ`,
    };
  }

  return {
    verdict: 'unverified',
    reason: 'ทั้งสองฝั่งไม่มีข้อมูล LLDP/CDP จึงยังตรวจสอบไม่ได้ (ไม่ได้แปลว่าต่อผิด)',
  };
}

/** ตรวจทุกเส้นในผังเดียว คืนผลเป็น Map ที่ค้นด้วย id ของเส้น */
export function verifyLinks(
  links: TopologyLayoutLink[],
  ctx: VerifyContext
): Map<string, LinkVerification> {
  return new Map(links.map((link) => {
    const source = ctx.devices.find((d) => d.id === link.source);
    const target = ctx.devices.find((d) => d.id === link.target);
    const forward = target && ctx.neighbors.find((n) => n.localDeviceId === link.source && neighborIsDevice(n, target) && (!link.sourceInterface || sameName(n.localInterface, link.sourceInterface)));
    const reverse = source && ctx.neighbors.find((n) => n.localDeviceId === link.target && neighborIsDevice(n, source) && (!link.targetInterface || sameName(n.localInterface, link.targetInterface)));
    const sourcePort = link.sourceInterface ?? forward?.localInterface ?? reverse?.remotePortId;
    const targetPort = link.targetInterface ?? reverse?.localInterface ?? forward?.remotePortId;
    const interfaces = [source && sourcePort ? findInterface(ctx, source, sourcePort) : undefined,
      target && targetPort ? findInterface(ctx, target, targetPort) : undefined].filter((i) => i !== undefined);
    const check = verifyLink(link, ctx);
    const speeds = interfaces.map((i) => i.speedMbps).filter((s): s is number => typeof s === 'number' && s > 0);
    const connectionStatus = check.verdict === 'down' ? 'down' : check.verdict !== 'verified' || !interfaces.length ? 'unknown'
      : interfaces.some((i) => i.packetLossPercent > 0 || i.errorRate > 0) ? 'degraded' : 'up';
    return [link.id, { ...check, sourcePort, targetPort, speedMbps: speeds.length ? Math.min(...speeds) : undefined, connectionStatus }];
  }));
}
