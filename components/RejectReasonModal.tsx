'use client';

import React, { useState } from 'react';
import { AlertCircle, X, Ban } from 'lucide-react';
import { ApprovalRequest } from '@/types/ai-noc';

interface RejectReasonModalProps {
  request: ApprovalRequest | null;
  onClose: () => void;
  onConfirmReject: (id: string, reason: string) => void;
}

export default function RejectReasonModal({
  request,
  onClose,
  onConfirmReject,
}: RejectReasonModalProps) {
  const [reason, setReason] = useState('');
  const [selectedQuick, setSelectedQuick] = useState('');

  if (!request) return null;

  const quickReasons = [
    'ความเสี่ยงสูงเกินไปในช่วงเวลาที่มีการใช้งานหนาแน่น (Peak Hours)',
    'ต้องการตรวจสอบ Log และ Metrics เพิ่มเติมจากทีม Infrastructure',
    'AI Confidence ยังไม่สูงพอสำหรับสถานการณ์นี้',
    'วางแผนจะใช้วิธี Maintenance ในช่วงหลังเลิกงานแทน'
  ];

  const handleSelectQuick = (q: string) => {
    setSelectedQuick(q);
    setReason(q);
  };

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirmReject(request.id, reason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative text-slate-100">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Ban className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">ระบุเหตุผลในการปฏิเสธ</h3>
              <p className="text-xs text-slate-400">Mandatory Rejection Feedback for AI Model</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="bg-black/30 border border-white/10 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block">รายการที่จะปฏิเสธ:</span>
            <span className="font-bold text-sm text-white">{request.actionTitle}</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              เลือกเหตุผลด่วน (Quick Selection):
            </label>
            <div className="space-y-1.5">
              {quickReasons.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectQuick(q)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors border ${
                    selectedQuick === q
                      ? 'bg-red-500/20 text-red-300 border-red-500/40 font-medium'
                      : 'bg-black/20 text-slate-200 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>รายละเอียดเหตุผลเพิ่มเติม <span className="text-red-400">* (จำเป็นต้องระบุ)</span>:</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setSelectedQuick('');
              }}
              rows={3}
              placeholder="พิมพ์เหตุผลการปฏิเสธที่นี่..."
              className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
            ></textarea>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-black/20 p-2.5 rounded-lg border border-white/10">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>เหตุผลการปฏิเสธจะถูกบันทึกใน Audit Log และใช้ปรับปรุงความแม่นยำของ AI</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            disabled={!reason.trim()}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Ban className="w-4 h-4" />
            ยืนยันการปฏิเสธ
          </button>
        </div>
      </div>
    </div>
  );
}
