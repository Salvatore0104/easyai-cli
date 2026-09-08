export interface PointsUsage { actualPoints: number | null; unit: "points"; status: "reported" | "not_reported"; source: string | null; message: string; }
// Only explicit task billing fields; estimates, tokens, reservations and balance deltas are not charges.
export function pointsUsage(value: unknown): PointsUsage {
  const pending: Array<{ value: any; path: string }> = [{ value, path: "task" }];
  for (let i = 0; i < pending.length && i < 32; i++) {
    const row = pending[i]!; const v = row.value;
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    for (const field of ["actualPoints", "actual_points", "chargedPoints", "charged_points", "consumedPoints", "consumed_points", "usedPoints", "used_points"]) {
      const amount = v[field];
      if (typeof amount === "number" && Number.isFinite(amount) && amount >= 0) return { actualPoints: amount, unit: "points", status: "reported", source: `${row.path}.${field}`, message: `本次实际使用 ${amount} 积分` };
    }
    if (["points", "point", "积分"].includes(String(v.currency || v.unit).toLowerCase()) && typeof v.actualCost === "number" && Number.isFinite(v.actualCost) && v.actualCost >= 0) return { actualPoints: v.actualCost, unit: "points", status: "reported", source: `${row.path}.actualCost`, message: `本次实际使用 ${v.actualCost} 积分` };
    for (const key of ["data", "result", "billing", "usage", "settlement"]) if (v[key]) pending.push({ value: v[key], path: `${row.path}.${key}` });
  }
  return { actualPoints: null, unit: "points", status: "not_reported", source: null, message: "平台未返回本任务实际使用积分，暂不可确认实扣金额" };
}
export function withPointsUsage(value: unknown): unknown {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...value, pointsUsage: pointsUsage(value) } : { result: value, pointsUsage: pointsUsage(value) };
}
