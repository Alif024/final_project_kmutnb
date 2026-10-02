import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { formatLogsForPrompt, getCriticalLogsForContext } from "@/lib/log-source";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    // Log ระดับ Error ขึ้นไปจาก Graylog ใช้เป็นบริบทให้โมเดลอ้างอิงหลักฐานได้จริง
    const criticalLogs = getCriticalLogsForContext(20);
    const logContext = formatLogsForPrompt(criticalLogs);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback response if GEMINI_API_KEY is not set
      return NextResponse.json({
        reply: `[ระบบ AI-NOC Assistant - Mock Mode]
เนื่องจากยังไม่ได้ตั้งค่า GEMINI_API_KEY ในระบบ AI-NOC ขอตอบข้อมูลจากการประมวลผลภายใน:

คำถามของคุณ: "${message}"

**การวิเคราะห์ระบบเครือข่ายปัจจุบัน (AI-NOC Context):**
- ตรวจพบ **1 Critical Incident**: INC-2569-0524-0001 (Storage latency บน ESXi Host-01 = 38.6 ms)
- อุปกรณ์ที่ได้รับผลกระทบหลัก: ESXi-Host-01, Firewall-VM, ERP-VM
- คำแนะนำ: แนะนำให้ดำเนินการ Live Migration (vMotion) ERP-VM ไปยัง ESXi-Host-02 เพื่อลดผลกระทบ

**หลักฐานจาก Syslog บน Graylog (5 บรรทัดแรกจาก ${criticalLogs.length} บรรทัดที่ระดับ Error ขึ้นไป):**
${criticalLogs.slice(0, 5).map((log) => '- ' + formatLogsForPrompt([log])).join('\n')}`,
        citedEntities: ['ESXi-Host-01', 'Firewall-VM', 'ERP-VM']
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const systemPrompt = `คุณคือ AI-NOC Assistant (ปัญญาประดิษฐ์ประจำศูนย์ปฏิบัติการเครือข่ายเสมือน AI Network Operation Center)
ทำหน้าที่วิเคราะห์ปัญหา ตอบคำถามเชิงเทคนิค และเสนอแนะแนวทางแก้ไขสำหรับระบบ Virtualization (Proxmox VE / VMware ESXi) และระบบเครือข่าย

ข้อมูลบริบทปัจจุบันของระบบ (Real-time Telemetry Context):
- Hypervisors (6 hosts):
  1. ESXi-Host-01 (10.0.0.101): Status Warning, CPU 65%, Mem 72%, Storage 81%, Datastore Latency 38.6ms (CRITICAL), CPU Ready 4.8%
  2. ESXi-Host-02 (10.0.0.102): Status Healthy, CPU 28%, Mem 45%, Storage 62%
  3. Proxmox-Node-01 (10.0.0.201): Status Healthy, CPU 40%, Mem 58%, Storage 70%
  4. Proxmox-Node-02 (10.0.0.202): Status Healthy, CPU 33%, Mem 49%, Storage 55%
  5. Proxmox-Node-03 (10.0.0.203): Status Warning, CPU 62%, Mem 77%, Storage 83%
  6. ESXi-Host-03 (10.0.0.103): Status Healthy, CPU 25%, Mem 38%, Storage 46%
- Incident ล่าสุด: INC-2569-0524-0001 "Users cannot access ERP System" (Root Cause: Storage latency on ESXi Host-01, Confidence 96%)
- Affected VMs: Firewall-VM (10.0.0.1, CPU 92%, I/O Wait 28.4%), ERP-VM (10.0.1.20, Mem 88%, I/O Wait 45.2%)

Syslog ระดับ Error ขึ้นไปที่เก็บรวมศูนย์ไว้บน Graylog (เรียงตามเวลา NTP จริง):
${logContext}

หลักการตอบ:
1. ตอบเป็นภาษาไทยด้วย Markdown: ใช้หัวข้อ ### แยกสรุป สาเหตุ หลักฐาน และคำแนะนำ เว้นบรรทัดระหว่างหัวข้อและย่อหน้า
   ใช้รายการ - หรือรายการลำดับเลข และ **ตัวหนา** สำหรับค่าหรือประเด็นสำคัญ แต่ละย่อหน้าไม่เกิน 2–3 ประโยค
   ใส่คำสั่งใน fenced code block พร้อมระบุภาษา ห้ามรวมคำตอบทั้งหมดเป็นย่อหน้ายาวหรือครอบคำตอบทั้งหมดด้วย code block
2. ระบุสาเหตุ (Root Cause) พร้อมตัวเลขจริงและ threshold ในวงเล็บเสมอ
3. ให้คำแนะนำเป็นรายการข้อสั้นๆ พร้อมเครื่องหมาย ✅
4. หากผู้ใช้ถามเรื่องศัพท์เทคนิค เช่น CPU Ready Time, Memory Ballooning, Storage Latency ให้อธิบายอย่างเห็นภาพ
5. เมื่ออ้างถึงเหตุการณ์ใด ให้ยกบรรทัด Syslog ที่เกี่ยวข้องมาประกอบ พร้อมระบุเวลาและชื่อ Host/VM ต้นทาง
   และห้ามแต่งบรรทัด Log ที่ไม่มีอยู่ในบริบทข้างต้น`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: message,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
      }
    });

    const replyText = response.text || "ขออภัย ไม่สามารถประมวลผลคำตอบได้ในขณะนี้";

    return NextResponse.json({
      reply: replyText,
      citedEntities: ['ESXi Host-01', 'Firewall-VM', 'ERP-VM']
    });

  } catch (error: any) {
    console.error("AI Chat API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate response", details: error?.message },
      { status: 500 }
    );
  }
}
