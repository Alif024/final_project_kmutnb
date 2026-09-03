'use client';

import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { ConnectionTestState } from '@/hooks/use-connection-test';

interface ConnectionTestConsoleProps {
  state: ConnectionTestState;
  logs: string[];
  /** ข้อความตอนยังไม่ได้กดทดสอบ */
  idleMessage: string;
  /** ข้อความสรุปเมื่อทดสอบผ่าน */
  successMessage: string;
}

/**
 * กล่องแสดง log ผลการทดสอบการเชื่อมต่อ (จำลอง)
 * ใช้ทั้งใน Add Integration Wizard และการ์ด Integration ในหน้า Settings
 */
export default function ConnectionTestConsole({
  state,
  logs,
  idleMessage,
  successMessage,
}: ConnectionTestConsoleProps) {
  return (
    <div className="bg-slate-900 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl p-3 font-mono text-[11px] min-h-[92px] space-y-1">
      {state === 'idle' && logs.length === 0 && <span className="text-slate-400">{idleMessage}</span>}

      {logs.map((line, idx) => (
        <div key={idx} className="text-emerald-400 flex items-start gap-1.5">
          <span className="text-slate-500">$</span>
          <span>{line}</span>
        </div>
      ))}

      {state === 'testing' && (
        <div className="text-slate-400 flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> กำลังตรวจสอบ...
        </div>
      )}

      {state === 'success' && (
        <div className="text-emerald-300 font-bold flex items-center gap-1.5 pt-1">
          <Check className="w-3.5 h-3.5" /> {successMessage}
        </div>
      )}
    </div>
  );
}
