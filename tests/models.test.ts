import { describe, expect, it } from "vitest";
import { access } from "node:fs/promises";
import { registry, routeModel, validateCapabilities } from "../src/models.js";
const catalog = { data: { items: registry.map(r => ({ id: r.id, modelName: r.modelName, enabled: true })) } };
describe("model routing", () => {
  it("selects defaults and explicit MiniMax without substitution", () => {
    expect(routeModel(catalog, "image").id).toBe("Nano Banana 2");
    expect(routeModel(catalog, "video").id).toBe("豆包Seedance-2.0");
    expect(routeModel(catalog, "video", "minimax").id).toBe("MiniMax-H3");
    expect(routeModel(catalog, "video", "Seedance 2.5").id).toBe("豆包Seedance-2.5");
    expect(routeModel(catalog, "video", "Wan3.0 Prime").id).toBe("Wan3.0-Video-Prime");
    expect(() => routeModel([], "image")).toThrow("unavailable");
    expect(() => routeModel(catalog, "image", "MiniMax-H3")).toThrow();
  });
  it("keeps 2.0 and 2.5 separate and bundles every guide", async () => {
    expect(routeModel(catalog, "video", "豆包Seedance-2.5").guide).not.toBe(routeModel(catalog, "video").guide);
    for (const entry of registry) await access(`skill/wowidea/${entry.guide}`);
    expect(registry.length).toBeGreaterThanOrEqual(12);
  });
  it("validates live limits instead of inheriting limits from a different version", () => {
    const selected = routeModel(catalog, "video"); selected.capabilities.capabilities = { omni_video: { duration_range: [4, 15], output_resolutions: ["720p"], output_audio: true, output_audio_mode: "always", supported_modes: ["text_to_video"] } };
    const payload = { duration: 9, resolution: "720p", aspect_ratio: "16:9", audio: true };
    expect(() => validateCapabilities(selected, payload)).not.toThrow();
    expect(() => validateCapabilities(selected, { ...payload, duration: 30 })).toThrow();
    expect(() => validateCapabilities(selected, { ...payload, audio: false })).toThrow();
    expect(() => validateCapabilities(selected, { ...payload, mode: "video_edit" })).toThrow();
  });
});
