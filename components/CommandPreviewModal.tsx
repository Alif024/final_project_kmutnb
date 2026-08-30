'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, AlertTriangle, Terminal, CheckCircle2, X } from 'lucide-react';
import { ApprovalRequest } from '@/types/ai-noc';

interface CommandPreviewModalProps {
  request: ApprovalRequest | null;
  onClose: () => void;
  onConfirmApprove: (id: string, commandText: string) => void;
}

// Rendered with key={request?.id} by the parent, so React mounts a fresh
// instance (fresh isExecuting/executionSuccess state) per request instead of
// reusing one across different approval requests.
export default function CommandPreviewModal({
  request,
  onClose,
  onConfirmApprove,
}: CommandPreviewModalProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionSuccess, setExecutionSuccess] = useState(false);
  const pendingTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cancel any in-flight timers if the modal unmounts mid-execution.
  useEffect(() => {
    const timeouts = pendingTimeouts.current;
    return () => timeouts.forEach(clearTimeout);
  }, []);

  if (!request) return null;

  const handleConfirm = () => {
    setIsExecuting(true);
    const t1 = setTimeout(() => {
      setIsExecuting(false);
      setExecutionSuccess(true);
      const t2 = setTimeout(() => {
        onConfirmApprove(request.id, request.commandPreview);
        onClose();
      }, 1000);
      pendingTimeouts.current.push(t2);
    }, 1500);
    pendingTimeouts.current.push(t1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl relative text-slate-100">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">ตรวจสอบและยืนยันการรันคำสั่งจริง</h3>
              <p className="text-xs text-slate-400">Human-in-the-Loop Command Execution Preview</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Action Overview Box */}
          <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">รายการขออนุมัติ</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Confidence: {request.confidence}%
              </span>
            </div>
            <h4 className="font-bold text-base text-white">{request.actionTitle}</h4>
            <p className="text-xs text-slate-300">{request.reason}</p>
          </div>

          {/* Parameters Table */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {Object.entries(request.parameters).map(([key, value]) => (
              <div key={key} className="bg-black/30 p-2.5 rounded-lg border border-white/10">
                <span className="text-slate-400 block mb-0.5">{key}</span>
                <span className="font-semibold text-slate-200 font-mono">{value}</span>
              </div>
            ))}
          </div>

          {/* Command Terminal Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-purple-400" />
                คำสั่งที่จะรันบน Hypervisor / Service จริง:
              </span>
              <span className="text-[10px] text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> จะถูกบันทึกใน Audit Log
              </span>
            </div>
            <pre className="bg-black/60 border border-white/10 rounded-xl p-4 font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
              {request.commandPreview}
            </pre>
          </div>

          {/* Impact Warnings */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              การยืนยันนี้ถือเป็นคำอนุมัติขั้นสุดท้ายจากวิศวกรประจำศูนย์ NOC
            </div>
            <p className="text-[11px] text-amber-200/80">
              เมื่อกดปุ่มยืนยัน AI Agent จะทำการยิง API / SSH คำสั่งไปยังอุปกรณ์เป้าหมายทันที
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            disabled={isExecuting || executionSuccess}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isExecuting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                กำลังส่งคำสั่งรันระบบ...
              </>
            ) : executionSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                รันคำสั่งสำเร็จ!
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                ยืนยันอนุมัติและรันคำสั่งจริง
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
