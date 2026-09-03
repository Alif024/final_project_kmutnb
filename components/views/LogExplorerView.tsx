'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Server,
  Layers,
  AlertOctagon,
  Clock,
  Database,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { LogQuery, LogStreamId, LogTimeRange, SyslogEntry } from '@/types/ai-noc';
import {
  DEFAULT_LOG_QUERY,
  LOG_STREAMS,
  SEVERITY_META,
  TELEMETRY_NOW,
  TIME_RANGES,
  searchLogs,
} from '@/lib/log-source';

interface LogExplorerViewProps {
  /** Incident ที่ใช้เป็นเป้าของปุ่มลัด "เฉพาะหลักฐานของ Incident" */
  incidentId: string;
  /** ตัวกรองตั้งต้นเมื่อถูกเรียกจากหน้าอื่น (เช่น กด "ดู Log ทั้งหมด" จาก AI Analysis) */
  initialQuery?: Partial<LogQuery>;
  onNavigateTab: (tab: string, subtab?: string) => void;
}

/** สีของ badge ระดับความรุนแรง แยกตาม tone ของ RFC 5424 */
const TONE_CLASSES: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  error: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  notice: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  info: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30',
  debug: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20',
};

/** สีข้อความของ log แต่ละบรรทัดในตาราง */
const MESSAGE_CLASSES: Record<string, string> = {
  critical: 'text-red-600 dark:text-red-400 font-medium',
  error: 'text-rose-600 dark:text-rose-300',
  warning: 'text-amber-700 dark:text-amber-300',
  notice: 'text-slate-700 dark:text-slate-200',
  info: 'text-slate-600 dark:text-slate-300',
  debug: 'text-slate-500 dark:text-slate-400',
};

function toneOf(level: number): string {
  return SEVERITY_META[level]?.tone ?? 'info';
}

/** จำนวนข้อความสูงสุดที่แสดงต่อหนึ่งหน้าของตารางผลลัพธ์ */
const PAGE_SIZE = 20;

export default function LogExplorerView({
  incidentId,
  initialQuery,
  onNavigateTab,
}: LogExplorerViewProps) {
  const [query, setQuery] = useState<LogQuery>({ ...DEFAULT_LOG_QUERY, ...initialQuery });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [copiedQuery, setCopiedQuery] = useState(false);

  const result = useMemo(() => searchLogs(query), [query]);

  const rows = useMemo(
    () => (sortNewestFirst ? result.entries : [...result.entries].reverse()),
    [result.entries, sortNewestFirst]
  );

  // ---- การแบ่งหน้าของตารางผลลัพธ์ ----
  const [page, setPage] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [rows, page]
  );

  /** เลื่อนตารางกลับขึ้นบนสุดและยุบแถวที่กางอยู่ เมื่อชุดผลลัพธ์ที่เห็นเปลี่ยนไป */
  const resetListView = () => {
    setExpandedId(null);
    listRef.current?.scrollTo({ top: 0 });
  };

  /**
   * เปลี่ยนเงื่อนไขค้นหา — ต้องย้อนกลับไปหน้าแรกเสมอ ไม่งั้นผู้ใช้ที่ค้างอยู่หน้า 3
   * แล้วกรองจนเหลือผลลัพธ์ไม่ถึง 3 หน้า จะเจอตารางว่าง
   */
  const updateQuery = (next: LogQuery | ((q: LogQuery) => LogQuery)) => {
    setQuery(next);
    setPage(0);
    resetListView();
  };

  const goToPage = (next: number) => {
    setPage(Math.min(Math.max(next, 0), totalPages - 1));
    resetListView();
  };

  const activeFilterCount =
    query.severities.length +
    query.sources.length +
    query.streams.length +
    (query.search.trim() ? 1 : 0) +
    (query.range !== 'all' ? 1 : 0) +
    (query.incidentId ? 1 : 0);

  /** สลับค่าหนึ่งค่าในตัวกรองแบบเลือกได้หลายรายการ */
  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const resetQuery = () => updateQuery(DEFAULT_LOG_QUERY);

  const copyQuery = async () => {
    try {
      await navigator.clipboard.writeText(result.graylogQuery);
      setCopiedQuery(true);
      setTimeout(() => setCopiedQuery(false), 1500);
    } catch {
      // เบราว์เซอร์บล็อกคลิปบอร์ด — ไม่ต้องขัดจังหวะผู้ใช้ ปล่อยให้เลือกคัดลอกเองได้
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Log Explorer
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            ค้นหาและกรอง Syslog จากทุก Host/VM ที่ส่งเข้า Graylog (Centralized Log Search)
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-600 dark:text-slate-300 font-semibold">Graylog Collector</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono">1,240 msg/s</span>
          </div>
        </div>
      </div>

      {/* แถวหลักของหน้า — คอลัมน์ตัวกรองอยู่ซ้ายมือ ขนาบช่องค้นหา กราฟ และตารางผลลัพธ์
          บนจอใหญ่กำหนดความสูงของแถวให้พอดีกับพื้นที่ที่เหลือจริง เพื่อให้ทั้งหน้าไม่ต้อง
          เลื่อน เนื้อหาจึงไม่มีทางมุดใต้ TopBar/StatusBar ที่เป็น fixed และทั้งสองคอลัมน์
          จบที่เส้นเดียวกัน โดยการ์ดใบล่างสุดของแต่ละฝั่ง (Sources / ตารางผลลัพธ์)
          เป็นตัวยืดแล้วเลื่อนรายการอยู่ภายในตัวเอง

          ที่มาของตัวลบ — ทุกอย่างที่กินความสูงนอกเหนือจากแถวนี้:
            TopBar (pt-14 ของคอลัมน์เนื้อหา)            56px
            padding บนของ main (lg:p-8)                 32px
            บล็อกหัวข้อ + เส้นคั่น                       67px
            ช่องไฟใต้หัวข้อ (space-y-6)                  24px
            ระยะขอบท้ายหน้า (pb-16)                     64px
            padding ล่างของ main (lg:p-8)               32px
            StatusBar (pb-9 ของคอลัมน์เนื้อหา)           36px
            รวม 311px → ใช้ 21rem (336px) เผื่อไว้ 25px

          หมายเหตุ: ถ้าแก้ pb ของหน้าหรือขนาดหัวข้อ ต้องแก้ตัวลบตรงนี้ตามด้วย */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[calc(100vh-21rem)] lg:min-h-[420px]">
        {/* Left: Facet filters */}
        <aside className="lg:col-span-3 flex flex-col gap-4 lg:h-full">
          {/* Severity */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-lg shrink-0">
            <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2 mb-3">
              <AlertOctagon className="w-4 h-4 text-rose-500" />
              Severity (RFC 5424)
            </h3>
            <div className="space-y-1">
              {result.severityFacets.length === 0 && (
                <p className="text-[11px] text-slate-500 py-2">ไม่มีข้อมูลในเงื่อนไขนี้</p>
              )}
              {result.severityFacets.map((f) => {
                const level = Number(f.value);
                const active = query.severities.includes(level);
                return (
                  <button
                    key={f.value}
                    onClick={() => updateQuery((q) => ({ ...q, severities: toggle(q.severities, level) }))}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] border transition-colors ${
                      active
                        ? 'bg-blue-500/15 border-blue-500/40 text-slate-900 dark:text-white font-semibold'
                        : 'bg-transparent border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className={`px-1.5 py-0.5 rounded border text-[9px] font-bold font-mono ${
                          TONE_CLASSES[toneOf(level)]
                        }`}
                      >
                        {SEVERITY_META[level]?.label ?? level}
                      </span>
                      <span className="truncate">{f.label}</span>
                    </span>
                    <span className="font-mono text-slate-500 dark:text-slate-400 shrink-0">{f.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stream */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-lg shrink-0">
            <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2 mb-3">
              <Layers className="w-4 h-4 text-purple-500" />
              Streams
            </h3>
            <div className="space-y-1">
              {LOG_STREAMS.map((s) => {
                const facet = result.streamFacets.find((f) => f.value === s.id);
                const active = query.streams.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() =>
                      updateQuery((q) => ({ ...q, streams: toggle<LogStreamId>(q.streams, s.id) }))
                    }
                    title={s.description}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] border transition-colors ${
                      active
                        ? 'bg-purple-500/15 border-purple-500/40 text-slate-900 dark:text-white font-semibold'
                        : 'bg-transparent border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate">{s.label}</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400 shrink-0">
                      {facet?.count ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Source */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-lg flex flex-col lg:flex-1 lg:min-h-0">
            <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2 mb-3">
              <Server className="w-4 h-4 text-emerald-500" />
              Sources
            </h3>
            {/* รายการต้นทางเลื่อนอยู่ในการ์ด เพื่อให้ก้นการ์ดเสมอกับตารางผลลัพธ์ */}
            <div className="space-y-1 pb-1 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
              {result.sourceFacets.length === 0 && (
                <p className="text-[11px] text-slate-500 py-2">ไม่มีข้อมูลในเงื่อนไขนี้</p>
              )}
              {result.sourceFacets.map((f) => {
                const active = query.sources.includes(f.value);
                return (
                  <button
                    key={f.value}
                    onClick={() => updateQuery((q) => ({ ...q, sources: toggle(q.sources, f.value) }))}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] border transition-colors ${
                      active
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-slate-900 dark:text-white font-semibold'
                        : 'bg-transparent border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate font-mono">{f.label}</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400 shrink-0">{f.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Right: ช่องค้นหา + กราฟการกระจาย + ตารางผลลัพธ์ */}
        <div className="lg:col-span-9 flex flex-col gap-6 lg:h-full">
          {/* Search Bar + Time Range */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3 shadow-lg shrink-0">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query.search}
                  onChange={(e) => updateQuery((q) => ({ ...q, search: e.target.value }))}
                  placeholder="ค้นหาใน message, source, facility หรือ parsed field เช่น latency, postgres, 10.0.1.20"
                  className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                {query.search && (
                  <button
                    onClick={() => updateQuery((q) => ({ ...q, search: '' }))}
                    title="ล้างคำค้น"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Time Range */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/20 p-1 rounded-xl border border-slate-200 dark:border-white/10 shrink-0">
                <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ml-1.5" />
                {TIME_RANGES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => updateQuery((q) => ({ ...q, range: r.id as LogTimeRange }))}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                      query.range === r.id
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick filter chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">ตัวกรองด่วน:</span>

              <button
                onClick={() => updateQuery((q) => ({ ...q, severities: q.severities.length === 4 ? [] : [0, 1, 2, 3] }))}
                className={`px-2.5 py-1 rounded-lg text-[11px] border transition-colors ${
                  query.severities.length === 4
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-600 dark:text-rose-300 font-semibold'
                    : 'bg-slate-100 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                เฉพาะระดับ Error ขึ้นไป
              </button>

              <button
                onClick={() =>
                  updateQuery((q) => ({ ...q, incidentId: q.incidentId ? undefined : incidentId }))
                }
                className={`px-2.5 py-1 rounded-lg text-[11px] border transition-colors ${
                  query.incidentId
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-600 dark:text-purple-300 font-semibold'
                    : 'bg-slate-100 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                เฉพาะหลักฐานของ {incidentId}
              </button>

              <button
                onClick={() => {
                  setSortNewestFirst((v) => !v);
                  setPage(0);
                  resetListView();
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] border bg-slate-100 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                เรียง: {sortNewestFirst ? 'ใหม่ → เก่า' : 'เก่า → ใหม่'}
              </button>

              {activeFilterCount > 0 && (
                <button
                  onClick={resetQuery}
                  className="px-2.5 py-1 rounded-lg text-[11px] border border-slate-300 dark:border-white/20 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/40 transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> ล้างตัวกรองทั้งหมด ({activeFilterCount})
                </button>
              )}
            </div>

            {/* Graylog query echo */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 shrink-0 uppercase">Graylog Query</span>
              <code className="flex-1 text-[11px] font-mono text-slate-700 dark:text-slate-200 truncate">
                {result.graylogQuery}
              </code>
              <button
                onClick={copyQuery}
                title="คัดลอกคิวรีไปใช้ใน Graylog Web Interface"
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
              >
                {copiedQuery ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Result summary */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              <span>
                พบ <strong className="text-slate-900 dark:text-white">{result.matchedCount.toLocaleString()}</strong> จาก{' '}
                {result.totalCount.toLocaleString()} ข้อความ
              </span>
              <span>•</span>
              <span>ใช้เวลา {result.tookMs} ms</span>
              <span>•</span>
              <span>เวลาอ้างอิงล่าสุด {TELEMETRY_NOW}</span>
            </div>
          </div>

          {/* Histogram */}
          {result.histogram.length > 0 && (
            <div className="bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-lg shrink-0">
              <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                การกระจายตามช่วงเวลา (ช่วงละ 15 นาที)
                <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                  — แท่งสีแดงคือช่วงที่มี Log ระดับ Error ขึ้นไป
                </span>
              </h3>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.histogram}>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                      contentStyle={{
                        background: 'rgba(15,23,42,0.92)',
                        border: '1px solid rgba(148,163,184,0.3)',
                        borderRadius: 12,
                        fontSize: 11,
                        color: '#fff',
                      }}
                      // Recharts ใส่ inline color ให้บรรทัดหัวเรื่องและรายการเอง
                      // จึงต้องกำหนดสีขาวแยก ไม่งั้นจะกลายเป็นสีเข้มบนพื้นหลังเข้ม
                      labelStyle={{ color: '#fff', fontWeight: 700 }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value) => [value as number, 'จำนวนข้อความ']}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {result.histogram.map((b, idx) => (
                        <Cell key={idx} fill={b.errorCount > 0 ? '#EF4444' : '#3B82F6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Result table */}
          <div className="flex flex-col lg:flex-1 lg:min-h-0 bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl shadow-lg overflow-hidden">
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                ผลการค้นหา ({rows.length.toLocaleString()} ข้อความ)
              </h3>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                คลิกที่แถวเพื่อดูรายละเอียดและ Parsed Fields
              </span>
            </div>

            {/* จำกัดความสูงแล้วเลื่อนภายในตาราง เพื่อให้แถบตัวกรองด้านซ้ายยังอยู่ในสายตา */}
            {rows.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-500">
                <Database className="w-8 h-8" />
                <p className="text-xs">ไม่พบ Log ที่ตรงกับเงื่อนไข</p>
                <button
                  onClick={resetQuery}
                  className="mt-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition-colors"
                >
                  ล้างตัวกรอง
                </button>
              </div>
            ) : (
              <div
                ref={listRef}
                className="max-h-[640px] lg:max-h-none lg:flex-1 lg:min-h-0 overflow-y-auto pb-2 divide-y divide-slate-100 dark:divide-white/5"
              >
                {pageRows.map((log) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    expanded={expandedId === log.id}
                    onToggle={() => setExpandedId((id) => (id === log.id ? null : log.id))}
                    onFilterSource={() =>
                      updateQuery((q) => ({ ...q, sources: toggle(q.sources, log.sourceId) }))
                    }
                    onOpenDiagnosis={() => onNavigateTab('ai-analysis', 'diagnosis')}
                  />
                ))}
              </div>
            )}

            {/* แถบแบ่งหน้า — แสดงครั้งละไม่เกิน PAGE_SIZE ข้อความ */}
            {rows.length > 0 && (
              <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-t border-slate-200 dark:border-white/10">
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  แสดง {(page * PAGE_SIZE + 1).toLocaleString()}–
                  {(page * PAGE_SIZE + pageRows.length).toLocaleString()} จาก{' '}
                  {rows.length.toLocaleString()} ข้อความ
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 0}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/20 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-600"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> ก่อนหน้า
                  </button>

                  <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                    หน้า {page + 1} / {totalPages}
                  </span>

                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages - 1}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-blue-500/30 bg-blue-600/15 text-blue-600 dark:text-blue-300 hover:bg-blue-600/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600/15"
                  >
                    ถัดไป <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface LogRowProps {
  log: SyslogEntry;
  expanded: boolean;
  onToggle: () => void;
  onFilterSource: () => void;
  onOpenDiagnosis: () => void;
}

function LogRow({ log, expanded, onToggle, onFilterSource, onOpenDiagnosis }: LogRowProps) {
  const tone = toneOf(log.severityLevel);
  const fields = Object.entries(log.parsedFields ?? {});

  return (
    <div className={expanded ? 'bg-slate-50 dark:bg-black/20' : ''}>
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
      >
        <span className="mt-0.5 text-slate-400 shrink-0">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
        <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-bold shrink-0 w-16">
          {log.timestamp}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded border text-[9px] font-bold font-mono shrink-0 w-14 text-center ${TONE_CLASSES[tone]}`}
        >
          {SEVERITY_META[log.severityLevel]?.label ?? log.severityLevel}
        </span>
        <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400 shrink-0 w-32 truncate">
          {log.sourceName}
        </span>
        <span className={`flex-1 text-[11px] font-mono ${MESSAGE_CLASSES[tone]} ${expanded ? '' : 'truncate'}`}>
          {log.message}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pl-[4.75rem] space-y-3 text-[11px]">
          {/* Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'source', value: log.sourceName },
              { label: 'source_ip', value: log.sourceIp ?? '—' },
              { label: 'facility', value: log.facility },
              { label: 'level', value: `${log.severityLevel} (${SEVERITY_META[log.severityLevel]?.name ?? '—'})` },
            ].map((m) => (
              <div
                key={m.label}
                className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5"
              >
                <span className="block text-[9px] text-slate-500 dark:text-slate-400 font-mono">{m.label}</span>
                <span className="font-mono text-slate-900 dark:text-white">{m.value}</span>
              </div>
            ))}
          </div>

          {/* Parsed fields จาก Graylog Extractor */}
          {fields.length > 0 && (
            <div className="bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl p-3">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block mb-2">
                Parsed Fields (จาก Graylog Extractor)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {fields.map(([k, v]) => (
                  <span
                    key={k}
                    className="font-mono text-[10px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 rounded px-2 py-0.5"
                  >
                    {k} = {v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onFilterSource}
              className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              กรองเฉพาะ {log.sourceName}
            </button>

            {log.incidentId && (
              <button
                onClick={onOpenDiagnosis}
                className="px-2.5 py-1 rounded-lg text-[11px] bg-purple-600/15 border border-purple-500/30 text-purple-600 dark:text-purple-300 font-semibold hover:bg-purple-600/25 transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                เป็นหลักฐานของ {log.incidentId} — ดูการวิเคราะห์
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
