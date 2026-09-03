/**
 * ชั้นเชื่อมต่อแหล่ง Log (Log Source Adapter)
 *
 * ทุกหน้าจอที่ต้องใช้ Log — Log Explorer, Log Evidence ในหน้า AI Analysis
 * และการป้อนบริบทให้ AI Chat — เรียกผ่านโมดูลนี้ที่เดียว ไม่อ่าน `mock-data.json`
 * โดยตรง เพื่อให้เปลี่ยนไปใช้ Graylog จริงได้โดยแก้เฉพาะไฟล์นี้
 *
 * สถานะปัจจุบัน: อ่านจากชุดข้อมูลจำลองใน `lib/mock-data.json`
 *
 * แผนต่อ Graylog จริง (Graylog REST API v5+):
 *   GET  /api/search/universal/relative
 *        ?query=<graylogQuery>&range=<วินาที>&limit=<n>&sort=timestamp:desc
 *        Header: Authorization: Basic base64(<token>:token), X-Requested-By: ai-noc
 *   - `buildGraylogQuery()` ด้านล่างสร้างสตริง query ตามไวยากรณ์ Graylog อยู่แล้ว
 *     จึงส่งต่อเข้าพารามิเตอร์ `query` ได้ทันที
 *   - ฟิลด์ที่ต้อง map กลับเป็น SyslogEntry: timestamp, source, facility, level,
 *     message, streams[] และ custom field ที่ผ่าน Extractor (parsedFields)
 *   - ให้เขียนเป็น API Route ฝั่ง Server (เช่น `app/api/logs/search/route.ts`)
 *     เพื่อไม่ให้ GRAYLOG_TOKEN หลุดไปฝั่ง Client
 */
import {
  LogFacet,
  LogHistogramBucket,
  LogQuery,
  LogSearchResult,
  LogStreamId,
  LogTimeRange,
  SyslogEntry,
} from '@/types/ai-noc';
import { MOCK_SYSLOGS } from './mock-data';

/**
 * เวลาอ้างอิง "ปัจจุบัน" ของชุด Telemetry จำลอง (24/05/2569 15:42:18)
 * ใช้เป็นจุดตั้งต้นของช่วงเวลาย้อนหลัง เพราะ Log จำลองเก็บเวลาเป็น HH:mm:ss
 * เมื่อเปลี่ยนไปใช้ Graylog จริงให้แทนที่ด้วย `Date.now()`
 */
export const TELEMETRY_NOW = '15:42:18';

/** ระดับความรุนแรงตาม RFC 5424 ที่ Graylog ใช้ในฟิลด์ `level` */
export const SEVERITY_META: Record<
  number,
  { name: string; label: string; tone: 'critical' | 'error' | 'warning' | 'notice' | 'info' | 'debug' }
> = {
  0: { name: 'Emergency', label: 'EMERG', tone: 'critical' },
  1: { name: 'Alert', label: 'ALERT', tone: 'critical' },
  2: { name: 'Critical', label: 'CRIT', tone: 'critical' },
  3: { name: 'Error', label: 'ERR', tone: 'error' },
  4: { name: 'Warning', label: 'WARN', tone: 'warning' },
  5: { name: 'Notice', label: 'NOTICE', tone: 'notice' },
  6: { name: 'Informational', label: 'INFO', tone: 'info' },
  7: { name: 'Debug', label: 'DEBUG', tone: 'debug' },
};

export const LOG_STREAMS: { id: LogStreamId; label: string; description: string }[] = [
  { id: 'stream-esxi', label: 'VMware ESXi', description: 'vmkernel, hostd, storage จาก ESXi Host' },
  { id: 'stream-proxmox', label: 'Proxmox VE', description: 'kernel, pvedaemon, pvestatd จาก PVE Node' },
  { id: 'stream-network', label: 'Network & Firewall', description: 'pfSense, pf, dpinger, interface' },
  { id: 'stream-app', label: 'Application / OS', description: 'nginx, postgresql, erp-app, named' },
  { id: 'stream-security', label: 'Security & IDS', description: 'suricata และ Alert ด้านความปลอดภัย' },
  { id: 'stream-ainoc', label: 'AI-NOC Engine', description: 'ผลวิเคราะห์ของ AI Engine และ Graylog เอง' },
];

export const TIME_RANGES: { id: LogTimeRange; label: string; seconds: number }[] = [
  { id: '15m', label: '15 นาที', seconds: 15 * 60 },
  { id: '1h', label: '1 ชั่วโมง', seconds: 60 * 60 },
  { id: '4h', label: '4 ชั่วโมง', seconds: 4 * 60 * 60 },
  { id: 'all', label: 'ทั้งหมด', seconds: 0 },
];

export const DEFAULT_LOG_QUERY: LogQuery = {
  search: '',
  severities: [],
  sources: [],
  streams: [],
  range: 'all',
};

/** แปลง "HH:mm:ss" เป็นจำนวนวินาทีนับจากเที่ยงคืน */
function toSeconds(time: string): number {
  const [h = 0, m = 0, s = 0] = time.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

function getStreamLabel(id?: LogStreamId): string {
  return LOG_STREAMS.find((s) => s.id === id)?.label ?? 'Unclassified';
}

/** Log ทั้งหมดในคลัง เรียงใหม่ล่าสุดขึ้นก่อน */
export function getAllLogs(): SyslogEntry[] {
  return [...MOCK_SYSLOGS].sort((a, b) => toSeconds(b.timestamp) - toSeconds(a.timestamp));
}

export function getLogsByIds(ids: string[]): SyslogEntry[] {
  const wanted = new Set(ids);
  return MOCK_SYSLOGS.filter((log) => wanted.has(log.id)).sort(
    (a, b) => toSeconds(a.timestamp) - toSeconds(b.timestamp)
  );
}

/** Log ของอุปกรณ์หนึ่งเครื่อง (Hypervisor หรือ VM) ใหม่ล่าสุดขึ้นก่อน */
export function getLogsForEntity(sourceId: string, limit?: number): SyslogEntry[] {
  const rows = getAllLogs().filter((log) => log.sourceId === sourceId);
  return typeof limit === 'number' ? rows.slice(0, limit) : rows;
}

/** Log ที่ถูกผูกไว้กับ Incident หนึ่ง เรียงตามเวลาเกิดจริง */
export function getIncidentLogs(incidentId: string): SyslogEntry[] {
  return MOCK_SYSLOGS.filter((log) => log.incidentId === incidentId).sort(
    (a, b) => toSeconds(a.timestamp) - toSeconds(b.timestamp)
  );
}

/**
 * แปลงเงื่อนไขการค้นหาเป็นสตริงคิวรีตามไวยากรณ์ของ Graylog
 * ใช้ทั้งแสดงให้ผู้ใช้เห็นในหน้า Log Explorer และส่งต่อ API จริงในอนาคต
 */
export function buildGraylogQuery(query: LogQuery): string {
  const clauses: string[] = [];

  const search = query.search.trim();
  if (search) {
    clauses.push(search.includes(' ') ? `message:"${search}"` : `message:*${search}*`);
  }
  if (query.severities.length > 0) {
    clauses.push(`level:(${[...query.severities].sort((a, b) => a - b).join(' OR ')})`);
  }
  if (query.sources.length > 0) {
    clauses.push(`source:(${query.sources.join(' OR ')})`);
  }
  if (query.streams.length > 0) {
    clauses.push(`streams:(${query.streams.join(' OR ')})`);
  }
  if (query.incidentId) {
    clauses.push(`incident_id:"${query.incidentId}"`);
  }

  return clauses.length > 0 ? clauses.join(' AND ') : '*';
}

function buildFacets(
  entries: SyslogEntry[],
  key: (log: SyslogEntry) => { value: string; label: string } | undefined
): LogFacet[] {
  const map = new Map<string, LogFacet>();

  entries.forEach((log) => {
    const item = key(log);
    if (!item) return;
    const existing = map.get(item.value);
    if (existing) existing.count += 1;
    else map.set(item.value, { value: item.value, label: item.label, count: 1 });
  });

  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** จัดกลุ่ม Log เป็นช่วงเวลาเท่าๆ กันสำหรับกราฟแท่งด้านบนตาราง */
function buildHistogram(entries: SyslogEntry[], bucketMinutes: number): LogHistogramBucket[] {
  if (entries.length === 0) return [];

  const times = entries.map((log) => toSeconds(log.timestamp));
  const bucketSize = bucketMinutes * 60;
  const first = Math.floor(Math.min(...times) / bucketSize) * bucketSize;
  const last = Math.floor(Math.max(...times) / bucketSize) * bucketSize;

  const buckets: LogHistogramBucket[] = [];
  for (let start = first; start <= last; start += bucketSize) {
    const inBucket = entries.filter((log) => {
      const t = toSeconds(log.timestamp);
      return t >= start && t < start + bucketSize;
    });
    const hh = String(Math.floor(start / 3600)).padStart(2, '0');
    const mm = String(Math.floor((start % 3600) / 60)).padStart(2, '0');
    buckets.push({
      label: `${hh}:${mm}`,
      count: inBucket.length,
      errorCount: inBucket.filter((log) => log.severityLevel <= 3).length,
    });
  }

  return buckets;
}

/**
 * ค้นหา Log ตามเงื่อนไข พร้อมคืนตัวเลือกกรอง (facets) และกราฟช่วงเวลา
 *
 * Facet count คำนวณจากผลลัพธ์ที่ผ่านเงื่อนไข "ด้านอื่น" แล้ว แต่ยังไม่ตัดด้วย
 * เงื่อนไขของตัวเอง เพื่อให้ผู้ใช้เห็นว่าถ้าเลือกตัวเลือกอื่นจะได้กี่รายการ
 * (พฤติกรรมเดียวกับแถบ Fields ของ Graylog)
 */
export function searchLogs(query: LogQuery): LogSearchResult {
  const all = getAllLogs();
  const nowSeconds = toSeconds(TELEMETRY_NOW);
  const rangeSeconds = TIME_RANGES.find((r) => r.id === query.range)?.seconds ?? 0;
  const search = query.search.trim().toLowerCase();

  const matchTime = (log: SyslogEntry) =>
    rangeSeconds === 0 || toSeconds(log.timestamp) >= nowSeconds - rangeSeconds;
  const matchSearch = (log: SyslogEntry) =>
    !search ||
    log.message.toLowerCase().includes(search) ||
    log.sourceName.toLowerCase().includes(search) ||
    log.facility.toLowerCase().includes(search) ||
    (log.sourceIp ?? '').includes(search) ||
    Object.entries(log.parsedFields ?? {}).some(
      ([k, v]) => k.toLowerCase().includes(search) || v.toLowerCase().includes(search)
    );
  const matchSeverity = (log: SyslogEntry) =>
    query.severities.length === 0 || query.severities.includes(log.severityLevel);
  const matchSource = (log: SyslogEntry) =>
    query.sources.length === 0 || query.sources.includes(log.sourceId);
  const matchStream = (log: SyslogEntry) =>
    query.streams.length === 0 || (!!log.stream && query.streams.includes(log.stream));

  const matchIncident = (log: SyslogEntry) =>
    !query.incidentId || log.incidentId === query.incidentId;

  const base = all.filter((log) => matchTime(log) && matchSearch(log) && matchIncident(log));
  const entries = base.filter((log) => matchSeverity(log) && matchSource(log) && matchStream(log));

  return {
    entries,
    totalCount: all.length,
    matchedCount: entries.length,
    histogram: buildHistogram(entries, 15),
    sourceFacets: buildFacets(
      base.filter((log) => matchSeverity(log) && matchStream(log)),
      (log) => ({ value: log.sourceId, label: log.sourceName })
    ),
    severityFacets: buildFacets(
      base.filter((log) => matchSource(log) && matchStream(log)),
      (log) => ({
        value: String(log.severityLevel),
        label: SEVERITY_META[log.severityLevel]?.name ?? `Level ${log.severityLevel}`,
      })
    ),
    streamFacets: buildFacets(
      base.filter((log) => matchSeverity(log) && matchSource(log)),
      (log) => (log.stream ? { value: log.stream, label: getStreamLabel(log.stream) } : undefined)
    ),
    // ค่าจำลองให้ดูเหมือนเวลา query ของ Graylog จริง (คิดจากปริมาณข้อมูลที่สแกน)
    tookMs: Math.max(3, Math.round(all.length * 0.4)),
    graylogQuery: buildGraylogQuery(query),
  };
}

/**
 * จัดรูป Log เป็นข้อความบรรทัดเดียวสำหรับป้อนเป็นบริบทให้ LLM
 * (ใช้ใน System Prompt ของ `/api/ai/chat`)
 */
export function formatLogsForPrompt(entries: SyslogEntry[]): string {
  return entries
    .map(
      (log) =>
        `[${log.timestamp}] ${SEVERITY_META[log.severityLevel]?.label ?? 'LOG'} ` +
        `${log.sourceName} (${log.facility}): ${log.message}`
    )
    .join('\n');
}

/**
 * Log ที่สำคัญที่สุดสำหรับสรุปสถานการณ์ให้ AI — เอาระดับ Error ขึ้นไป
 * เรียงตามเวลาจริงเพื่อให้โมเดลเห็นลำดับการลุกลาม
 */
export function getCriticalLogsForContext(limit = 20): SyslogEntry[] {
  return MOCK_SYSLOGS.filter((log) => log.severityLevel <= 3)
    .sort((a, b) => toSeconds(a.timestamp) - toSeconds(b.timestamp))
    .slice(0, limit);
}
