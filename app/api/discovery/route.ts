import { NextResponse } from 'next/server';
import { discoverDevices } from '@/lib/device-discovery';

/**
 * GET /api/discovery — รายชื่ออุปกรณ์ที่ตรวจพบจาก Zabbix / vCenter / Proxmox
 *
 * ต้องเป็น API Route เพราะ Credential ของระบบต้นทางอยู่ใน Environment Variable
 * ฝั่ง Server เท่านั้น ห้ามให้ Client เรียกระบบเหล่านี้โดยตรง
 *
 * ผลลัพธ์เปลี่ยนตามสถานะอุปกรณ์จริง จึงห้าม Cache
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await discoverDevices();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Device Discovery API Error:', error);
    return NextResponse.json(
      {
        error: 'ไม่สามารถค้นหาอุปกรณ์ได้',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
