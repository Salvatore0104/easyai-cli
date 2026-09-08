import { describe, it, expect } from "vitest";
import { guideRegistry, guideInfo, showGuide } from "../src/guides.js";
import { isAbsolute } from "node:path";
import { routeModel } from "../src/models.js";

describe("installed creative resources", () => {
  it("locates and reads every guide without relying on cwd or authentication", async () => {
    for (const item of guideRegistry) {
      const guide = await showGuide(item.id);
      expect(isAbsolute(guide.path)).toBe(true);
      expect(guide.content.trim().length).toBeGreaterThan(30);
    }
    expect(() => guideInfo("../../private")).toThrow(/Unknown guide/);
  });
  it("keeps the old route interface and adds a real package guide", () => {
    const routed = routeModel([{ id: "MiniMax-H3" }], "video", "MiniMax");
    expect(routed.guide).toBe("references/minimax-h3.md");
    expect(routed.guideInfo.id).toBe("minimax-h3");
    expect(routed.guideInfo.version).toBe("0.3.0");
  });
});
