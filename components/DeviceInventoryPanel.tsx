'use client';

import React, { useMemo, useState } from 'react';
import {
  Cpu,
  Database,
  HardDrive,
  Layers,
  Network,
  Plus,
  RefreshCw,
  Router,
  Search,
  ShieldAlert,
} from 'lucide-react';
import {
  DiscoveredDevice,
  DiscoveredDeviceKind,
  DiscoveryMethod,
  DiscoverySourceStatus,
  HealthStatus,
} from '@/types/ai-noc';

/** ชนิดข้อมูลที่ใช้ส่งผ่าน HTML5 Drag and Drop ระหว่างคลังอุปกรณ์กับผัง */
export const DEVICE_DRAG_TYPE = 'application/x-ai-noc-device';

export function deviceIcon(kind: DiscoveredDeviceKind) {
  switch (kind) {
    case 'firewall':
      return ShieldAlert;
    case 'switch':
      return Network;
    case 'router':
      return Router;
    case 'hypervisor':
      return Cpu;
    case 'vm':
      return Layers;
    case 'storage':
      return Database;
    default:
      return HardDrive;
  }
}

export function statusDot(status: HealthStatus): string {
  switch (status) {
    case 'critical':
      return 'bg-rose-500';
    case 'warning':
      return 'bg-amber-500';
    case 'healthy':
      return 'bg-emerald-500';
    default:
      return 'bg-slate-500';
  }
}

const METHOD_LABELS: Record<DiscoveryMethod, string> = {
  snmp: 'SNMP',
  'zabbix-agent': 'Zabbix Agent',
  'hypervisor-api': 'Hypervisor API',
};

const METHOD_BADGE: Record<DiscoveryMethod, string> = {
  snmp: 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30',
  'zabbix-agent': 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30',
  'hypervisor-api': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
};

interface DeviceInventoryPanelProps {
  devices: DiscoveredDevice[];
  sources: DiscoverySourceStatus[];
  /** id ของอุปกรณ์ที่ถูกวางบนผังแล้ว — จะถูกทำให้จางและลากซ้ำไม่ได้ */
  placedIds: Set<string>;
  loading: boolean;
  error?: string;
  onRefresh: () => void;
  /** เพิ่มลงผังโดยไม่ต้องลาก (ปุ่ม + บนการ์ด) */
  onAddDevice: (deviceId: string) => void;
}

/**
 * คลังอุปกรณ์ที่ตรวจพบจากระบบเฝ้าระวังจริง
 *
 * ระบบไม่สร้างผังให้อัตโนมัติ — อุปกรณ์ทุกตัวจะรออยู่ในคลังนี้จนกว่าผู้ใช้
 * จะลากไปวางบนผังเอง (หรือกดปุ่ม + สำหรับผู้ที่ใช้คีย์บอร์ด/ทัชสกรีน)
 */
export default function DeviceInventoryPanel({
  devices,
  sources,
  placedIds,
  loading,
  error,
  onRefresh,
  onAddDevice,
}: DeviceInventoryPanelProps) {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | DiscoveryMethod>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return devices.filter((d) => {
      if (methodFilter !== 'all' && d.method !== methodFilter) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.ipAddress.toLowerCase().includes(q) ||
        (d.osOrVendor ?? '').toLowerCase().includes(q) ||
        (d.parentName ?? '').toLowerCase().includes(q)
      );
    });
  }, [devices, search, methodFilter]);

  const remaining = filtered.filter((d) => !placedIds.has(d.id)).length;

  return (
    <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col shadow-lg overflow-hidden max-h-[644px]">
      {/* หัวการ์ด */}
      <div className="p-4 border-b border-slate-200 dark:border-white/10 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">อุปกรณ์ที่ตรวจพบ</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {loading ? 'กำลังค้นหา...' : `${devices.length} อุปกรณ์ · ยังไม่ได้วาง ${remaining}`}
            </p>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
            title="ค้นหาอุปกรณ์ใหม่อีกครั้ง"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* สถานะของแต่ละต้นทาง */}
        <div className="space-y-1">
          {sources.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 text-[10px]">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.live ? 'bg-emerald-500' : 'bg-amber-500'}`}
                />
                <span className="truncate">{s.label}</span>
              </span>
              <span
                className={`shrink-0 font-semibold px-1.5 py-0.5 rounded border ${
                  s.live
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
                }`}
                title={s.error ?? 'เชื่อมต่อระบบจริงสำเร็จ'}
              >
                {s.live ? `จริง · ${s.deviceCount}` : `จำลอง · ${s.deviceCount}`}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-2 py-1.5">
            {error}
          </p>
        )}

        {/* ค้นหาและกรองตามวิธีที่ตรวจพบ */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อหรือ IP..."
            className="w-full bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {(['all', 'snmp', 'zabbix-agent', 'hypervisor-api'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
                methodFilter === m
                  ? 'bg-blue-600/80 text-white border-blue-400/30'
                  : 'bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {m === 'all' ? 'ทั้งหมด' : METHOD_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* รายการอุปกรณ์ */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-8">
            {loading ? 'กำลังค้นหาอุปกรณ์...' : 'ไม่พบอุปกรณ์ที่ตรงกับเงื่อนไข'}
          </p>
        ) : (
          filtered.map((device) => {
            const Icon = deviceIcon(device.kind);
            const placed = placedIds.has(device.id);

            return (
              <div
                key={device.id}
                draggable={!placed}
                onDragStart={(e) => {
                  e.dataTransfer.setData(DEVICE_DRAG_TYPE, device.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className={`group border rounded-xl p-2.5 transition-all ${
                  placed
                    ? 'border-slate-200 dark:border-white/5 bg-slate-100/60 dark:bg-white/[0.02] opacity-60'
                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-blue-500/50 hover:shadow-md cursor-grab active:cursor-grabbing'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="relative shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${statusDot(
                        device.status
                      )}`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{device.name}</p>
                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      {device.ipAddress || '— ไม่มี IP จากต้นทาง'}
                    </p>
                    {device.parentName && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        บน {device.parentName}
                      </p>
                    )}
                  </div>

                  {placed ? (
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 shrink-0 mt-0.5">
                      บนผังแล้ว
                    </span>
                  ) : (
                    <button
                      onClick={() => onAddDevice(device.id)}
                      className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-blue-600 transition-colors"
                      title="วางลงบนผัง"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  <span
                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${METHOD_BADGE[device.method]}`}
                  >
                    {METHOD_LABELS[device.method]}
                  </span>
                  {device.osOrVendor && (
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                      {device.osOrVendor}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className="px-3 py-2 border-t border-slate-200 dark:border-white/10 text-[10px] text-slate-500 dark:text-slate-400 text-center">
        ลากอุปกรณ์ไปวางบนผังทางขวาเพื่อสร้าง Topology
      </p>
    </div>
  );
}
