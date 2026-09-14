import { describe, expect, it } from "vitest";
import { normalizeRequest } from "../src/request-normalization.js";
import { autoRoute } from "../src/routing.js";

const capability = {
  output_resolutions: ["1K", "2K", "4K"],
  aspect_ratio_allowed: ["1:1", "16:9", "9:16"],
  quality_allowed: ["low", "high"],
  output_format_allowed: ["png", "webp"],
  background_allowed: ["opaque", "transparent"],
  output_multiple_images: true,
  output_max_images_count: 4,
};
const catalog = { data: [{ id: "gpt-image-2.5-sunburst", capabilities: { image_generate: capability } }] };

describe("canonical request normalization", () => {
  it("turns the failed 3840x2160 request into portable EasyAI fields", () => {
    const result = autoRoute(catalog, { kind: "image", model: "gpt-image-2.5-sunburst", payload: { size: "3840x2160", quality: "high", output_format: "png" } });
    expect(result.payload).toMatchObject({ resolution: "4K", aspect_ratio: "16:9", n: 1 });
    expect(result.payload).not.toHaveProperty("size");
  });

  it("normalizes aliases and rejects conflicting intent", () => {
    expect(normalizeRequest({ aspect_ratio: "16:9", aspectRatio: "16x9", outputFormat: "PNG" }, "image")).toMatchObject({ aspect_ratio: "16:9", output_format: "png", n: 1 });
    expect(() => normalizeRequest({ size: "3840x2160", aspect_ratio: "1:1" }, "image")).toThrow(/conflicts/);
    expect(() => normalizeRequest({ aspect_ratio: "16:9", aspectRatio: "1:1" }, "image")).toThrow(/conflicts/);
    expect(() => normalizeRequest({ size: "wide" }, "image")).toThrow(/aspect_ratio/);
  });

  it("rejects unsupported capability fields and non-portable output counts", () => {
    expect(() => autoRoute(catalog, { kind: "image", model: "gpt-image-2.5-sunburst", payload: { quality: "ultra" } })).toThrow(/No model satisfies/);
    expect(() => autoRoute(catalog, { kind: "image", model: "gpt-image-2.5-sunburst", payload: { output_format: "jpg" } })).toThrow(/No model satisfies/);
    expect(() => autoRoute(catalog, { kind: "image", model: "gpt-image-2.5-sunburst", payload: { background: "auto" } })).toThrow(/No model satisfies/);
    expect(() => autoRoute(catalog, { kind: "image", model: "gpt-image-2.5-sunburst", payload: { n: 2 } })).toThrow(/No model satisfies/);
  });
});
