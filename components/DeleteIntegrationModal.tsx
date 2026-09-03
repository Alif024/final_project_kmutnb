'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Integration } from '@/types/ai-noc';
import { ACCENT_CLASSES, getIntegrationMeta } from '@/lib/integrations';

interface DeleteIntegrationModalProps {
  integration: Integration;
  onClose: () => void;
  onConfirmDelete: (id: string) => void;
}

/**
 * ยืนยันการลบการเชื่อมต่อ 1 รายการ
 *
 * Parent (SettingsView) mount เฉพาะตอนมีรายการที่เลือกจะลบ จึงไม่ต้องเคลียร์ state เอง
 */
export default function DeleteIntegrationModal({
  integration,
  onClose,
  onConfirmDelete,
}: DeleteIntegrationModalProps) {
  const meta = getIntegrationMeta(integration.type);

  // ปิดด้วยปุ่ม Esc เหมือน modal อื่นในระบบ
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleConfirm = () => {
    onConfirmDelete(integration.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-950/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative text-slate-800 dark:text-slate-100">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-600 dark:text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">ยืนยันการลบการเชื่อมต่อ</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Remove Integration from AI-NOC</p>
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

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl p-3 flex items-center gap-3">
            <div
              className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-xs border ${ACCENT_CLASSES[meta.accent].icon}`}
            >
              {meta.badge}
            </div>
            <div className="min-w-0">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">รายการที่จะลบ:</span>
              <span className="font-bold text-sm text-slate-900 dark:text-white block truncate">
                {integration.name}
              </span>
              <span
                className={`text-xs text-slate-500 dark:text-slate-400 block truncate ${
                  meta.targetIsUrl ? '' : 'font-mono'
                }`}
              >
                {integration.target}
                {integration.port ? `:${integration.port}` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300 bg-red-500/10 p-3 rounded-lg border border-red-500/30">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-red-600 dark:text-red-400">
                ระบบจะหยุดดึงข้อมูลจากปลายทางนี้ทันที
              </p>
              <p>
                {meta.supportsSync
                  ? 'Host/VM ที่ค้นพบผ่านการเชื่อมต่อนี้จะไม่ถูกอัปเดตอีก และ AI Engine จะขาดข้อมูลจากแหล่งดังกล่าว'
                  : 'ข้อมูล/การแจ้งเตือนจากปลายทางนี้จะไม่ถูกส่งเข้าระบบอีก'}{' '}
                หากต้องการใช้งานอีกครั้งต้องเพิ่มใหม่ผ่าน Add Integration Wizard
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            ยืนยันการลบ
          </button>
        </div>
      </div>
    </div>
  );
}
