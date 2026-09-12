import { EasyAiApi } from './api.js';
export interface PointsUsage {
  total: number | null; reserved: number | null; available: number | null;
  actualPoints: number | null; refundedPoints: number | null;
  settlementStatus: 'provided' | 'pending' | 'unavailable';
  balanceStatus: 'available' | 'unavailable'; queriedAt: string; source: string;
}
const number = (v: unknown): number | null => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
export function pointsUsage(value: any): PointsUsage {
  const task = value?.task ?? value?.data?.task ?? value?.data ?? value;
  const billing = task?.billing ?? value?.billing;
  const actualPoints = number(billing?.actualPoints), refundedPoints = number(billing?.refundedPoints);
  return { total: null, reserved: null, available: null, actualPoints, refundedPoints,
    settlementStatus: billing?.status === 'pending' ? 'pending' : actualPoints !== null || refundedPoints !== null ? 'provided' : 'unavailable',
    balanceStatus: 'unavailable', queriedAt: new Date().toISOString(), source: 'task.billing; /v1/balance' };
}
export function withPointsUsage<T>(value: T) { return { ...(value as object), pointsUsage: pointsUsage(value) }; }
export async function usageResult(api: EasyAiApi, value: unknown) {
  const usage = pointsUsage(value);
  try {
    const response = await api.request<any>('GET', '/v1/balance', undefined, {}, 5000);
    const data = response?.data ?? response;
    usage.total = number(data?.total); usage.reserved = number(data?.balanceDetail?.reservedAmount);
    usage.available = number(data?.balanceDetail?.availableForNewTask);
    usage.balanceStatus = usage.total !== null ? 'available' : 'unavailable';
  } catch { /* Accounting is informational, never a generation gate. */ }
  return { ...(value && typeof value === 'object' ? value : { result: value }), pointsUsage: usage };
}
