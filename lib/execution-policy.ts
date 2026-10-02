import { ApprovalRequest, UserRole } from '@/types/ai-noc';

/** ทุกคำสั่งต้องยืนยันด้วยคน โดยเฉพาะการรีสตาร์ทบริการสำคัญ เช่น DNS */
export function canManuallyExecute(request: ApprovalRequest, role: UserRole): boolean {
  return request.status === 'pending' &&
    (role === 'admin' || (role === 'engineer' && request.requiresRole === 'operator'));
}

/** ยังไม่อนุญาตให้เส้นทางอัตโนมัติรันคำสั่งใดในระบบ */
export function canAutoExecute(): boolean {
  return false;
}
