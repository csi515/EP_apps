/**
 * 보드·상세 공통 상태 점 색 (퍼플/AI 팔레트 제거)
 */
import type { MboStatus } from '../domain/mboEngine';

export function mboStatusDotClass(status: MboStatus | string): string {
  if (status === 'completed') return 'bg-slate-500';
  if (status === 'in_progress' || status === 'approved') return 'bg-emerald-500';
  if (status === 'submitted') return 'bg-amber-500';
  if (status === 'rejected') return 'bg-rose-500';
  return 'bg-slate-400';
}
