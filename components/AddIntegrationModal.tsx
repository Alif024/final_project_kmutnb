'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Plus,
  Server,
  KeyRound,
  PlugZap,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { Integration, IntegrationDetail, IntegrationType } from '@/types/ai-noc';
import {
  ACCENT_CLASSES,
  INTEGRATION_TYPES,
  buildConnectionTestSteps,
  getIntegrationMeta,
} from '@/lib/integrations';
import { useConnectionTest } from '@/hooks/use-connection-test';
import ConnectionTestConsole from '@/components/ConnectionTestConsole';

interface AddIntegrationModalProps {
  existingIntegrations: Integration[];
  onClose: () => void;
  onAdd: (integration: Integration) => void;
}

type WizardStep = 1 | 2 | 3;

interface FormState {
  name: string;
  target: string;
  port: string;
  username: string;
  password: string;
  token: string;
  protocol: 'UDP' | 'TCP' | 'TLS';
  alertLevel: 'critical-high' | 'all';
}

const EMPTY_FORM: FormState = {
  name: '',
  target: '',
  port: '',
  username: '',
  password: '',
  token: '',
  protocol: 'UDP',
  alertLevel: 'critical-high',
};

// ยอมรับทั้ง IPv4 และ FQDN (ยังไม่ resolve จริง — ตรวจแค่รูปแบบ)
const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const FQDN_PATTERN = /^(?=.{1,253}$)([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

const inputClass =
  'w-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors';

/**
 * Add Integration Wizard — 3 ขั้นตอน: เลือกประเภท → กรอกรายละเอียด → ทดสอบและยืนยัน
 *
 * Parent (SettingsView) mount คอมโพเนนต์นี้เฉพาะตอนเปิด (conditional render)
 * เพื่อให้ทุกครั้งที่กด "เพิ่มการเชื่อมต่อ" ได้ state ใหม่ ไม่ค้างจากรอบก่อน
 *
 * หมายเหตุ: การทดสอบการเชื่อมต่อเป็นการจำลอง (ยังไม่มี Collector จริงให้เรียก)
 * ข้อมูลที่เพิ่มเก็บอยู่ใน React state เท่านั้น รีเฟรชหน้าแล้วจะกลับสู่ค่าเริ่มต้น
 */
export default function AddIntegrationModal({
  existingIntegrations,
  onClose,
  onAdd,
}: AddIntegrationModalProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedType, setSelectedType] = useState<IntegrationType | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  // การทดสอบการเชื่อมต่อ (จำลอง) ใช้ตรรกะเดียวกับปุ่ม Test Connection บนการ์ด
  const { state: testState, logs: testLogs, runTest, reset: resetTest } = useConnectionTest();

  // ปิดด้วยปุ่ม Esc เหมือน modal อื่นในระบบ
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const meta = selectedType ? getIntegrationMeta(selectedType) : null;

  const handleSelectType = (type: IntegrationType) => {
    const typeMeta = getIntegrationMeta(type);
    setSelectedType(type);
    setErrors({});
    setForm({
      ...EMPTY_FORM,
      name: typeMeta.defaultName,
      port: typeMeta.defaultPort ?? '',
    });
    setStep(2);
  };

  // ค่าจากทุกช่องเป็น string (input/select) จึง cast กลับเป็น FormState ตรงจุดเดียว
  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value } as FormState));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateForm = (): boolean => {
    if (!meta) return false;
    const next: Partial<Record<keyof FormState, string>> = {};

    if (!form.name.trim()) next.name = 'กรุณาระบุชื่อการเชื่อมต่อ';

    const target = form.target.trim();
    if (!target) {
      next.target = 'กรุณาระบุปลายทางของการเชื่อมต่อ';
    } else if (meta.targetIsUrl) {
      if (!/^https?:\/\/.+/i.test(target)) {
        next.target = 'URL ต้องขึ้นต้นด้วย http:// หรือ https://';
      }
    } else if (!IPV4_PATTERN.test(target) && !FQDN_PATTERN.test(target)) {
      next.target = 'รูปแบบไม่ถูกต้อง (ต้องเป็น IPv4 เช่น 10.0.0.101 หรือ FQDN)';
    }

    // กันเพิ่มปลายทางซ้ำกับรายการที่มีอยู่แล้ว
    if (
      !next.target &&
      existingIntegrations.some(
        (i) => i.target.trim().toLowerCase() === target.toLowerCase()
      )
    ) {
      next.target = 'ปลายทางนี้ถูกเชื่อมต่ออยู่แล้วในระบบ';
    }

    if (meta.defaultPort) {
      const port = Number(form.port);
      if (!form.port.trim()) {
        next.port = 'กรุณาระบุพอร์ต';
      } else if (!Number.isInteger(port) || port < 1 || port > 65535) {
        next.port = 'พอร์ตต้องเป็นตัวเลข 1-65535';
      }
    }

    if (meta.needsCredentials) {
      if (!form.username.trim()) next.username = 'กรุณาระบุชื่อผู้ใช้';
      if (!form.password) next.password = 'กรุณาระบุรหัสผ่าน';
    }

    if (meta.type === 'webhook-notify' && !form.token.trim()) {
      next.token = 'กรุณาระบุ Access Token ของปลายทาง';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleNextFromForm = () => {
    if (!validateForm()) return;
    setStep(3);
  };

  const handleBack = () => {
    resetTest();
    setStep((prev) => (prev === 3 ? 2 : 1) as WizardStep);
  };

  const handleTestConnection = () => {
    if (!meta) return;
    runTest(
      buildConnectionTestSteps({
        type: meta.type,
        target: form.target.trim(),
        port: form.port.trim(),
        username: form.username.trim(),
        protocol: form.protocol,
      })
    );
  };

  const buildDetails = (tested: boolean, stamp: string): IntegrationDetail[] => {
    if (!meta) return [];
    const apiStatus: IntegrationDetail = tested
      ? { label: 'API Status:', value: '200 OK', tone: 'positive' }
      : { label: 'API Status:', value: 'ยังไม่ได้ทดสอบ', tone: 'default' };

    switch (meta.type) {
      case 'vmware-vcenter':
        return [
          apiStatus,
          { label: 'Last Sync:', value: tested ? 'เพิ่งเชื่อมต่อ' : 'ยังไม่เคย Sync', tone: 'strong' },
          { label: 'Managed Hosts:', value: 'รอ Sync ครั้งแรก', tone: 'strong' },
        ];
      case 'proxmox-ve':
        return [
          apiStatus,
          { label: 'Last Sync:', value: tested ? 'เพิ่งเชื่อมต่อ' : 'ยังไม่เคย Sync', tone: 'strong' },
          { label: 'Managed Nodes:', value: 'รอ Sync ครั้งแรก', tone: 'strong' },
        ];
      case 'syslog-metric':
        return [
          {
            label: 'Service:',
            value: `Syslog Listener (${form.protocol}/${form.port})`,
            tone: tested ? 'positive' : 'default',
          },
          { label: 'Ingestion Rate:', value: tested ? 'รอรับข้อมูลชุดแรก' : 'ยังไม่ได้ทดสอบ', tone: 'strong' },
          { label: 'เพิ่มเมื่อ:', value: stamp, tone: 'strong' },
        ];
      case 'webhook-notify':
      default:
        return [
          { label: 'Target:', value: form.target.trim(), tone: 'strong' },
          {
            label: 'Alert Level:',
            value: form.alertLevel === 'critical-high' ? 'Critical & High Only' : 'ทุกระดับความรุนแรง',
            tone: 'warning',
          },
          { label: 'เพิ่มเมื่อ:', value: stamp, tone: 'strong' },
        ];
    }
  };

  const handleAdd = () => {
    if (!meta) return;
    const tested = testState === 'success';
    const now = new Date();
    const stamp = `${now.toLocaleDateString('th-TH')} ${now.toLocaleTimeString('th-TH')}`;

    onAdd({
      id: `int-${meta.type}-${now.getTime().toString(36)}`,
      type: meta.type,
      name: form.name.trim(),
      target: form.target.trim(),
      port: meta.defaultPort ? form.port.trim() : undefined,
      username: meta.needsCredentials ? form.username.trim() : undefined,
      protocol: meta.type === 'syslog-metric' ? form.protocol : undefined,
      statusLabel: tested ? meta.connectedLabel : 'รอการทดสอบ',
      connectionState: tested ? 'connected' : 'pending',
      details: buildDetails(tested, stamp),
      addedAt: stamp,
    });
    onClose();
  };

  const stepTitles = ['เลือกประเภทการเชื่อมต่อ', 'กรอกรายละเอียดการเชื่อมต่อ', 'ทดสอบและยืนยัน'];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-950/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <PlugZap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">เพิ่มการเชื่อมต่อใหม่</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add Integration Wizard — ขั้นตอนที่ {step}/3: {stepTitles[step - 1]}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-white/10 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border transition-colors ${
                    step > s
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                      : step === s
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-100 dark:bg-black/30 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-white/10'
                  }`}
                >
                  {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                </span>
                <span
                  className={`text-[11px] font-semibold hidden sm:inline ${
                    step === s ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {stepTitles[s - 1]}
                </span>
              </div>
              {s < 3 && <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* STEP 1: เลือกประเภท */}
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {INTEGRATION_TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => handleSelectType(t.type)}
                  className={`text-left p-4 rounded-xl border transition-all flex items-start gap-3 ${
                    selectedType === t.type
                      ? ACCENT_CLASSES[t.accent].ring
                      : 'bg-slate-100 dark:bg-black/20 border-slate-200 dark:border-white/10 hover:bg-slate-200/60 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <div
                    className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-xs border ${
                      ACCENT_CLASSES[t.accent].icon
                    }`}
                  >
                    {t.badge}
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{t.label}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {t.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* STEP 2: กรอกรายละเอียด */}
          {step === 2 && meta && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl p-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border ${
                    ACCENT_CLASSES[meta.accent].icon
                  }`}
                >
                  {meta.badge}
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">ประเภทที่เลือก:</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{meta.label}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" /> ชื่อการเชื่อมต่อ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder={meta.defaultName}
                  className={inputClass}
                />
                {errors.name && <FieldError message={errors.name} />}
              </div>

              <div className={`grid grid-cols-1 ${meta.defaultPort ? 'sm:grid-cols-3' : ''} gap-3`}>
                <div className={`space-y-1.5 ${meta.defaultPort ? 'sm:col-span-2' : ''}`}>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    {meta.targetLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.target}
                    onChange={(e) => setField('target', e.target.value)}
                    placeholder={meta.targetPlaceholder}
                    className={`${inputClass} font-mono`}
                  />
                  {errors.target && <FieldError message={errors.target} />}
                </div>

                {meta.defaultPort && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                      พอร์ต <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.port}
                      onChange={(e) => setField('port', e.target.value)}
                      placeholder={meta.defaultPort}
                      className={`${inputClass} font-mono`}
                    />
                    {errors.port && <FieldError message={errors.port} />}
                  </div>
                )}
              </div>

              {meta.needsCredentials && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" /> ชื่อผู้ใช้ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.username}
                      onChange={(e) => setField('username', e.target.value)}
                      placeholder={meta.type === 'proxmox-ve' ? 'root@pam' : 'administrator@vsphere.local'}
                      className={`${inputClass} font-mono`}
                    />
                    {errors.username && <FieldError message={errors.username} />}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                      รหัสผ่าน / API Token <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setField('password', e.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                    />
                    {errors.password && <FieldError message={errors.password} />}
                  </div>
                </div>
              )}

              {meta.type === 'syslog-metric' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    โปรโตคอลที่ใช้รับ Log:
                  </label>
                  <select
                    value={form.protocol}
                    onChange={(e) => setField('protocol', e.target.value)}
                    className={`${inputClass} font-semibold`}
                  >
                    <option value="UDP" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">UDP (มาตรฐาน Syslog)</option>
                    <option value="TCP" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">TCP (รับประกันการส่งถึง)</option>
                    <option value="TLS" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">TLS (เข้ารหัสระหว่างทาง)</option>
                  </select>
                </div>
              )}

              {meta.type === 'webhook-notify' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" /> Access Token <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={form.token}
                      onChange={(e) => setField('token', e.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                    />
                    {errors.token && <FieldError message={errors.token} />}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                      ระดับการแจ้งเตือนที่จะส่งออก:
                    </label>
                    <select
                      value={form.alertLevel}
                      onChange={(e) => setField('alertLevel', e.target.value)}
                      className={`${inputClass} font-semibold`}
                    >
                      <option value="critical-high" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Critical &amp; High เท่านั้น (แนะนำ)</option>
                      <option value="all" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">ทุกระดับความรุนแรง</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-black/20 p-2.5 rounded-lg border border-slate-200 dark:border-white/10">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>รหัสผ่านและ Token ใช้เฉพาะตอนทดสอบในเบราว์เซอร์ ไม่ถูกบันทึกลงรายการเชื่อมต่อ</span>
              </div>
            </div>
          )}

          {/* STEP 3: ทดสอบและยืนยัน */}
          {step === 3 && meta && (
            <div className="space-y-4">
              <div className="bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-500" /> สรุปข้อมูลการเชื่อมต่อ
                </h4>
                <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                  <SummaryRow label="ประเภท:" value={meta.label} />
                  <SummaryRow label="ชื่อ:" value={form.name.trim()} />
                  <SummaryRow label={meta.targetIsUrl ? 'Webhook URL:' : 'ปลายทาง:'} value={form.target.trim()} mono />
                  {meta.defaultPort && <SummaryRow label="พอร์ต:" value={form.port.trim()} mono />}
                  {meta.needsCredentials && <SummaryRow label="ชื่อผู้ใช้:" value={form.username.trim()} mono />}
                  {meta.type === 'syslog-metric' && <SummaryRow label="โปรโตคอล:" value={form.protocol} mono />}
                  {meta.type === 'webhook-notify' && (
                    <SummaryRow
                      label="ระดับแจ้งเตือน:"
                      value={form.alertLevel === 'critical-high' ? 'Critical & High Only' : 'ทุกระดับความรุนแรง'}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    ผลการทดสอบการเชื่อมต่อ (จำลอง):
                  </span>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testState === 'testing'}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {testState === 'testing' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> กำลังทดสอบ...
                      </>
                    ) : (
                      <>
                        <PlugZap className="w-3.5 h-3.5" />
                        {testState === 'idle' ? meta.testLabel : 'ทดสอบอีกครั้ง'}
                      </>
                    )}
                  </button>
                </div>

                <ConnectionTestConsole
                  state={testState}
                  logs={testLogs}
                  idleMessage="ยังไม่ได้ทดสอบ — กดปุ่มด้านบนเพื่อตรวจสอบก่อนเพิ่มเข้าระบบ"
                  successMessage="การเชื่อมต่อสำเร็จ — พร้อมเพิ่มเข้าระบบ"
                />
              </div>

              {testState !== 'success' && (
                <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/30">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    หากเพิ่มโดยยังไม่ทดสอบ รายการจะถูกบันทึกด้วยสถานะ &ldquo;รอการทดสอบ&rdquo;
                    และยังไม่ถูกดึงข้อมูลเข้าระบบ
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 flex items-center justify-between gap-3">
          <button
            onClick={step === 1 ? onClose : handleBack}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5"
          >
            {step === 1 ? 'ยกเลิก' : (<><ChevronLeft className="w-4 h-4" /> ย้อนกลับ</>)}
          </button>

          {step === 2 && (
            <button
              onClick={handleNextFromForm}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-all flex items-center gap-1.5"
            >
              ถัดไป <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleAdd}
              disabled={testState === 'testing'}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> เพิ่มการเชื่อมต่อ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <span className="text-[11px] text-red-500 dark:text-red-400 flex items-center gap-1">
      <AlertCircle className="w-3.5 h-3.5" /> {message}
    </span>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span className={`text-slate-900 dark:text-white font-semibold text-right break-all ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}
