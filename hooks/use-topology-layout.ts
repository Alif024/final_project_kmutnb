'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  TopologyDiagram,
  TopologyLayout,
  TopologyLayoutLink,
  TopologyLayoutNode,
  TopologyWorkspace,
} from '@/types/ai-noc';

/**
 * เก็บผัง Topology ที่ผู้ใช้ลากวางเอง — บันทึกได้หลายผัง
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

/** คลังผังหลายใบ (รูปแบบปัจจุบัน) */
const STORAGE_KEY = 'ai-noc:topology-workspace';
/** ผังเดียวแบบเดิม — อ่านครั้งเดียวเพื่อย้ายข้อมูลเก่าเข้าคลังใหม่ */
const LEGACY_STORAGE_KEY = 'ai-noc:topology-layout';

const DEFAULT_DIAGRAM_NAME = 'ผังที่ 1';

function newId(): string {
  return `diagram-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyLayout(): TopologyLayout {
  return { version: 1, nodes: [], links: [], updatedAt: '' };
}

function createDiagramRecord(name: string, nodes: TopologyLayoutNode[] = [], links: TopologyLayoutLink[] = []): TopologyDiagram {
  return { id: newId(), name, nodes, links, updatedAt: new Date().toISOString() };
}

/**
 * ตรวจรูปร่างข้อมูลของผังหนึ่งใบก่อนนำมาใช้ — ทั้งของจาก localStorage
 * ที่อาจค้างจากเวอร์ชันเก่า และไฟล์ที่ผู้ใช้ Import เข้ามาเอง ซึ่งอาจไม่ใช่ผังของระบบนี้
 */
export function parseLayout(raw: unknown): TopologyLayout | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate = raw as Partial<TopologyLayout>;
  if (candidate.version !== 1) return null;
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.links)) return null;

  const { nodes, links } = sanitizeGraph(candidate.nodes, candidate.links);

  return {
    version: 1,
    name: typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim() : undefined,
    nodes,
    links,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : '',
  };
}

/** คัดเฉพาะกล่องและเส้นที่ข้อมูลครบถ้วน และตัดเส้นที่ชี้ไปยังกล่องซึ่งไม่อยู่บนผังแล้ว */
function sanitizeGraph(
  rawNodes: unknown[],
  rawLinks: unknown[]
): { nodes: TopologyLayoutNode[]; links: TopologyLayoutLink[] } {
  const nodes: TopologyLayoutNode[] = [];
  for (const raw of rawNodes) {
    const n = raw as Partial<TopologyLayoutNode>;
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
  for (const raw of rawLinks) {
    const l = raw as Partial<TopologyLayoutLink>;
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
        sourceInterface: typeof l.sourceInterface === 'string' ? l.sourceInterface : undefined,
        targetInterface: typeof l.targetInterface === 'string' ? l.targetInterface : undefined,
      });
    }
  }

  return { nodes, links };
}

function parseWorkspace(raw: unknown): TopologyWorkspace | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate = raw as Partial<TopologyWorkspace>;
  if (candidate.version !== 2 || !Array.isArray(candidate.diagrams)) return null;

  const diagrams: TopologyDiagram[] = [];
  for (const raw of candidate.diagrams) {
    const d = raw as Partial<TopologyDiagram>;
    if (typeof d?.id !== 'string' || typeof d?.name !== 'string') continue;
    if (!Array.isArray(d.nodes) || !Array.isArray(d.links)) continue;
    const { nodes, links } = sanitizeGraph(d.nodes, d.links);
    diagrams.push({
      id: d.id,
      name: d.name,
      nodes,
      links,
      updatedAt: typeof d.updatedAt === 'string' ? d.updatedAt : '',
    });
  }

  if (diagrams.length === 0) return null;
  const activeId =
    typeof candidate.activeId === 'string' && diagrams.some((d) => d.id === candidate.activeId)
      ? candidate.activeId
      : diagrams[0].id;

  return { version: 2, diagrams, activeId };
}

/* ──────────────────────────────────────────────────────────────────────────
   คลังข้อมูลระดับโมดูล — มีคลังผังเดียวทั้งแอป จึงไม่ต้องแยกตาม Component
   ────────────────────────────────────────────────────────────────────────── */

/**
 * ค่าที่ใช้ตอน Server Render และตอน Hydrate ต้องเป็นอ็อบเจกต์ตัวเดิมเสมอ
 * ไม่งั้น React จะมองว่าค่าเปลี่ยนทุกครั้งแล้ว render ไม่รู้จบ
 */
const EMPTY_WORKSPACE: TopologyWorkspace = {
  version: 2,
  diagrams: [{ id: 'diagram-initial', name: DEFAULT_DIAGRAM_NAME, nodes: [], links: [], updatedAt: '' }],
  activeId: 'diagram-initial',
};

let cachedWorkspace: TopologyWorkspace = EMPTY_WORKSPACE;
let readFromStorage = false;
const listeners = new Set<() => void>();

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

/** ย้ายผังเดียวแบบเดิมเข้าคลังใหม่ เพื่อไม่ให้ผังที่ผู้ใช้วาดไว้ก่อนหน้านี้หายไป */
function migrateLegacyLayout(): TopologyWorkspace | null {
  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return null;
    const parsed = parseLayout(JSON.parse(legacy));
    if (!parsed || parsed.nodes.length === 0) return null;
    const diagram = createDiagramRecord(parsed.name ?? DEFAULT_DIAGRAM_NAME, parsed.nodes, parsed.links);
    return { version: 2, diagrams: [diagram], activeId: diagram.id };
  } catch {
    return null;
  }
}

function loadFromStorage(): TopologyWorkspace {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return parseWorkspace(JSON.parse(stored)) ?? EMPTY_WORKSPACE;
    return migrateLegacyLayout() ?? EMPTY_WORKSPACE;
  } catch {
    // localStorage ใช้ไม่ได้ (โหมดส่วนตัว) หรือข้อมูลเสีย — เริ่มจากคลังว่าง
    return EMPTY_WORKSPACE;
  }
}

function getSnapshot(): TopologyWorkspace {
  // อ่านจาก localStorage ครั้งเดียวตอนถูกเรียกครั้งแรกบน Client
  if (!readFromStorage) {
    cachedWorkspace = loadFromStorage();
    readFromStorage = true;
  }
  return cachedWorkspace;
}

function getServerSnapshot(): TopologyWorkspace {
  return EMPTY_WORKSPACE;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  // ผู้ใช้อาจเปิดระบบไว้หลายแท็บ — ซิงก์ผังให้ตรงกันเมื่ออีกแท็บบันทึกทับ
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cachedWorkspace = loadFromStorage();
    emitChange();
  };
  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function writeWorkspace(next: TopologyWorkspace): void {
  cachedWorkspace = next;
  readFromStorage = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // เขียนไม่ได้ก็ให้ใช้งานต่อได้ เพียงแต่ผังจะหายเมื่อรีเฟรช
  }
  emitChange();
}

/** แก้เฉพาะผังที่เปิดอยู่ พร้อมประทับเวลาแก้ไขล่าสุดให้เสมอ */
function updateActiveDiagram(
  updater: (active: TopologyDiagram) => Pick<TopologyDiagram, 'nodes' | 'links'> | null
): void {
  const ws = getSnapshot();
  const active = ws.diagrams.find((d) => d.id === ws.activeId);
  if (!active) return;
  const next = updater(active);
  if (!next) return;
  writeWorkspace({
    ...ws,
    diagrams: ws.diagrams.map((d) =>
      d.id === active.id ? { ...d, ...next, updatedAt: new Date().toISOString() } : d
    ),
  });
}

/** ตั้งชื่อที่ยังไม่ถูกใช้ เช่น "ผังที่ 2", "ผังที่ 3" */
function nextDiagramName(existing: TopologyDiagram[]): string {
  for (let i = existing.length + 1; ; i++) {
    const name = `ผังที่ ${i}`;
    if (!existing.some((d) => d.name === name)) return name;
  }
}

export function useTopologyLayout() {
  const workspace = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const activeDiagram =
    workspace.diagrams.find((d) => d.id === workspace.activeId) ?? workspace.diagrams[0];

  /** วางอุปกรณ์ลงผัง — อุปกรณ์เดิมที่อยู่บนผังแล้วจะไม่ถูกเพิ่มซ้ำ */
  const addNode = useCallback((deviceId: string, x: number, y: number) => {
    updateActiveDiagram((active) => {
      if (active.nodes.some((n) => n.deviceId === deviceId)) return null;
      return { nodes: [...active.nodes, { deviceId, x, y }], links: active.links };
    });
  }, []);

  const moveNode = useCallback((deviceId: string, x: number, y: number) => {
    updateActiveDiagram((active) => ({
      nodes: active.nodes.map((n) => (n.deviceId === deviceId ? { ...n, x, y } : n)),
      links: active.links,
    }));
  }, []);

  /** เอาอุปกรณ์ออกจากผัง พร้อมลบเส้นเชื่อมที่ผูกกับอุปกรณ์นั้นทั้งหมด */
  const removeNode = useCallback((deviceId: string) => {
    updateActiveDiagram((active) => ({
      nodes: active.nodes.filter((n) => n.deviceId !== deviceId),
      links: active.links.filter((l) => l.source !== deviceId && l.target !== deviceId),
    }));
  }, []);

  /** เชื่อมอุปกรณ์สองตัว — กันเส้นซ้ำ (รวมทิศกลับกัน) และกันเชื่อมเข้าตัวเอง */
  const addLink = useCallback((source: string, target: string) => {
    updateActiveDiagram((active) => {
      if (source === target) return null;
      const duplicated = active.links.some(
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
      return { nodes: active.nodes, links: [...active.links, link] };
    });
  }, []);

  /**
   * สร้างเส้นเชื่อมจากคู่พอร์ตที่ LLDP/CDP ตรวจพบ แล้วใส่ชื่อพอร์ตให้ทั้งสองฝั่งในครั้งเดียว
   *
   * นี่เป็นทางเดียวที่ชื่อพอร์ตจะถูกเขียนลงเส้นเชื่อม — ระบบไม่เปิดให้กรอกเอง
   * แต่ผู้ใช้ยังต้องกดปุ่มเอง ระบบไม่ลากเส้นให้อัตโนมัติจากผลการตรวจจับ
   */
  const applyNeighborLink = useCallback(
    (localId: string, localInterface: string, peerId: string, peerInterface?: string) => {
      updateActiveDiagram((active) => {
        if (localId === peerId) return null;
        const existing = active.links.find(
          (l) =>
            (l.source === localId && l.target === peerId) ||
            (l.source === peerId && l.target === localId)
        );
        // หนึ่งพอร์ตผูกได้เส้นเดียว จึงปลดพอร์ตทั้งสองฝั่งออกจากเส้นอื่นก่อน
        const cleared = active.links.map((l) => {
          let next = l;
          if (next.source === localId && next.sourceInterface === localInterface) {
            next = { ...next, sourceInterface: undefined };
          }
          if (next.target === localId && next.targetInterface === localInterface) {
            next = { ...next, targetInterface: undefined };
          }
          if (peerInterface) {
            if (next.source === peerId && next.sourceInterface === peerInterface) {
              next = { ...next, sourceInterface: undefined };
            }
            if (next.target === peerId && next.targetInterface === peerInterface) {
              next = { ...next, targetInterface: undefined };
            }
          }
          return next;
        });

        if (existing) {
          return {
            nodes: active.nodes,
            links: cleared.map((l) =>
              l.id !== existing.id
                ? l
                : l.source === localId
                ? { ...l, sourceInterface: localInterface, targetInterface: peerInterface }
                : { ...l, targetInterface: localInterface, sourceInterface: peerInterface }
            ),
          };
        }

        return {
          nodes: active.nodes,
          links: [
            ...cleared,
            {
              id: `link-${localId}-${peerId}-${Date.now()}`,
              source: localId,
              target: peerId,
              linkStatus: 'up' as const,
              sourceInterface: localInterface,
              targetInterface: peerInterface,
            },
          ],
        };
      });
    },
    []
  );

  const removeLink = useCallback((linkId: string) => {
    updateActiveDiagram((active) => ({
      nodes: active.nodes,
      links: active.links.filter((l) => l.id !== linkId),
    }));
  }, []);

  /** ล้างเฉพาะเนื้อหาของผังที่เปิดอยู่ ไม่ได้ลบตัวผังทิ้ง */
  const clearLayout = useCallback(() => {
    updateActiveDiagram(() => ({ nodes: [], links: [] }));
  }, []);

  /* ── จัดการผังหลายใบ ────────────────────────────────────────────────── */

  const selectDiagram = useCallback((id: string) => {
    const ws = getSnapshot();
    if (!ws.diagrams.some((d) => d.id === id) || ws.activeId === id) return;
    writeWorkspace({ ...ws, activeId: id });
  }, []);

  /** สร้างผังใหม่แล้วเปิดผังนั้นทันที */
  const createDiagram = useCallback((name?: string) => {
    const ws = getSnapshot();
    const diagram = createDiagramRecord(name?.trim() || nextDiagramName(ws.diagrams));
    writeWorkspace({ ...ws, diagrams: [...ws.diagrams, diagram], activeId: diagram.id });
  }, []);

  /** ทำสำเนาผัง เพื่อลองปรับผังแบบใหม่โดยไม่แตะของเดิม */
  const duplicateDiagram = useCallback((id: string) => {
    const ws = getSnapshot();
    const source = ws.diagrams.find((d) => d.id === id);
    if (!source) return;
    const copy = createDiagramRecord(`${source.name} (สำเนา)`, source.nodes, source.links);
    writeWorkspace({ ...ws, diagrams: [...ws.diagrams, copy], activeId: copy.id });
  }, []);

  const renameDiagram = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const ws = getSnapshot();
    writeWorkspace({
      ...ws,
      diagrams: ws.diagrams.map((d) => (d.id === id ? { ...d, name: trimmed } : d)),
    });
  }, []);

  /** ลบผัง — ถ้าลบใบสุดท้ายจะสร้างผังว่างใบใหม่ให้แทน เพื่อให้มีผังเปิดอยู่เสมอ */
  const deleteDiagram = useCallback((id: string) => {
    const ws = getSnapshot();
    const remaining = ws.diagrams.filter((d) => d.id !== id);
    if (remaining.length === 0) {
      const fresh = createDiagramRecord(DEFAULT_DIAGRAM_NAME);
      writeWorkspace({ version: 2, diagrams: [fresh], activeId: fresh.id });
      return;
    }
    writeWorkspace({
      ...ws,
      diagrams: remaining,
      activeId: ws.activeId === id ? remaining[0].id : ws.activeId,
    });
  }, []);

  /** นำผังจากไฟล์เข้ามาเป็น "ผังใบใหม่" เสมอ ไม่เขียนทับผังที่เปิดอยู่ */
  const importDiagram = useCallback((layout: TopologyLayout) => {
    const ws = getSnapshot();
    const diagram = createDiagramRecord(
      layout.name?.trim() || nextDiagramName(ws.diagrams),
      layout.nodes,
      layout.links
    );
    writeWorkspace({ ...ws, diagrams: [...ws.diagrams, diagram], activeId: diagram.id });
  }, []);

  return {
    diagrams: workspace.diagrams,
    activeDiagram,
    /** เนื้อหาของผังที่เปิดอยู่ ในรูปแบบไฟล์ Export */
    layout: {
      version: 1 as const,
      name: activeDiagram.name,
      nodes: activeDiagram.nodes,
      links: activeDiagram.links,
      updatedAt: activeDiagram.updatedAt,
    } satisfies TopologyLayout,
    addNode,
    moveNode,
    removeNode,
    addLink,
    removeLink,
    applyNeighborLink,
    clearLayout,
    selectDiagram,
    createDiagram,
    duplicateDiagram,
    renameDiagram,
    deleteDiagram,
    importDiagram,
  };
}
