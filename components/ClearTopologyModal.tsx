'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ClearTopologyModalProps {
  /** ชื่อผังที่กำลังจะถูกล้าง */
  diagramName: string;
  nodeCount: number;
  linkCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * ยืนยันก่อนล้างอุปกรณ์ทั้งหมดออกจากผังที่เปิดอยู่
 *
 * ระบบไม่มีปุ่มย้อนกลับ และผังถูกบันทึกทับทันทีที่แก้ไข การกดพลาดจึงเท่ากับ
 * เสียงานที่จัดวางไว้ทั้งหมด — จึงต้องถามก่อนเสมอ
 *
 * Parent (TopologyBuilder) mount เฉพาะตอนผู้ใช้กดปุ่ม จึงไม่ต้องเคลียร์ state เอง
 *
 * ต้อง portal ออกไปที่ <body> เพราะกล่องของ TopologyBuilder ใช้ `backdrop-blur`
 * ซึ่ง backdrop-filter ทำให้ element นั้นกลายเป็น containing block ของลูกที่เป็น
 * `position: fixed` — ถ้า render ไว้ข้างใน ฉากหลังจะคลุมแค่กล่องนั้นแทนทั้งหน้าจอ
 * (ตรวจแล้วพบว่าคลุมแค่ 878x700 จากจอ 1500x950)
 */
export default function ClearTopologyModal({
  diagramName,
  nodeCount,
  linkCount,
  onClose,
  onConfirm,
}: ClearTopologyModalProps) {
  // ปิดด้วยปุ่ม Esc เหมือน modal อื่นในระบบ
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const content = (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-950/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative text-slate-800 dark:text-slate-100">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-600 dark:text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">ยืนยันการล้างอุปกรณ์</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Clear all devices from this topology</p>
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
          <div className="bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">ผังที่จะถูกล้าง:</span>
            <span className="font-bold text-sm text-slate-900 dark:text-white block truncate">
              {diagramName}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">
              {nodeCount} อุปกรณ์ · {linkCount} เส้นเชื่อม
            </span>
          </div>

          <div className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300 bg-red-500/10 p-3 rounded-lg border border-red-500/30">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-red-600 dark:text-red-400">
                ตำแหน่งที่จัดวางและเส้นเชื่อมทั้งหมดจะหายไป และย้อนกลับไม่ได้
              </p>
              <p>
                ตัวผังยังอยู่ (ไม่ได้ถูกลบ) แต่จะกลายเป็นผังว่าง ต้องลากอุปกรณ์มาวางและ
                ลากเส้นใหม่ทั้งหมด — หากต้องการเก็บผังเดิมไว้ ให้กดยกเลิกแล้วใช้ปุ่ม Export
                บันทึกเป็นไฟล์ก่อน
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
            ยืนยันการล้าง
          </button>
        </div>
      </div>
    </div>
  );

  // Component นี้ถูก mount เมื่อผู้ใช้กดปุ่มเท่านั้น จึงไม่มีทาง render ฝั่ง Server
  // การเช็ค document ตรงนี้เป็นเพียงกันพลาด ไม่ได้ทำให้ HTML ไม่ตรงกันตอน Hydrate
  return typeof document === 'undefined' ? content : createPortal(content, document.body);
}
