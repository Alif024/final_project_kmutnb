'use client';

import React, { useEffect, useState } from 'react';
import {
  Network,
  Server,
  Layers,
  Cpu,
  RefreshCw,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ShieldAlert,
  Database,
  Radio,
  Sliders,
  Terminal
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  Hypervisor,
  VirtualMachine,
  NetworkDevice,
  SyslogEntry,
  Alert,
  HealthStatus,
  DiscoveryResult,
  DiscoveredNeighbor
} from '@/types/ai-noc';
import DeviceInventoryPanel from '@/components/DeviceInventoryPanel';
import TopologyBuilder from '@/components/TopologyBuilder';
import { parseLayout, useTopologyLayout } from '@/hooks/use-topology-layout';
import { buildInterfacePeers } from '@/lib/interface-map';
import { verifyLinks } from '@/lib/link-verification';

interface InfrastructureViewProps {
  hypervisors: Hypervisor[];
  vms: VirtualMachine[];
  networkDevices: NetworkDevice[];
  syslogs: SyslogEntry[];
  recentAlerts: Alert[];
  initialSubTab?: string;
  onNavigateTab?: (tab: string, subtab?: string) => void;
}

// Shared status -> color mapping so a badge's color always matches the status text it shows
function statusClasses(status: HealthStatus) {
  switch (status) {
    case 'critical':
      return { icon: 'bg-rose-500/20 border-rose-500/30 text-rose-600 dark:text-rose-400', badge: 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/30' };
    case 'warning':
      return { icon: 'bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400', badge: 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30' };
    case 'healthy':
      return { icon: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30' };
    default:
      return { icon: 'bg-slate-500/20 border-slate-500/30 text-slate-500 dark:text-slate-400', badge: 'bg-slate-500/20 text-slate-600 dark:text-slate-300 border-slate-500/30' };
  }
}

function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

function usageColor(pct: number) {
  return pct >= 80 ? 'text-rose-600 dark:text-rose-300 border-rose-500' : pct >= 60 ? 'text-amber-600 dark:text-amber-300 border-amber-500' : 'text-emerald-600 dark:text-emerald-300 border-emerald-400';
}

export default function InfrastructureView({
  hypervisors,
  vms,
  networkDevices,
  syslogs,
  recentAlerts,
  initialSubTab = 'topology',
  onNavigateTab,
}: InfrastructureViewProps) {
  const [subTab, setSubTab] = useState<'topology' | 'monitoring'>(
    initialSubTab === 'monitoring' ? 'monitoring' : 'topology'
  );
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedHypervisorId, setSelectedHypervisorId] = useState<string>('hyp-01');
  const [nodeDetailTab, setNodeDetailTab] = useState<'overview' | 'interfaces' | 'performance' | 'logs' | 'alerts' | 'vm-info'>('overview');
  const [hypDetailTab, setHypDetailTab] = useState<'overview' | 'performance' | 'vms' | 'datastores' | 'alerts' | 'logs'>('overview');
  const [importError, setImportError] = useState<string | undefined>(undefined);
  /** พอร์ตที่กำลังเปิดช่องระบุปลายทางเอง (ทับค่าที่ LLDP/CDP ตรวจพบ) */
  const [overridingIface, setOverridingIface] = useState<string | null>(null);

  // ผลการค้นหาอุปกรณ์จาก Zabbix / vCenter / Proxmox ผ่าน API Route ฝั่ง Server
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(true);
  const [discoveryError, setDiscoveryError] = useState<string | undefined>(undefined);

  // ผังที่ผู้ใช้ลากวางเอง เก็บไว้ใน localStorage เพราะ View ถูก unmount ทุกครั้งที่สลับแท็บ
  const topology = useTopologyLayout();

  // เพิ่มค่านี้เพื่อสั่งให้ Effect ด้านล่างค้นหาอุปกรณ์รอบใหม่
  const [discoveryToken, setDiscoveryToken] = useState(0);

  const loadDevices = () => {
    setDiscoveryLoading(true);
    setDiscoveryError(undefined);
    setDiscoveryToken((t) => t + 1);
  };

  useEffect(() => {
    // View นี้ถูก unmount ทุกครั้งที่สลับแท็บ จึงต้องกันไม่ให้คำตอบที่มาช้า
    // ย้อนกลับมาเขียน State ของ Component ที่ถูกถอดออกไปแล้ว
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/discovery', { cache: 'no-store' });
        if (!res.ok) throw new Error(`เรียก /api/discovery ไม่สำเร็จ (HTTP ${res.status})`);
        const data = (await res.json()) as DiscoveryResult;
        if (!cancelled) setDiscovery(data);
      } catch (e) {
        if (!cancelled) setDiscoveryError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setDiscoveryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [discoveryToken]);

  const discoveredDevices = discovery?.devices ?? [];
  const discoverySources = discovery?.sources ?? [];
  const placedIds = new Set(topology.layout.nodes.map((n) => n.deviceId));

  /** วางอุปกรณ์ลงผังโดยไม่ต้องลาก — ไล่เรียงเป็นตารางจากมุมซ้ายบน */
  const addDeviceToCanvas = (deviceId: string) => {
    const i = topology.layout.nodes.length;
    topology.addNode(deviceId, 40 + (i % 6) * 190, 40 + Math.floor(i / 6) * 90);
  };

  const exportLayout = () => {
    const blob = new Blob([JSON.stringify(topology.layout, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // ใส่ชื่อผังลงในชื่อไฟล์ เพื่อให้แยกไฟล์ของแต่ละผังออกจากกันได้
    const safeName = topology.activeDiagram.name.replace(/[\\/:*?"<>|]/g, '-').trim();
    a.download = `ai-noc-topology-${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** นำผังจากไฟล์เข้ามาเป็นผังใบใหม่เสมอ เพื่อไม่ให้ทับผังที่เปิดอยู่ */
  const importLayout = async (file: File) => {
    try {
      const parsed = parseLayout(JSON.parse(await file.text()));
      if (!parsed) {
        setImportError('ไฟล์นี้ไม่ใช่ผัง Topology ของ AI-NOC (รูปแบบไม่ถูกต้อง)');
        return;
      }
      topology.importDiagram(parsed);
      setSelectedDeviceId(null);
      setImportError(undefined);
    } catch {
      setImportError('อ่านไฟล์ไม่สำเร็จ — ต้องเป็นไฟล์ JSON ที่ Export จากระบบนี้');
    }
  };

  // Performance sample data
  const perfData = [
    { t: '14:45', cpu: 45, mem: 60, sto: 75, ready: 1.2, latency: 5.2 },
    { t: '15:00', cpu: 52, mem: 65, sto: 78, ready: 2.1, latency: 12.4 },
    { t: '15:15', cpu: 65, mem: 72, sto: 81, ready: 4.8, latency: 38.6 },
    { t: '15:30', cpu: 62, mem: 70, sto: 80, ready: 3.5, latency: 32.1 },
    { t: '15:42', cpu: 65, mem: 72, sto: 81, ready: 4.8, latency: 38.6 },
  ];

  const selectedDevice = discoveredDevices.find((d) => d.id === selectedDeviceId) ?? null;
  const selectedHyp = hypervisors.find((h) => h.id === selectedHypervisorId) || hypervisors[0];

  // อุปกรณ์ที่ตรวจพบถูกโยงกลับไปหาเรกคอร์ดจริงในระบบด้วย IP ก่อน แล้วค่อยใช้ชื่อ
  // เพราะ API ของ Hypervisor บางตัวไม่คืน IP ของ Guest มาให้ (ต้องมี Guest Agent)
  const matchedVm = selectedDevice
    ? vms.find(
        (v) =>
          (!!selectedDevice.ipAddress && v.ipAddress === selectedDevice.ipAddress) ||
          v.name === selectedDevice.name
      )
    : undefined;
  const matchedVmHost = matchedVm ? hypervisors.find((h) => h.id === matchedVm.hypervisorId) : undefined;

  // อุปกรณ์เครือข่ายที่ค้นพบผ่าน SNMP มีข้อมูล Interface จริงให้แสดงในแท็บ Interfaces
  const matchedNetDevice = selectedDevice
    ? networkDevices.find(
        (n) =>
          (!!selectedDevice.ipAddress && n.ipAddress === selectedDevice.ipAddress) ||
          n.name === selectedDevice.name
      )
    : undefined;

  /**
   * เส้นเชื่อมของอุปกรณ์ที่เลือกอยู่บนผังปัจจุบัน ใช้บอกว่าพอร์ตไหนต่อกับอะไร
   * ผู้ใช้เลือกได้เฉพาะอุปกรณ์ที่ลากเส้นเชื่อมไว้แล้ว เพราะพอร์ตควรผูกกับสายที่มีจริง
   */
  const deviceLinks = selectedDevice
    ? topology.layout.links.filter(
        (l) => l.source === selectedDevice.id || l.target === selectedDevice.id
      )
    : [];

  /** ฝั่งตรงข้ามของเส้นเชื่อม เมื่อมองจากอุปกรณ์ที่เลือกอยู่ */
  const peerOfLink = (link: (typeof deviceLinks)[number]) =>
    link.source === selectedDevice?.id
      ? { id: link.target, port: link.targetInterface, myPort: link.sourceInterface }
      : { id: link.source, port: link.sourceInterface, myPort: link.targetInterface };

  const deviceNameOf = (id: string) =>
    discoveredDevices.find((d) => d.id === id)?.name ?? 'อุปกรณ์ที่หายไป';

  /** เพื่อนบ้าน LLDP/CDP ที่อุปกรณ์ซึ่งเลือกอยู่ประกาศไว้ */
  const deviceNeighbors = selectedDevice
    ? (discovery?.neighbors ?? []).filter((n) => n.localDeviceId === selectedDevice.id)
    : [];

  /**
   * จับชื่อ/IP ที่ปลายทางประกาศมา กลับไปหาอุปกรณ์ในระบบ
   * เทียบ IP ก่อนเพราะแม่นกว่า แล้วค่อยเทียบชื่อแบบไม่สนตัวพิมพ์
   */
  const matchNeighborDevice = (neighbor: DiscoveredNeighbor) => {
    if (neighbor.remoteMgmtIp) {
      const byIp = discoveredDevices.find((d) => d.ipAddress === neighbor.remoteMgmtIp);
      if (byIp) return byIp;
    }
    const wanted = neighbor.remoteSysName.toLowerCase();
    return discoveredDevices.find((d) => d.name.toLowerCase() === wanted);
  };

  const placedIdSet = placedIds;

  /**
   * ตรวจทุกเส้นบนผังที่เปิดอยู่เทียบกับ LLDP/CDP เพื่อกำหนดสีเส้นบนพื้นที่วาด
   * คำนวณที่นี่เพราะเป็นจุดเดียวที่มีครบทั้งผัง อุปกรณ์ที่ค้นพบ และข้อมูลพอร์ต
   */
  /** พอร์ตของแต่ละอุปกรณ์ว่าต่อกับเครื่องไหน สำหรับ tooltip บนกล่องในผัง */
  const interfacePeers = buildInterfacePeers({
    devices: discoveredDevices,
    neighbors: discovery?.neighbors ?? [],
    links: topology.layout.links,
  });

  const linkVerifications = verifyLinks(topology.layout.links, {
    devices: discoveredDevices,
    neighbors: discovery?.neighbors ?? [],
    networkDevices,
  });

  const nodeAlerts = selectedDevice
    ? recentAlerts.filter(
        (a) => (matchedVm && a.entityId === matchedVm.id) || a.entityName === selectedDevice.name
      )
    : [];

  // Syslog ของอุปกรณ์ที่เลือกอยู่ — จับคู่ผ่าน VM ที่ IP ตรงกัน หรือชื่อตรงกับ source
  const nodeLogs = selectedDevice
    ? syslogs.filter(
        (s) => (matchedVm && s.sourceId === matchedVm.id) || s.sourceName === selectedDevice.name
      )
    : [];

  const hypVms = vms.filter((v) => v.hypervisorId === selectedHyp.id);
  const hypAlerts = recentAlerts.filter((a) => a.entityId === selectedHyp.id || a.entityName === selectedHyp.name);
  const hypLogs = syslogs.filter((s) => s.sourceId === selectedHyp.id);

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-300">
      {/* SubTab Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Infrastructure</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subTab === 'topology'
              ? 'อุปกรณ์ที่ตรวจพบจาก Zabbix / vCenter / Proxmox — ลากวางเพื่อสร้างผังเอง (Manual Topology Builder)'
              : 'ติดตามสถานะอุปกรณ์เครือข่าย และ Hypervisor (Device & Hypervisor Monitoring)'}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-slate-950/60 backdrop-blur-md p-1 rounded-xl border border-slate-200 dark:border-white/10">
          <button
            onClick={() => setSubTab('topology')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'topology'
                ? 'bg-blue-600/80 text-white shadow-lg shadow-blue-500/20 border border-blue-400/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <Network className="w-4 h-4" />
            Infrastructure Topology
          </button>
          <button
            onClick={() => setSubTab('monitoring')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'monitoring'
                ? 'bg-blue-600/80 text-white shadow-lg shadow-blue-500/20 border border-blue-400/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <Server className="w-4 h-4" />
            Device & Hypervisor Monitoring
          </button>
        </div>
      </div>

      {/* SUBTAB 1: TOPOLOGY */}
      {subTab === 'topology' && (
        <div className="space-y-6">
          {importError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 rounded-xl px-4 py-2 text-xs">
              {importError}
            </div>
          )}

          {/* คลังอุปกรณ์ที่ตรวจพบ (ซ้าย) + พื้นที่วาดผังที่ผู้ใช้สร้างเอง (ขวา) */}
          <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-4">
            {/* ครอบด้วยกล่องตำแหน่งสัมพัทธ์ แล้วให้คลังอุปกรณ์ลอยเต็มกล่อง
                ความสูงของแถวจึงถูกกำหนดโดยพื้นที่วาดฝั่งขวาเพียงอย่างเดียว
                ไม่ใช่โดยจำนวนอุปกรณ์ในคลัง (จอเล็กกว่า lg ยังไหลตามปกติ) */}
            <div className="relative">
              <div className="lg:absolute lg:inset-0 lg:flex">
            <DeviceInventoryPanel
              devices={discoveredDevices}
              sources={discoverySources}
              placedIds={placedIds}
              loading={discoveryLoading}
              error={discoveryError}
              onRefresh={loadDevices}
              onAddDevice={addDeviceToCanvas}
            />
              </div>
            </div>

            <TopologyBuilder
              devices={discoveredDevices}
              layout={topology.layout}
              diagrams={topology.diagrams}
              activeDiagram={topology.activeDiagram}
              linkVerifications={linkVerifications}
              interfacePeers={interfacePeers}
              onSelectDiagram={(id) => {
                topology.selectDiagram(id);
                // อุปกรณ์ที่เลือกไว้อาจไม่มีอยู่ในผังใบใหม่ จึงล้างการเลือกทิ้ง
                setSelectedDeviceId(null);
              }}
              onCreateDiagram={() => {
                topology.createDiagram();
                setSelectedDeviceId(null);
              }}
              onDuplicateDiagram={topology.duplicateDiagram}
              onRenameDiagram={topology.renameDiagram}
              onDeleteDiagram={(id) => {
                topology.deleteDiagram(id);
                setSelectedDeviceId(null);
              }}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={setSelectedDeviceId}
              onAddNode={topology.addNode}
              onMoveNode={topology.moveNode}
              onRemoveNode={(id) => {
                topology.removeNode(id);
                if (selectedDeviceId === id) setSelectedDeviceId(null);
              }}
              onAddLink={topology.addLink}
              onRemoveLink={topology.removeLink}
              onClear={() => {
                topology.clearLayout();
                setSelectedDeviceId(null);
              }}
              onExport={exportLayout}
              onImport={importLayout}
            />
          </div>

          {/* แผงรายละเอียดของอุปกรณ์ที่เลือกอยู่บนผัง */}
          {!selectedDevice ? (
            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-8 text-center shadow-lg">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                ยังไม่ได้เลือกอุปกรณ์
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                คลิกกล่องอุปกรณ์บนผังเพื่อดูรายละเอียด เมตริก Alert และ Syslog ของอุปกรณ์นั้น
              </p>
            </div>
          ) : (
          <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold ${statusClasses(selectedDevice.status).icon}`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">{selectedDevice.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-bold uppercase ${statusClasses(selectedDevice.status).badge}`}>
                      {selectedDevice.status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{selectedDevice.ipAddress || '—'}</span>
                </div>
              </div>

              {/* Tabs for Node Detail Panel */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200 dark:border-white/10 overflow-x-auto">
                {(['overview', 'interfaces', 'performance', 'logs', 'alerts', 'vm-info'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setNodeDetailTab(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                      nodeDetailTab === t ? 'bg-blue-600/80 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {t === 'vm-info' ? 'VM Info' : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Detail Tab Contents */}
            {nodeDetailTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                {/* 1. Device Information */}
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-2.5">
                  <h4 className="font-bold text-slate-600 dark:text-slate-300 text-xs border-b border-slate-200 dark:border-white/10 pb-1.5 uppercase">
                    Device Information
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Type:</span> <span className="font-semibold text-slate-900 dark:text-white capitalize">{matchedVm ? `Virtual Machine (${matchedVm.role})` : selectedDevice.kind}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">IP Address:</span> <span className="font-mono text-slate-900 dark:text-white">{selectedDevice.ipAddress || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Vendor / Model:</span> <span className="font-semibold text-blue-600 dark:text-blue-400">{matchedVm?.vendorModel ?? '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Uptime:</span> <span className="text-slate-900 dark:text-white">{matchedVm ? formatUptime(matchedVm.uptimeSeconds) : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Location Host:</span> <span className="text-slate-900 dark:text-white">{matchedVmHost?.name ?? '—'}</span></div>
                  </div>
                </div>

                {/* 2. Resource Utilization */}
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-2.5">
                  <h4 className="font-bold text-slate-600 dark:text-slate-300 text-xs border-b border-slate-200 dark:border-white/10 pb-1.5 uppercase">
                    Resource Utilization
                  </h4>
                  {matchedVm ? (
                    <div className="grid grid-cols-3 gap-2 text-center py-1">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">CPU</span>
                        <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold mx-auto ${usageColor(matchedVm.cpuUsage)}`}>
                          {matchedVm.cpuUsage}%
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">Memory</span>
                        <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold mx-auto ${usageColor(matchedVm.memoryUsage)}`}>
                          {matchedVm.memoryUsage}%
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">Storage</span>
                        <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold mx-auto ${usageColor(matchedVm.storageUsage)}`}>
                          {matchedVm.storageUsage}%
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 py-3">อุปกรณ์นี้ไม่มีข้อมูลเมตริกระดับ VM ในระบบ</p>
                  )}
                </div>

                {/* 3. Status Summary */}
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-2.5">
                  <h4 className="font-bold text-slate-600 dark:text-slate-300 text-xs border-b border-slate-200 dark:border-white/10 pb-1.5 uppercase">
                    Status Summary
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">Overall Status:</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase border ${statusClasses(selectedDevice.status).badge}`}>
                        {selectedDevice.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">Active Alerts:</span>
                      <span className={`font-bold ${nodeAlerts.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {nodeAlerts.length} Alerts
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">Last Seen:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{matchedVm?.lastSeen ?? '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Tab */}
            {nodeDetailTab === 'performance' && (
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-3 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white">Performance Trend (ตัวอย่างข้อมูลย้อนหลัง 1 ชั่วโมง)</h4>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={perfData}>
                      <XAxis dataKey="t" stroke="#64748B" fontSize={10} />
                      <YAxis stroke="#64748B" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                      <Line type="monotone" dataKey="cpu" name="CPU %" stroke="#3B82F6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="mem" name="Memory %" stroke="#A855F7" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Alerts Tab */}
            {nodeDetailTab === 'alerts' && (
              <div className="space-y-2 text-xs">
                {nodeAlerts.length === 0 ? (
                  <p className="text-slate-500 py-4 text-center">ไม่มี Alert ที่เกี่ยวข้องกับอุปกรณ์นี้</p>
                ) : (
                  nodeAlerts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{a.title}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">{a.lastSeen}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize border ${statusClasses(a.severity === 'critical' ? 'critical' : a.severity === 'warning' ? 'warning' : 'unknown').badge}`}>
                        {a.severity}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* VM Info Tab */}
            {nodeDetailTab === 'vm-info' && (
              matchedVm ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex justify-between bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3"><span className="text-slate-500 dark:text-slate-400">Role:</span><span className="text-slate-900 dark:text-white font-semibold capitalize">{matchedVm.role}</span></div>
                  <div className="flex justify-between bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3"><span className="text-slate-500 dark:text-slate-400">Health:</span><span className="text-slate-900 dark:text-white font-semibold capitalize">{matchedVm.health}</span></div>
                  <div className="flex justify-between bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3"><span className="text-slate-500 dark:text-slate-400">I/O Wait:</span><span className="text-slate-900 dark:text-white font-semibold">{matchedVm.ioWaitPercent}%</span></div>
                  <div className="flex justify-between bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3"><span className="text-slate-500 dark:text-slate-400">Hypervisor Host:</span><span className="text-slate-900 dark:text-white font-semibold">{matchedVmHost?.name ?? '—'}</span></div>
                </div>
              ) : (
                <p className="text-slate-500 text-xs py-4 text-center">โหนดนี้ไม่ใช่ Virtual Machine จึงไม่มีข้อมูล VM Info</p>
              )
            )}

            {/* Logs Tab (Unified Syslog Viewer Aligned to NTP Time!) */}
            {nodeDetailTab === 'logs' && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between bg-white dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/10">
                  <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Unified Syslog (อ้างอิงเวลา NTP เดียวกันกับ Metric Telemetry)
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Syslog Collector Active
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl p-3 font-mono space-y-2 max-h-48 overflow-y-auto">
                  {nodeLogs.length === 0 ? (
                    <p className="text-slate-500 text-center py-4 font-sans">ไม่มี Syslog จากโหนดนี้</p>
                  ) : (
                    nodeLogs.map((log) => (
                      <div key={log.id} className="text-slate-500 dark:text-slate-400 flex items-start gap-3 border-b border-slate-200 dark:border-white/5 pb-1.5">
                        <span className="text-blue-600 dark:text-blue-400 shrink-0 font-bold">{log.timestamp}</span>
                        <span className="text-amber-600 dark:text-amber-400 shrink-0 font-bold">[{log.sourceName}]</span>
                        <span className={`flex-1 ${log.severityLevel <= 2 ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-700 dark:text-slate-200'}`}>
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => onNavigateTab?.('logs')}
                  className="w-full px-3 py-2 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-600 dark:text-blue-300 text-[11px] font-semibold hover:bg-blue-600/25 transition-colors"
                >
                  ค้นหา Log ทั้งหมดใน Log Explorer →
                </button>
              </div>
            )}

            {/* Interfaces Tab — ใช้ข้อมูลจริงของอุปกรณ์ที่ค้นพบผ่าน SNMP */}
            {nodeDetailTab === 'interfaces' && (
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-xs">
                {!matchedNetDevice ? (
                  <p className="text-slate-500 py-4 text-center">
                    อุปกรณ์นี้ไม่มีข้อมูล Interface — ระบบอ่านค่ารายพอร์ตได้เฉพาะอุปกรณ์เครือข่าย
                    ที่ค้นพบผ่าน SNMP เท่านั้น
                  </p>
                ) : (
                  <>
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                          <th className="pb-2">Interface</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2">Utilization</th>
                          <th className="pb-2">Packet Loss</th>
                          <th className="pb-2">เชื่อมกับ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {matchedNetDevice.interfaces.map((iface) => {
                          // เส้นเชื่อมที่ถูกผูกไว้กับพอร์ตนี้ (ถ้ามี) — ค่าที่ผู้ใช้กำหนดเอง
                          const link = deviceLinks.find((l) => peerOfLink(l).myPort === iface.name);
                          const peer = link ? peerOfLink(link) : null;
                          // ค่าที่อุปกรณ์ประกาศเองผ่าน LLDP/CDP
                          const detected = deviceNeighbors.find((n) => n.localInterface === iface.name);
                          const detectedDevice = detected ? matchNeighborDevice(detected) : undefined;
                          const linkForDetected =
                            detectedDevice && deviceLinks.some((l) => peerOfLink(l).id === detectedDevice.id);

                          // ค่าที่ผู้ใช้ระบุเองจะชนะค่าที่ตรวจพบ เมื่อทั้งสองไม่ตรงกัน
                          const usingManual = !!peer && (!detectedDevice || peer.id !== detectedDevice.id);
                          const detectedName = detectedDevice?.name ?? detected?.remoteSysName;
                          const shownName = usingManual && peer ? deviceNameOf(peer.id) : detectedName;
                          const editing = overridingIface === iface.name;

                          return (
                            <tr key={iface.name}>
                              <td className="py-2 font-mono text-slate-900 dark:text-white">{iface.name}</td>
                              <td
                                className={`py-2 font-bold ${
                                  iface.operStatus === 'up'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {iface.operStatus.toUpperCase()}
                              </td>
                              <td className="py-2 text-slate-900 dark:text-white">{iface.utilizationPercent}%</td>
                              <td
                                className={`py-2 font-bold ${
                                  iface.packetLossPercent > 0
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {iface.packetLossPercent}%
                              </td>
                              <td className="py-2 space-y-1 align-top">
                                {shownName ? (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                      {shownName}
                                    </span>
                                    {usingManual ? (
                                      <span
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30"
                                        title="ค่าที่ผู้ดูแลระบบระบุเอง"
                                      >
                                        กำหนดเอง
                                      </span>
                                    ) : (
                                      detected && (
                                        <span
                                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                                            detected.protocol === 'cdp'
                                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
                                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                                          }`}
                                          title="ตรวจพบอัตโนมัติจากที่อุปกรณ์ปลายทางประกาศตัวเอง"
                                        >
                                          {detected.protocol}
                                        </span>
                                      )
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-500 dark:text-slate-400">—</span>
                                )}

                                {/* รายละเอียดพอร์ตปลายทาง */}
                                {usingManual
                                  ? peer?.port && (
                                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                        พอร์ต {peer.port}
                                      </div>
                                    )
                                  : detected && (
                                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                        {detected.remotePortId
                                          ? `พอร์ต ${detected.remotePortId}`
                                          : 'ไม่ทราบพอร์ตปลายทาง'}
                                        {detected.remoteMgmtIp ? ` · ${detected.remoteMgmtIp}` : ''}
                                      </div>
                                    )}

                                {/* เตือนเมื่อค่าที่ระบุเองไม่ตรงกับที่อุปกรณ์ประกาศ */}
                                {usingManual && detectedName && (
                                  <div className="text-[10px] text-amber-600 dark:text-amber-400">
                                    {detected?.protocol.toUpperCase()} ระบุว่าเป็น {detectedName}
                                  </div>
                                )}

                                {/* สถานะ/การกระทำของค่าที่ตรวจพบ */}
                                {!usingManual && detected && !detectedDevice && (
                                  <div className="text-[10px] text-amber-600 dark:text-amber-400">
                                    ไม่อยู่ในรายการอุปกรณ์ที่ระบบค้นพบ
                                  </div>
                                )}
                                {!usingManual && detectedDevice && !placedIdSet.has(detectedDevice.id) && (
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                    ยังไม่ได้วางอุปกรณ์นี้บนผัง
                                  </div>
                                )}
                                {!usingManual &&
                                  detectedDevice &&
                                  !linkForDetected &&
                                  placedIdSet.has(detectedDevice.id) && (
                                    <button
                                      onClick={() =>
                                        topology.applyNeighborLink(
                                          selectedDevice.id,
                                          iface.name,
                                          detectedDevice.id,
                                          detected?.remotePortId
                                        )
                                      }
                                      className="text-[10px] font-semibold text-blue-600 dark:text-blue-300 hover:underline"
                                    >
                                      + เพิ่มเส้นเชื่อมนี้ลงผัง
                                    </button>
                                  )}

                                {/* ระบุเอง — ซ่อนไว้เมื่อมีค่าที่ตรวจพบแล้ว เพื่อไม่ให้ตารางรก */}
                                {deviceLinks.length > 0 &&
                                  (editing || !detected ? (
                                    <select
                                      autoFocus={editing}
                                      value={peer?.id ?? ''}
                                      onChange={(e) => {
                                        topology.assignInterface(
                                          selectedDevice.id,
                                          iface.name,
                                          e.target.value || null
                                        );
                                        setOverridingIface(null);
                                      }}
                                      className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50"
                                    >
                                      <option value="" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                                        {detected ? '— ใช้ค่าที่ตรวจพบ —' : '— ยังไม่ระบุ —'}
                                      </option>
                                      {deviceLinks.map((l) => {
                                        const other = peerOfLink(l);
                                        return (
                                          <option
                                            key={l.id}
                                            value={other.id}
                                            className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
                                          >
                                            {deviceNameOf(other.id)}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  ) : (
                                    <button
                                      onClick={() => setOverridingIface(iface.name)}
                                      className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:underline"
                                    >
                                      ระบุเอง
                                    </button>
                                  ))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
                      {deviceNeighbors.length > 0
                        ? `ปลายทางที่แสดงมาจากที่อุปกรณ์ประกาศตัวเองผ่าน LLDP/CDP (พบ ${deviceNeighbors.length} พอร์ต) — ถ้าสายจริงไม่ตรงกับที่ประกาศ ระบุทับเองได้จากช่องด้านล่างของแต่ละแถว`
                        : deviceLinks.length === 0
                        ? 'ยังไม่พบข้อมูล LLDP/CDP ของอุปกรณ์นี้ และยังไม่ถูกลากเส้นเชื่อมบนผัง — ลากเส้นบนผังก่อน แล้วกลับมาเลือกที่ช่อง "เชื่อมกับ"'
                        : 'ยังไม่พบข้อมูล LLDP/CDP ของอุปกรณ์นี้ จึงต้องระบุปลายทางเอง — เลือกได้เฉพาะอุปกรณ์ที่เชื่อมไว้บนผังแล้ว'}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: DEVICE & HYPERVISOR MONITORING */}
      {subTab === 'monitoring' && (
        <div className="space-y-6">
          {/* Hypervisor KPI Summary Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-1 shadow-lg">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Total Hypervisors</span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">6</span>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Healthy 5</span> · <span className="text-amber-600 dark:text-amber-400 font-bold">Warning 1</span>
              </div>
            </div>

            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-1 shadow-lg">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Total VMs</span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">128</span>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Running 102</span> · <span className="text-rose-600 dark:text-rose-400 font-bold">Stopped 26</span>
              </div>
            </div>

            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-1 shadow-lg">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Total vCPU</span>
              <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">256</span>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Used 152 (59%)</div>
            </div>

            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-1 shadow-lg">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Total Memory</span>
              <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 tabular-nums">1.02 TB</span>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Used 612 GB (58%)</div>
            </div>

            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-1 shadow-lg">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Total Storage</span>
              <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">12.4 TB</span>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Used 6.7 TB (54%)</div>
            </div>
          </div>

          {/* Hypervisors Table */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Hypervisor Hosts (VMware ESXi & Proxmox VE)
              </h3>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter host..."
                    className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                    <th className="pb-3 font-semibold">#</th>
                    <th className="pb-3 font-semibold">Hypervisor</th>
                    <th className="pb-3 font-semibold">Type / Version</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">CPU Usage</th>
                    <th className="pb-3 font-semibold">Memory Usage</th>
                    <th className="pb-3 font-semibold">Storage Usage</th>
                    <th className="pb-3 font-semibold">VMs</th>
                    <th className="pb-3 font-semibold">Alerts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {hypervisors.map((hyp, idx) => {
                    const isSelected = hyp.id === selectedHypervisorId;
                    return (
                      <tr
                        key={hyp.id}
                        onClick={() => setSelectedHypervisorId(hyp.id)}
                        className={`hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                          isSelected ? 'bg-slate-100 dark:bg-white/10 font-medium border-l-4 border-l-blue-500' : ''
                        }`}
                      >
                        <td className="py-3 font-mono text-slate-500 dark:text-slate-400">{idx + 1}</td>
                        <td className="py-3">
                          <div className="font-bold text-slate-900 dark:text-white">{hyp.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{hyp.ipAddress}</div>
                        </td>
                        <td className="py-3 text-slate-500 dark:text-slate-400">{hyp.version}</td>
                        <td className="py-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                              hyp.status === 'warning'
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {hyp.status}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-100 dark:bg-white/10 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                              <div
                                className={`h-full rounded-full ${hyp.cpuUsage >= 80 ? 'bg-rose-500' : 'bg-blue-500'}`}
                                style={{ width: `${hyp.cpuUsage}%` }}
                              ></div>
                            </div>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{hyp.cpuUsage}%</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-100 dark:bg-white/10 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                              <div
                                className="h-full rounded-full bg-purple-500"
                                style={{ width: `${hyp.memoryUsage}%` }}
                              ></div>
                            </div>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{hyp.memoryUsage}%</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-100 dark:bg-white/10 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                              <div
                                className="h-full rounded-full bg-emerald-400"
                                style={{ width: `${hyp.storageUsage}%` }}
                              ></div>
                            </div>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{hyp.storageUsage}%</span>
                          </div>
                        </td>
                        <td className="py-3 font-mono text-slate-900 dark:text-white">
                          {hyp.vmCount} / {hyp.vmCapacity}
                        </td>
                        <td className="py-3">
                          {hyp.alertCount > 0 ? (
                            <span className="text-rose-600 dark:text-rose-300 font-bold bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
                              {hyp.alertCount} Alerts
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Hypervisor Detail Panel with Specific Virtualization Metrics */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{selectedHyp.name}</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase border ${statusClasses(selectedHyp.status).badge}`}>
                    {selectedHyp.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {selectedHyp.ipAddress} · {selectedHyp.version}
                </p>
              </div>

              {/* Specific Virtualization Metric Cards (CPU Ready Time, Memory Ballooning, Storage Latency, Virtual Switch) */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                {(['overview', 'performance', 'vms', 'datastores', 'alerts', 'logs'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setHypDetailTab(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                      hypDetailTab === t ? 'bg-blue-600/80 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Overview Tab: Specific Virtualization Metrics Cards */}
            {hypDetailTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium block">CPU Ready Time</span>
                  <span className={`text-xl font-bold tabular-nums ${selectedHyp.cpuReadyTimePercent > 4 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {selectedHyp.cpuReadyTimePercent}%
                  </span>
                  <p className="text-[10px] text-slate-500">Threshold &lt; 5.0% (เวลารอคิว CPU)</p>
                </div>

                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium block">Memory Ballooning</span>
                  <span className={`text-xl font-bold tabular-nums ${selectedHyp.memoryBallooningMb > 500 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {selectedHyp.memoryBallooningMb} MB
                  </span>
                  <p className="text-[10px] text-slate-500">Reclaimed Memory from Guest</p>
                </div>

                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium block">Storage Latency</span>
                  <span className={`text-xl font-bold tabular-nums ${selectedHyp.storageLatencyMs > 10 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {selectedHyp.storageLatencyMs} ms
                  </span>
                  <p className="text-[10px] text-slate-500">Threshold &lt; 10 ms (Datastore I/O)</p>
                </div>

                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium block">vSwitch Dropped Packets</span>
                  <span className={`text-xl font-bold tabular-nums ${selectedHyp.vswitchDroppedPackets > 50 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {selectedHyp.vswitchDroppedPackets} pkts
                  </span>
                  <p className="text-[10px] text-slate-500">Virtual Switch Congestion</p>
                </div>
              </div>
            )}

            {/* Performance Tab: Line Chart over 1 Hour */}
            {hypDetailTab === 'performance' && (
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">Performance Metrics Trend (1 Hour)</h4>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={perfData}>
                      <XAxis dataKey="t" stroke="#64748B" fontSize={10} />
                      <YAxis stroke="#64748B" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                      <Line type="monotone" dataKey="cpu" name="CPU Usage %" stroke="#3B82F6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="mem" name="Memory Usage %" stroke="#A855F7" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="latency" name="Latency (ms)" stroke="#EF4444" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* VMs Tab: VMs hosted on this hypervisor */}
            {hypDetailTab === 'vms' && (
              <div className="space-y-2 text-xs">
                {hypVms.length === 0 ? (
                  <p className="text-slate-500 py-4 text-center">ไม่มี VM บน Host นี้</p>
                ) : (
                  hypVms.map((v) => (
                    <div key={v.id} className="flex items-center justify-between bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{v.name}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">{v.ipAddress} · {v.role}</p>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-blue-600 dark:text-blue-400">CPU {v.cpuUsage}%</span>
                        <span className="text-purple-600 dark:text-purple-400">Mem {v.memoryUsage}%</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase border ${statusClasses(v.health).badge}`}>{v.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Datastores Tab: this host's own storage capacity (mock data models one datastore per host) */}
            {hypDetailTab === 'datastores' && (
              <div className="bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-xs space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white">Datastore หลักของ {selectedHyp.name}</h4>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Capacity:</span><span className="text-slate-900 dark:text-white font-mono">{selectedHyp.usedStorageTb} / {selectedHyp.totalStorageTb} TB</span></div>
                <div className="w-full bg-slate-100 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${(selectedHyp.usedStorageTb / selectedHyp.totalStorageTb) * 100}%` }}></div>
                </div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Latency:</span><span className={selectedHyp.storageLatencyMs > 10 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>{selectedHyp.storageLatencyMs} ms</span></div>
              </div>
            )}

            {/* Alerts Tab */}
            {hypDetailTab === 'alerts' && (
              <div className="space-y-2 text-xs">
                {hypAlerts.length === 0 ? (
                  <p className="text-slate-500 py-4 text-center">ไม่มี Alert ที่เกี่ยวข้องกับ Host นี้</p>
                ) : (
                  hypAlerts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{a.title}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">{a.lastSeen}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize border ${statusClasses(a.severity === 'critical' ? 'critical' : a.severity === 'warning' ? 'warning' : 'unknown').badge}`}>
                        {a.severity}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Logs Tab */}
            {hypDetailTab === 'logs' && (
              <div className="bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl p-3 font-mono space-y-2 text-xs max-h-48 overflow-y-auto">
                {hypLogs.length === 0 ? (
                  <p className="text-slate-500 text-center py-4 font-sans">ไม่มี Syslog จาก Host นี้</p>
                ) : (
                  hypLogs.map((log) => (
                    <div key={log.id} className="text-slate-500 dark:text-slate-400 flex items-start gap-3 border-b border-slate-200 dark:border-white/5 pb-1.5">
                      <span className="text-blue-600 dark:text-blue-400 shrink-0 font-bold">{log.timestamp}</span>
                      <span className={`flex-1 ${log.severityLevel <= 2 ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-700 dark:text-slate-200'}`}>{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
