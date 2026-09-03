'use client';

import { useEffect, useRef, useState } from 'react';

export type ConnectionTestState = 'idle' | 'testing' | 'success';

/** หน่วงเวลาระหว่างบรรทัดของ log จำลอง (มิลลิวินาที) */
const STEP_DELAY_MS = 500;

/**
 * จำลองการทดสอบการเชื่อมต่อแบบไล่ log ทีละบรรทัดแล้วจบด้วยสถานะสำเร็จ
 *
 * ใช้ร่วมกันระหว่าง Add Integration Wizard (ขั้นตอนที่ 3) และปุ่ม Test Connection
 * บนการ์ดในหน้า Settings เพื่อให้ผลลัพธ์ที่ผู้ใช้เห็นเป็นรูปแบบเดียวกัน
 *
 * หมายเหตุ: ยังไม่มีการยิงไปยัง vCenter/Proxmox/Syslog/Webhook จริง
 */
export function useConnectionTest() {
  const [state, setState] = useState<ConnectionTestState>('idle');
  const [logs, setLogs] = useState<string[]>([]);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  // กัน setState หลัง unmount (เช่น ผู้ใช้สลับแท็บระหว่างที่ยังทดสอบไม่เสร็จ)
  useEffect(() => clearTimers, []);

  const runTest = (steps: string[], onSuccess?: () => void) => {
    clearTimers();
    setState('testing');
    setLogs([]);

    steps.forEach((line, idx) => {
      timersRef.current.push(
        setTimeout(() => setLogs((prev) => [...prev, line]), STEP_DELAY_MS * (idx + 1))
      );
    });

    timersRef.current.push(
      setTimeout(() => {
        setState('success');
        onSuccess?.();
      }, STEP_DELAY_MS * (steps.length + 1))
    );
  };

  const reset = () => {
    clearTimers();
    setState('idle');
    setLogs([]);
  };

  return { state, logs, runTest, reset };
}
