import { describe, it, expect } from "vitest";
import { guideRegistry, guideInfo, showGuide, promptSkills } from "../src/guides.js";
import { readFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { routeModel } from "../src/models.js";
const { version } = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

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
    expect(routed.guideInfo.version).toBe(version);
  });
});

it("resolves all model prompt entries from package metadata", async () => {
  for (const [id, name] of Object.entries(promptSkills)) {
    const info = guideInfo(id);
    expect(info.promptSkill).toBe(name);
    expect(isAbsolute(info.promptSkillPath!)).toBe(true);
    expect(await readFile(info.promptSkillPath!, "utf8")).toContain(`name: ${name}`);
  }
});
