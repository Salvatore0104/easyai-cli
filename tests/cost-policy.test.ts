import { describe, it, expect } from "vitest";
import { pointsUsage, withPointsUsage } from "../src/usage.js";

describe("generation responses expose sourced billing", () => {
  it("preserves raw data and adds known accounting fields", () => {
    expect(pointsUsage({ billing: { actualPoints: 12.5 } }).actualPoints).toBe(12.5);
    expect(withPointsUsage({ taskId: "x", billing: { actualPoints: 12.5 } })).toMatchObject({ taskId: "x", billing: { actualPoints: 12.5 }, pointsUsage: { actualPoints: 12.5 } });
  });
});
