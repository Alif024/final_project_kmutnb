'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { TopologyLayout, TopologyLayoutLink, TopologyLayoutNode } from '@/types/ai-noc';

/**
 * เก็บผัง Topology ที่ผู้ใช้ลากวางเอง
 *
 * ระบบยังไม่มีฐานข้อมูล จึงเก็บลง `localStorage` เพื่อให้ผังที่วาดไว้ไม่หาย
 * เมื่อรีเฟรชหน้าหรือสลับแท็บ (View ถูก unmount ทุกครั้งที่เปลี่ยนแท็บ)
 * พร้อมปุ่ม Export/Import เป็นไฟล์ JSON สำหรับสำรองและย้ายเครื่อง
 *
 * ทำไมต้องเป็น `useSyncExternalStore`:
 * localStorage เป็นแหล่งข้อมูลภายนอกที่ฝั่ง Server ไม่มี ถ้าอ่านค่าตอน render
 * HTML จาก Server จะไม่ตรงกับ Client (Hydration Mismatch) ส่วนการอ่านใน
 * `useEffect` แล้ว `setState` ก็ทำให้เกิด render ซ้อน `useSyncExternalStore`
 * แก้ทั้งสองข้อในตัวเอง — ตอน Hydrate ใช้ค่าจาก `getServerSnapshot` (ผังว่าง)
 * แล้วค่อยสลับมาใช้ค่าจริงจาก localStorage ให้อัตโนมัติหลัง Hydrate เสร็จ
 */

const STORAGE_KEY = 'ai-noc:topology-layout';

export function createEmptyLayout(): TopologyLayout {
  return { version: 1, nodes: [], links: [], updatedAt: '' };
}

/**
 * ตรวจรูปร่างข้อมูลก่อนนำมาใช้ — ทั้งของจาก localStorage ที่อาจค้างจากเวอร์ชันเก่า
 * และไฟล์ที่ผู้ใช้ Import เข้ามาเอง ซึ่งอาจไม่ใช่ผังของระบบนี้
 */
export function parseLayout(raw: unknown): TopologyLayout | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate = raw as Partial<TopologyLayout>;
  if (candidate.version !== 1) return null;
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.links)) return null;

  const nodes: TopologyLayoutNode[] = [];
  for (const n of candidate.nodes) {
    if (
      typeof n?.deviceId === 'string' &&
      typeof n?.x === 'number' &&
      typeof n?.y === 'number' &&
      Number.isFinite(n.x) &&
      Number.isFinite(n.y)
    ) {
      nodes.push({ deviceId: n.deviceId, x: n.x, y: n.y });
    }
  }

  const nodeIds = new Set(nodes.map((n) => n.deviceId));
  const links: TopologyLayoutLink[] = [];
  for (const l of candidate.links) {
    if (
      typeof l?.id === 'string' &&
      typeof l?.source === 'string' &&
      typeof l?.target === 'string' &&
      // ตัดเส้นที่ชี้ไปยังอุปกรณ์ซึ่งไม่ได้อยู่บนผังแล้วทิ้ง ไม่งั้นจะวาดเส้นลอย
      nodeIds.has(l.source) &&
      nodeIds.has(l.target)
    ) {
      links.push({
        id: l.id,
        source: l.source,
        target: l.target,
        linkStatus: l.linkStatus === 'down' || l.linkStatus === 'degraded' ? l.linkStatus : 'up',
        label: typeof l.label === 'string' ? l.label : undefined,
      });
    }
  }

  return {
    version: 1,
    nodes,
    links,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : '',
  };
}

/* ──────────────────────────────────────────────────────────────────────────
   คลังข้อมูลระดับโมดูล — มีผังเดียวทั้งแอป จึงไม่ต้องแยกตาม Component
   ────────────────────────────────────────────────────────────────────────── */

/**
 * ค่าที่ใช้ตอน Server Render และตอน Hydrate ต้องเป็นอ็อบเจกต์ตัวเดิมเสมอ
 * ไม่งั้น React จะมองว่าค่าเปลี่ยนทุกครั้งแล้ว render ไม่รู้จบ
 */
const EMPTY_LAYOUT: TopologyLayout = createEmptyLayout();

let cachedLayout: TopologyLayout = EMPTY_LAYOUT;
let readFromStorage = false;
const listeners = new Set<() => void>();

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

function loadFromStorage(): TopologyLayout {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return EMPTY_LAYOUT;
    return parseLayout(JSON.parse(stored)) ?? EMPTY_LAYOUT;
  } catch {
    // localStorage ใช้ไม่ได้ (โหมดส่วนตัว) หรือข้อมูลเสีย — เริ่มจากผังว่าง
    return EMPTY_LAYOUT;
  }
}

function getSnapshot(): TopologyLayout {
  // อ่านจาก localStorage ครั้งเดียวตอนถูกเรียกครั้งแรกบน Client
  if (!readFromStorage) {
    cachedLayout = loadFromStorage();
    readFromStorage = true;
  }
  return cachedLayout;
}

function getServerSnapshot(): TopologyLayout {
  return EMPTY_LAYOUT;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  // ผู้ใช้อาจเปิดระบบไว้หลายแท็บ — ซิงก์ผังให้ตรงกันเมื่ออีกแท็บบันทึกทับ
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cachedLayout = loadFromStorage();
    emitChange();
  };
  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** เขียนผังใหม่ทั้งก้อน พร้อมบันทึกลง localStorage แล้วแจ้งผู้ที่ subscribe อยู่ */
function writeLayout(next: TopologyLayout): void {
  cachedLayout = next;
  readFromStorage = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // เขียนไม่ได้ก็ให้ใช้งานต่อได้ เพียงแต่ผังจะหายเมื่อรีเฟรช
  }
  emitChange();
}

/** อัปเดตแบบอ้างอิงค่าเดิม พร้อมประทับเวลาแก้ไขล่าสุดให้เสมอ */
function updateLayout(
  updater: (prev: TopologyLayout) => Omit<TopologyLayout, 'version' | 'updatedAt'> | null
): void {
  const next = updater(getSnapshot());
  if (!next) return;
  writeLayout({ version: 1, ...next, updatedAt: new Date().toISOString() });
}

export function useTopologyLayout() {
  const layout = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  /** วางอุปกรณ์ลงผัง — อุปกรณ์เดิมที่อยู่บนผังแล้วจะไม่ถูกเพิ่มซ้ำ */
  const addNode = useCallback((deviceId: string, x: number, y: number) => {
    updateLayout((prev) => {
      if (prev.nodes.some((n) => n.deviceId === deviceId)) return null;
      return { nodes: [...prev.nodes, { deviceId, x, y }], links: prev.links };
    });
  }, []);

  const moveNode = useCallback((deviceId: string, x: number, y: number) => {
    updateLayout((prev) => ({
      nodes: prev.nodes.map((n) => (n.deviceId === deviceId ? { ...n, x, y } : n)),
      links: prev.links,
    }));
  }, []);

  /** เอาอุปกรณ์ออกจากผัง พร้อมลบเส้นเชื่อมที่ผูกกับอุปกรณ์นั้นทั้งหมด */
  const removeNode = useCallback((deviceId: string) => {
    updateLayout((prev) => ({
      nodes: prev.nodes.filter((n) => n.deviceId !== deviceId),
      links: prev.links.filter((l) => l.source !== deviceId && l.target !== deviceId),
    }));
  }, []);

  /** เชื่อมอุปกรณ์สองตัว — กันเส้นซ้ำ (รวมทิศกลับกัน) และกันเชื่อมเข้าตัวเอง */
  const addLink = useCallback((source: string, target: string) => {
    updateLayout((prev) => {
      if (source === target) return null;
      const duplicated = prev.links.some(
        (l) =>
          (l.source === source && l.target === target) ||
          (l.source === target && l.target === source)
      );
      if (duplicated) return null;
      const link: TopologyLayoutLink = {
        id: `link-${source}-${target}-${Date.now()}`,
        source,
        target,
        linkStatus: 'up',
      };
      return { nodes: prev.nodes, links: [...prev.links, link] };
    });
  }, []);

  const removeLink = useCallback((linkId: string) => {
    updateLayout((prev) => ({
      nodes: prev.nodes,
      links: prev.links.filter((l) => l.id !== linkId),
    }));
  }, []);

  const clearLayout = useCallback(() => {
    writeLayout(createEmptyLayout());
  }, []);

  const replaceLayout = useCallback((next: TopologyLayout) => {
    writeLayout({ ...next, updatedAt: new Date().toISOString() });
  }, []);

  return {
    layout,
    addNode,
    moveNode,
    removeNode,
    addLink,
    removeLink,
    clearLayout,
    replaceLayout,
  };
}
