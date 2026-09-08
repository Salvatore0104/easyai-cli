import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
describe("bundled Skill installer", () => {
  it("installs self-contained guides, preserves customizations and leaves account config alone", async () => {
    const dir = await mkdtemp(join(tmpdir(), "wowidea-install-test-"));
    const env = { ...process.env, EASYAI_CONFIG_DIR: join(dir, "config"), WOWIDEA_SKILLS_DIR: join(dir, "skills") };
    const run = () => JSON.parse(execFileSync(process.execPath, [resolve("scripts/install-skills.mjs")], { env, encoding: "utf8" }));
    try {
      expect(run().version).toBe("0.3.2");
      const config = join(dir, "config", "config.json"), skill = join(dir, "skills", "wowidea", "SKILL.md");
      await writeFile(config, '{"profiles":{"private":"keep unchanged"}}');
      const before = await readFile(config, "utf8");
      await writeFile(skill, "user custom instructions");
      const result = run();
      expect(result.preserved).toEqual([expect.objectContaining({ path: skill })]);
      expect(await readFile(skill, "utf8")).toBe("user custom instructions");
      expect(await readFile(config, "utf8")).toBe(before);
      expect(await readFile(join(dir, "skills", "wowidea", "references", "seedance-25.md"), "utf8")).toContain("2.5");
      const resources = JSON.parse(await readFile(join(dir, "skills", "wowidea", "resources.json"), "utf8"));
      for (const path of Object.keys(resources.files)) expect((await readFile(join(dir, "skills", path))).length).toBeGreaterThan(0);
      expect(await readFile(join(dir, "skills", "wowidea", "references", "upstream-lock.json"), "utf8")).toBe(await readFile(resolve("skill/wowidea/references/upstream-lock.json"), "utf8"));
      expect(await readFile(result.preserved[0].update, "utf8")).toContain("name: wowidea");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
