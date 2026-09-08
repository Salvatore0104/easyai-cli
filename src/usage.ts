// Billing is intentionally omitted from public CLI responses. The platform may still return
// provider-specific accounting fields internally; they are not interpreted or surfaced here.
export function pointsUsage(_value: unknown): null { return null; }
export function withPointsUsage(value: unknown): unknown { return value; }
