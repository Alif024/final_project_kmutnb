'use client';

import { useState } from 'react';
import { Terminal } from 'lucide-react';
import { ApprovalRequest, UserRole } from '@/types/ai-noc';
import { canManuallyExecute } from '@/lib/execution-policy';

export default function CommandPreview({ request, userRole, onConfirmApprove }: {
  request: ApprovalRequest;
  userRole: UserRole;
  onConfirmApprove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const allowed = canManuallyExecute(request, userRole);
  return (
    <section className="border-t border-slate-200 dark:border-white/10 pt-3">
      <button type="button" aria-expanded={expanded} aria-controls={`command-${request.id}`} onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 rounded-xl p-3 bg-slate-100 dark:bg-white/5 text-xs font-semibold text-slate-900 dark:text-white text-left">
        <Terminal className="w-4 h-4" /> ตัวอย่างคำสั่ง (Command Preview)
        <span className="ml-auto text-amber-700 dark:text-amber-300">Manual</span>
        <span aria-hidden="true">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div id={`command-${request.id}`} className="space-y-3 pt-3">
          <pre className="rounded-xl bg-slate-100 dark:bg-slate-950 p-4 text-xs text-emerald-700 dark:text-emerald-400 overflow-x-auto whitespace-pre-wrap break-words">{request.commandPreview}</pre>
          <p className="text-xs text-amber-700 dark:text-amber-300">ต้องยืนยันด้วยตนเองทุกครั้ง โดยเฉพาะการรีสตาร์ท DNS ซึ่งอาจทำให้บริการหยุดชั่วคราว</p>
          {request.status === 'pending' && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">{allowed ? 'การสาธิต: บันทึกผลใน Audit Log ยังไม่ส่งคำสั่งไปยังอุปกรณ์จริง' : request.requiresRole === 'admin' ? 'ต้องใช้สิทธิ์ Admin เพื่ออนุมัติคำสั่งนี้' : 'Viewer ดูตัวอย่างได้ แต่อนุมัติไม่ได้'}</p>
              <button disabled={!allowed} onClick={() => { if (canManuallyExecute(request, userRole)) onConfirmApprove(request.id); }} className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed">ยืนยันอนุมัติและจำลองการรัน</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
