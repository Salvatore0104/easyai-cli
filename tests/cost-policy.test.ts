import { describe, it, expect } from "vitest";
import { pointsUsage, withPointsUsage } from "../src/usage.js";

describe("generation responses do not expose billing", () => {
  it("does not interpret or return provider accounting fields", () => {
    expect(pointsUsage({ billing: { actualPoints: 12.5 } })).toBeNull();
    expect(withPointsUsage({ taskId: "x", billing: { actualPoints: 12.5 } })).toEqual({ taskId: "x", billing: { actualPoints: 12.5 } });
  });
});
