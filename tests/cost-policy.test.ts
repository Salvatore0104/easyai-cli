import { describe, expect, it } from "vitest";
import { requiresConfirmation, localQuote, type Quote } from "../src/preflight.js";
import { pointsUsage } from "../src/usage.js";
function quote(cost: number): Quote { return { ...localQuote("video", {}), source: "server", serverQuoteId: "quote", estimatedCost: cost }; }
describe("100 point confirmation policy", () => {
  it.each([0, 0.5, 99.99, 100])("does not ask at %s points", cost => expect(requiresConfirmation(quote(cost))).toBe(false));
  it.each([100.001, 101, 1000])("asks above the threshold at %s points", cost => expect(requiresConfirmation(quote(cost))).toBe(true));
  it("enforces a user-specified lower budget", () => expect(() => requiresConfirmation(quote(80), "50")).toThrow("exceeds limit"));
  it("does not treat unknown costs or other currency as cheap", () => {
    expect(() => requiresConfirmation(localQuote("image", {}))).toThrow();
    expect(() => requiresConfirmation({ ...quote(1), currency: "USD" })).toThrow();
  });
});
describe("actual charged points", () => {
  it("reports settlement including zero, not estimates or tokens", () => {
    expect(pointsUsage({ data: { billing: { actualPoints: 12.5 } } })).toMatchObject({ actualPoints: 12.5, status: "reported" });
    expect(pointsUsage({ usage: { charged_points: 0 } }).actualPoints).toBe(0);
    expect(pointsUsage({ estimatedCost: 10, balance: 100, usage: { total_tokens: 888 } })).toMatchObject({ actualPoints: null, status: "not_reported" });
    expect(pointsUsage({ actualCost: 1, currency: "USD" }).actualPoints).toBeNull();
  });
});
