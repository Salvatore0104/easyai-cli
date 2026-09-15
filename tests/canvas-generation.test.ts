import { describe, expect, it } from "vitest";
import { canvasOutputSpec, canvasParameters } from "../src/canvas-generation.js";

describe("Canvas image specification bridge", () => {
  it("writes Canvas and canonical media image parameters", () => {
    expect(canvasParameters({ prompt: "frame", model: "GPT Image 2", aspect_ratio: "16:9", resolution: "2K", quality: "high" }, "image")).toMatchObject({
      aspectRatio: "16:9",
      size: "2K",
      imageGenParams: { aspect_ratio: "16:9", resolution: "2K", quality: "high" },
    });
  });

  it("reports an actual square result as a ratio mismatch", () => {
    expect(canvasOutputSpec({ data: { imageResultSizes: [{ width: 1254, height: 1254 }] } }, "16:9")).toMatchObject({ status: "mismatch", expectedAspectRatio: "16:9" });
    expect(canvasOutputSpec({ data: { imageResultSizes: [{ width: 2048, height: 1152 }] } }, "16:9")).toMatchObject({ status: "matched" });
  });
});
