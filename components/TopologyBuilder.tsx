'use client';

import React, { useRef, useState } from 'react';
import {
  Cable,
  Check,
  Copy,
  Download,
  Maximize2,
  MousePointer2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { DiscoveredDevice, TopologyDiagram, TopologyLayout } from '@/types/ai-noc';
import { InterfacePeer } from '@/lib/interface-map';
import { LinkVerification, VERDICT_COLOR, VERDICT_LABEL } from '@/lib/link-verification';
import { DEVICE_DRAG_TYPE, deviceIcon, statusDot } from './DeviceInventoryPanel';

/** ขนาดกล่องอุปกรณ์บนผัง ใช้คำนวณจุดกึ่งกลางสำหรับลากเส้นเชื่อม */
const NODE_W = 170;
const NODE_H = 58;
/** ความละเอียดของกริดที่ตำแหน่งจะถูกดูดเข้าหา */
const GRID = 8;
/** ขนาดพื้นที่วาด (พิกัดภายใน ไม่ขึ้นกับระดับการซูม) */
const CANVAS_W = 1600;
const CANVAS_H = 900;

const MIN_SCALE = 0.5;
const MAX_SCALE = 1.5;

function snap(value: number): number {
  return Math.round(value / GRID) * GRID;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** ผลตรวจที่ยังไม่มีข้อมูล ใช้เมื่อยังโหลดข้อมูลเพื่อนบ้านไม่เสร็จ */
const PENDING_VERIFICATION: LinkVerification = {
  verdict: 'unverified',
  reason: 'กำลังตรวจสอบกับข้อมูล LLDP/CDP',
};

interface TopologyBuilderProps {
  devices: DiscoveredDevice[];
  layout: TopologyLayout;
  /** ผังทั้งหมดที่ผู้ใช้บันทึกไว้ */
  diagrams: TopologyDiagram[];
  activeDiagram: TopologyDiagram;
  /** ผลตรวจสอบเส้นเชื่อมเทียบกับ LLDP/CDP ค้นด้วย id ของเส้น */
  linkVerifications: Map<string, LinkVerification>;
  /** พอร์ตของแต่ละอุปกรณ์ว่าต่อกับเครื่องไหน ใช้แสดงตอนชี้เมาส์ที่กล่อง */
  interfacePeers: Map<string, InterfacePeer[]>;
  onSelectDiagram: (id: string) => void;
  onCreateDiagram: () => void;
  onDuplicateDiagram: (id: string) => void;
  onRenameDiagram: (id: string, name: string) => void;
  onDeleteDiagram: (id: string) => void;
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string | null) => void;
  onAddNode: (deviceId: string, x: number, y: number) => void;
  onMoveNode: (deviceId: string, x: number, y: number) => void;
  onRemoveNode: (deviceId: string) => void;
  onAddLink: (source: string, target: string) => void;
  onRemoveLink: (linkId: string) => void;
  onClear: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

/**
 * พื้นที่วาดผัง Topology ที่ผู้ใช้สร้างเอง
 *
 * ไม่มีการจัดวางอัตโนมัติใด ๆ — ตำแหน่งทุกจุดและเส้นเชื่อมทุกเส้นมาจากการกระทำ
 * ของผู้ใช้เท่านั้น (ลากจากคลังอุปกรณ์มาวาง แล้วสลับเป็นโหมดเชื่อมต่อเพื่อคลิก
 * อุปกรณ์สองตัวให้เกิดเส้น)
 */
export default function TopologyBuilder({
  devices,
  layout,
  diagrams,
  activeDiagram,
  linkVerifications,
  interfacePeers,
  onSelectDiagram,
  onCreateDiagram,
  onDuplicateDiagram,
  onRenameDiagram,
  onDeleteDiagram,
  selectedDeviceId,
  onSelectDevice,
  onAddNode,
  onMoveNode,
  onRemoveNode,
  onAddLink,
  onRemoveLink,
  onClear,
  onExport,
  onImport,
}: TopologyBuilderProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** ข้อมูลระหว่างลากย้ายกล่อง เก็บใน ref เพราะเปลี่ยนถี่มากและไม่ต้อง re-render */
  const dragRef = useRef<{
    deviceId: string;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const [scale, setScale] = useState(1);
  const [connectMode, setConnectMode] = useState(false);
  /** กำลังแก้ชื่อผังอยู่หรือไม่ — แสดงช่องกรอกแทนตัวเลือกผัง */
  const [renameValue, setRenameValue] = useState<string | null>(null);
  /** แสดงแถบยืนยันก่อนลบผัง เพราะลบแล้วย้อนกลับไม่ได้ */
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** อุปกรณ์ตัวแรกที่ถูกคลิกในโหมดเชื่อมต่อ (รออีกตัวเพื่อปิดเส้น) */
  const [pendingLinkFrom, setPendingLinkFrom] = useState<string | null>(null);
  /** กล่องที่กำลังถูกลากอยู่ — ซ่อน tooltip ไว้ก่อนเพื่อไม่ให้บังพื้นที่วาง */
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const deviceMap = new Map(devices.map((d) => [d.id, d]));

  /** แปลงพิกัดบนหน้าจอเป็นพิกัดภายในผัง (หักผลของการซูมและการเลื่อนออกแล้ว) */
  function toCanvasPoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
  }

  function handleDrop(e: React.DragEvent) {
    const deviceId = e.dataTransfer.getData(DEVICE_DRAG_TYPE);
    if (!deviceId) return;
    e.preventDefault();
    const p = toCanvasPoint(e.clientX, e.clientY);
    // วางให้จุดที่ปล่อยเมาส์อยู่กึ่งกลางกล่อง
    onAddNode(
      deviceId,
      clamp(snap(p.x - NODE_W / 2), 0, CANVAS_W - NODE_W),
      clamp(snap(p.y - NODE_H / 2), 0, CANVAS_H - NODE_H)
    );
  }

  function handleNodeClick(deviceId: string) {
    if (!connectMode) {
      onSelectDevice(deviceId);
      return;
    }
    if (pendingLinkFrom === null) {
      setPendingLinkFrom(deviceId);
      return;
    }
    if (pendingLinkFrom !== deviceId) {
      onAddLink(pendingLinkFrom, deviceId);
    }
    setPendingLinkFrom(null);
  }

  function exitConnectMode() {
    setConnectMode(false);
    setPendingLinkFrom(null);
  }

  /** ข้อความบอกปลายทางทั้งสองฝั่ง พร้อมผลตรวจสอบกับ LLDP/CDP */
  const linkTitle = (link: TopologyLayout['links'][number]) => {
    const name = (id: string) => deviceMap.get(id)?.name ?? id;
    const side = (id: string, port?: string) => (port ? `${name(id)} (${port})` : name(id));
    const check = linkVerifications.get(link.id) ?? PENDING_VERIFICATION;
    return (
      `${side(link.source, link.sourceInterface)} ←→ ${side(link.target, link.targetInterface)}` +
      `\n[${VERDICT_LABEL[check.verdict]}] ${check.reason}`
    );
  };

  const nodeCenter = (deviceId: string) => {
    const n = layout.nodes.find((node) => node.deviceId === deviceId);
    if (!n) return null;
    return { x: n.x + NODE_W / 2, y: n.y + NODE_H / 2 };
  };

  return (
    <div className="bg-white dark:bg-slate-950/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
      {/* แถวเลือกและจัดการผังที่บันทึกไว้ */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center gap-2">
        {confirmDelete ? (
          <>
            <span className="text-xs text-slate-900 dark:text-white flex-1 min-w-0">
              ลบผัง <span className="font-bold">{activeDiagram.name}</span> ถาวรหรือไม่?
              {activeDiagram.nodes.length > 0 && (
                <span className="text-slate-500 dark:text-slate-400">
                  {' '}
                  (มี {activeDiagram.nodes.length} อุปกรณ์อยู่บนผัง)
                </span>
              )}
            </span>
            <button
              onClick={() => {
                onDeleteDiagram(activeDiagram.id);
                setConfirmDelete(false);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/90 text-white hover:bg-rose-500 transition-colors"
            >
              ลบผัง
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              ยกเลิก
            </button>
          </>
        ) : renameValue !== null ? (
          <>
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onRenameDiagram(activeDiagram.id, renameValue);
                  setRenameValue(null);
                }
                if (e.key === 'Escape') setRenameValue(null);
              }}
              className="flex-1 min-w-0 bg-white dark:bg-slate-950/60 border border-blue-500/50 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
              placeholder="ชื่อผัง"
            />
            <button
              onClick={() => {
                onRenameDiagram(activeDiagram.id, renameValue);
                setRenameValue(null);
              }}
              className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              title="บันทึกชื่อ"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRenameValue(null)}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              title="ยกเลิก"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
              ผัง
            </span>
            <select
              value={activeDiagram.id}
              onChange={(e) => onSelectDiagram(e.target.value)}
              className="flex-1 min-w-[160px] max-w-xs bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50"
            >
              {diagrams.map((d) => (
                <option
                  key={d.id}
                  value={d.id}
                  className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
                >
                  {d.name} ({d.nodes.length} อุปกรณ์)
                </option>
              ))}
            </select>

            <button
              onClick={() => setRenameValue(activeDiagram.name)}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              title="เปลี่ยนชื่อผังนี้"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDuplicateDiagram(activeDiagram.id)}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              title="ทำสำเนาผังนี้"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="ลบผังนี้"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <div className="flex-1" />

            <button
              onClick={onCreateDiagram}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5"
              title="สร้างผังใบใหม่"
            >
              <Plus className="w-3.5 h-3.5" /> ผังใหม่
            </button>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
              บันทึกแล้ว {diagrams.length} ผัง
            </span>
          </>
        )}
      </div>

      {/* แถบเครื่องมือของผัง */}
      <div className="p-3 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center gap-2">
        <button
          onClick={() => (connectMode ? exitConnectMode() : setConnectMode(true))}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
            connectMode
              ? 'bg-blue-600/80 text-white border-blue-400/30 shadow-lg shadow-blue-500/20'
              : 'bg-white dark:bg-white/5 text-slate-900 dark:text-white border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
        >
          {connectMode ? <Cable className="w-3.5 h-3.5" /> : <MousePointer2 className="w-3.5 h-3.5" />}
          {connectMode ? 'โหมดเชื่อมต่อ (กำลังใช้งาน)' : 'โหมดเชื่อมต่อ'}
        </button>

        <div className="flex items-center gap-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-0.5">
          <button
            onClick={() => setScale((s) => clamp(Number((s - 0.1).toFixed(2)), MIN_SCALE, MAX_SCALE))}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
            title="ย่อ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => clamp(Number((s + 0.1).toFixed(2)), MIN_SCALE, MAX_SCALE))}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
            title="ขยาย"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScale(1)}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
            title="รีเซ็ตการซูมกลับเป็น 100%"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1" />

        <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden lg:block">
          {connectMode
            ? pendingLinkFrom
              ? 'คลิกอุปกรณ์ปลายทางเพื่อปิดเส้น'
              : 'คลิกอุปกรณ์ต้นทางเพื่อเริ่มลากเส้น'
            : `${layout.nodes.length} อุปกรณ์ · ${layout.links.length} เส้นเชื่อม`}
        </span>

        <button
          onClick={onExport}
          disabled={layout.nodes.length === 0}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 disabled:opacity-40"
          title="บันทึกผังเป็นไฟล์ JSON"
        >
          <Download className="w-3.5 h-3.5" /> Export
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5"
          title="เปิดผังจากไฟล์ JSON ที่เคย Export ไว้"
        >
          <Upload className="w-3.5 h-3.5" /> Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImport(file);
            // ล้างค่าเพื่อให้เลือกไฟล์เดิมซ้ำแล้วยัง onChange อีกครั้ง
            e.target.value = '';
          }}
        />

        <button
          onClick={onClear}
          disabled={layout.nodes.length === 0}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 hover:bg-rose-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-40"
          title="เอาอุปกรณ์และเส้นเชื่อมทั้งหมดออกจากผังนี้ (ไม่ได้ลบตัวผัง)"
        >
          <Trash2 className="w-3.5 h-3.5" /> ล้างอุปกรณ์
        </button>
      </div>

      {/* พื้นที่วาด */}
      <div
        className={`relative overflow-auto bg-slate-50 dark:bg-slate-950/40 ${
          connectMode ? 'cursor-crosshair' : ''
        }`}
        style={{ height: 560 }}
        onDragOver={(e) => {
          // ต้อง preventDefault ที่ dragover ไม่งั้นเบราว์เซอร์จะไม่ยิง drop
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={handleDrop}
        onClick={() => {
          onSelectDevice(null);
          setPendingLinkFrom(null);
        }}
      >
        <div
          ref={contentRef}
          className="relative origin-top-left"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${scale})`,
            // ลายกริดช่วยให้เห็นว่าตำแหน่งถูกดูดเข้าเส้นกริด
            backgroundImage:
              'radial-gradient(circle, rgba(148,163,184,0.25) 1px, transparent 1px)',
            backgroundSize: `${GRID * 4}px ${GRID * 4}px`,
          }}
        >
          {/* ชั้นเส้นเชื่อม */}
          <svg className="absolute inset-0 pointer-events-none" width={CANVAS_W} height={CANVAS_H}>
            {layout.links.map((link) => {
              const a = nodeCenter(link.source);
              const b = nodeCenter(link.target);
              if (!a || !b) return null;
              const check = linkVerifications.get(link.id) ?? PENDING_VERIFICATION;
              return (
                <g key={link.id}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={VERDICT_COLOR[check.verdict]}
                    strokeWidth={2}
                    // เส้นประ = ยังไม่มีข้อมูลให้ตรวจ ต่างจากเทาทึบที่แปลว่าขัดแย้งจริง
                    strokeDasharray={check.verdict === 'unverified' ? '6 5' : undefined}
                    opacity={check.verdict === 'unverified' ? 0.7 : 1}
                  />
                  {/* เส้นโปร่งใสที่กว้างกว่า ทำหน้าที่เป็นพื้นที่คลิกเพื่อลบ */}
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="transparent"
                    strokeWidth={14}
                    style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveLink(link.id);
                    }}
                  >
                    <title>
                      {linkTitle(link)}
                      {'\n'}คลิกเพื่อลบเส้นเชื่อมนี้
                    </title>
                  </line>
                </g>
              );
            })}
          </svg>

          {/* กล่องอุปกรณ์ */}
          {layout.nodes.map((node) => {
            const device = deviceMap.get(node.deviceId);
            const Icon = deviceIcon(device?.kind ?? 'unknown');
            const isSelected = selectedDeviceId === node.deviceId;
            const isPending = pendingLinkFrom === node.deviceId;

            return (
              <div
                key={node.deviceId}
                style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
                className={`group absolute rounded-xl border-2 px-2.5 py-2 flex items-center gap-2 select-none transition-colors ${
                  connectMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
                } ${
                  isPending
                    ? 'border-blue-500 ring-4 ring-blue-500/20 bg-blue-500/10'
                    : isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/30 bg-white dark:bg-slate-900'
                    : device
                    ? 'border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 hover:border-blue-400/60'
                    : 'border-dashed border-rose-500/50 bg-rose-500/5'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNodeClick(node.deviceId);
                }}
                onPointerDown={(e) => {
                  if (connectMode || e.button !== 0) return;
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const p = toCanvasPoint(e.clientX, e.clientY);
                  dragRef.current = {
                    deviceId: node.deviceId,
                    offsetX: p.x - node.x,
                    offsetY: p.y - node.y,
                    startX: e.clientX,
                    startY: e.clientY,
                    moved: false,
                  };
                }}
                onPointerMove={(e) => {
                  const drag = dragRef.current;
                  if (!drag || drag.deviceId !== node.deviceId) return;
                  // ขยับไม่ถึง 4px ยังถือว่าเป็นการคลิก ไม่ใช่การลาก
                  if (
                    !drag.moved &&
                    Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 4
                  ) {
                    return;
                  }
                  if (!drag.moved) setDraggingId(node.deviceId);
                  drag.moved = true;
                  const p = toCanvasPoint(e.clientX, e.clientY);
                  onMoveNode(
                    node.deviceId,
                    clamp(snap(p.x - drag.offsetX), 0, CANVAS_W - NODE_W),
                    clamp(snap(p.y - drag.offsetY), 0, CANVAS_H - NODE_H)
                  );
                }}
                onPointerUp={(e) => {
                  const drag = dragRef.current;
                  dragRef.current = null;
                  if (drag?.moved) setDraggingId(null);
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                  // ถ้าลากจริง ให้กลืน click ที่จะตามมาไม่ให้ไปเปลี่ยนการเลือก
                  if (drag?.moved) e.stopPropagation();
                }}
              >
                <div className="relative shrink-0">
                  <Icon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${statusDot(
                      device?.status ?? 'unknown'
                    )}`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                    {device?.name ?? 'อุปกรณ์ที่หายไป'}
                  </p>
                  <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                    {device ? device.ipAddress || '—' : 'ไม่พบในผลการค้นหาล่าสุด'}
                  </p>
                </div>

                {/* รายการพอร์ตของอุปกรณ์ตัวนี้ โผล่เมื่อชี้เมาส์ที่กล่อง
                    ตั้งใจไม่ใส่สถานะ up/down เพราะสีของเส้นบนผังบอกไว้แล้ว */}
                {draggingId !== node.deviceId && (
                  <div className="hidden group-hover:block absolute left-0 top-full mt-2 z-30 w-max max-w-[280px] pointer-events-none rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 shadow-xl p-2.5 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      พอร์ตที่เชื่อมต่อ
                    </p>
                    {(interfacePeers.get(node.deviceId) ?? []).length === 0 ? (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        ยังไม่มีข้อมูลว่าพอร์ตไหนต่อกับอะไร
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {(interfacePeers.get(node.deviceId) ?? []).map((entry) => (
                          <div key={entry.port} className="flex items-baseline gap-1.5 text-[11px]">
                            <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0">
                              {entry.port}
                            </span>
                            <span className="text-slate-400 dark:text-slate-500 shrink-0">→</span>
                            <span className="text-slate-700 dark:text-slate-200 break-all">
                              {entry.peerName}
                              {entry.peerPort && (
                                <span className="font-mono text-slate-500 dark:text-slate-400">
                                  {' '}
                                  ({entry.peerPort})
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  // กล่องแม่จับ pointer ไว้ตอน pointerdown เพื่อใช้ลากย้ายตำแหน่ง
                  // ซึ่งทำให้ pointerup ถูกเปลี่ยนเป้าหมายไปที่กล่อง แล้ว click
                  // ไปตกที่กล่องแทนปุ่มนี้ จึงต้องกันไม่ให้ pointerdown ลอยขึ้นไป
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveNode(node.deviceId);
                  }}
                  className="shrink-0 p-0.5 rounded text-slate-400 hover:text-white hover:bg-rose-500 transition-colors"
                  title="เอาออกจากผัง"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          {/* สถานะว่าง */}
          {layout.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center max-w-sm px-6">
                <Cable className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  ยังไม่มีอุปกรณ์บนผัง
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ลากอุปกรณ์จากคลังทางซ้ายมาวางที่นี่ ระบบจะไม่สร้างผังให้อัตโนมัติ
                  เพื่อให้ผังสะท้อนการเชื่อมต่อจริงตามที่คุณกำหนดเอง
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* คำอธิบายการใช้งาน */}
      <div className="px-3 py-2 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400">
        <span>ลากกล่องเพื่อย้ายตำแหน่ง</span>
        <span>คลิกกล่องเพื่อดูรายละเอียดด้านล่าง</span>
        <span>คลิกเส้นเชื่อมเพื่อลบเส้นนั้น</span>
        <span className="flex items-center gap-1" title="LLDP/CDP ยืนยันว่าปลายสายถูกต้อง">
          <span className="w-4 h-0.5 bg-emerald-500 inline-block" /> ยืนยันแล้ว
        </span>
        <span className="flex items-center gap-1" title="พอร์ตที่ผูกกับเส้นนี้มีสถานะ down">
          <span className="w-4 h-0.5 bg-rose-500 inline-block" /> พอร์ตดับ
        </span>
        <span className="flex items-center gap-1" title="ข้อมูล LLDP/CDP ขัดแย้งกับเส้นที่วาดไว้">
          <span className="w-4 h-0.5 bg-slate-400 inline-block" /> ต่อผิด
        </span>
        <span
          className="flex items-center gap-1"
          title="ไม่มีข้อมูล LLDP/CDP ให้ตรวจสอบ — ไม่ได้แปลว่าต่อผิด"
        >
          <span className="w-4 border-t-2 border-dashed border-slate-500 inline-block" /> ยังไม่ยืนยัน
        </span>
      </div>
    </div>
  );
}
