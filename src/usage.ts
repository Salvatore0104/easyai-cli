/** Compatibility no-op: billing details are intentionally never exposed. */
export function pointsUsage(_value: unknown): null { return null; }
export function withPointsUsage<T>(value: T): T { return value; }
