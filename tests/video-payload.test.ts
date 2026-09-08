import { describe, it, expect } from "vitest";
import { prepareVideoPayload, videoSubmitTimeout } from "../src/video-payload.js";
describe("live H3 text contract", () => {
  it("allows H3 slow acceptance without changing other video timeouts", () => {
    expect(videoSubmitTimeout({ model: "MiniMax-H3" })).toBe(300000);
    expect(videoSubmitTimeout({ model: "MiniMax-H3-Max" })).toBe(300000);
    expect(videoSubmitTimeout({ model: "seedance-2.0" })).toBe(60000);
  });
  it("adds content without changing the prompt or billable settings", () => {
    const p = { model: "MiniMax-H3", mode: "text_to_video", prompt: "[Shot 1] Chrome waves", duration: 4, resolution: "720p", aspect_ratio: "16:9", audio: true, watermark: false };
    const result = prepareVideoPayload(p);
    expect(result).toEqual({ ...p, content: [{ type: "text", text: p.prompt }] });
    expect(prepareVideoPayload(result)).toEqual(result);
    expect(p).not.toHaveProperty("content");
  });
  it("does not invent reference mappings or accept hidden references in text content", () => {
    const p = { model: "MiniMax-H3", mode: "image_reference", image_urls: ["https://example.test/a.png"], prompt: "rotate" };
    expect(prepareVideoPayload(p)).toEqual({ ...p, videoGenerateMode: "omni_reference", content: [{ type: "text", text: "rotate" }, { type: "image_url", role: "reference_image", image_url: { url: p.image_urls[0] } }] });
    expect(() => prepareVideoPayload({ model: "MiniMax-H3", prompt: "rotate", content: [{ type: "image_url" }] })).toThrow(/must match/);
    expect(() => prepareVideoPayload({ model: "MiniMax-H3", prompt: " " })).toThrow(/non-empty/);
  });
});

it("keeps H3 image order and rejects conflicting or hidden references", () => {
  const p = { model: "MiniMax-H3", mode: "image_reference", prompt: "<Picture 1> then <Picture 2>", image_urls: ["https://example.test/b.png", "https://example.test/a.png"] };
  const result = prepareVideoPayload(p);
  expect((result.content as any[]).slice(1).map(x => x.image_url.url)).toEqual(p.image_urls);
  expect(prepareVideoPayload(result)).toEqual(result);
  expect(() => prepareVideoPayload({ ...p, videoGenerateMode: "first_last_frame" })).toThrow(/mode must match/);
  expect(() => prepareVideoPayload({ ...p, content: [] })).toThrow(/must match/);
  expect(() => prepareVideoPayload({ ...p, image_urls: [] })).toThrow(/requires images/);
  expect(() => prepareVideoPayload({ ...p, image_urls: [p.image_urls[0], p.image_urls[0]] })).toThrow(/Duplicate/);
  expect(() => prepareVideoPayload({ ...p, audio_urls: ["https://example.test/a.mp3"] })).toThrow(/mixed media/);
  expect(() => prepareVideoPayload({ ...p, mode: "text_to_video" })).toThrow(/cannot contain references/);
});
