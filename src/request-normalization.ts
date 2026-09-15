import { CliError, ExitCode } from "./errors.js";

type MediaKind = "image" | "video";

const aliases: Array<[string, string[]]> = [
  ["aspect_ratio", ["aspectRatio", "ratio"]],
  ["output_format", ["outputFormat", "format"]],
  ["image_urls", ["imageUrls"]],
  ["video_urls", ["videoUrls"]],
  ["audio_urls", ["audioUrls"]],
  ["last_frame", ["lastFrame"]],
];

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function normalizeRatio(value: unknown): string {
  if (typeof value !== "string") throw new CliError("aspect_ratio must be a ratio such as 16:9.", ExitCode.Usage);
  if (value.trim().toLowerCase() === "adaptive") return "adaptive";
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*[:xX/]\s*(\d+(?:\.\d+)?)$/);
  if (!match) throw new CliError("aspect_ratio must be a ratio such as 16:9.", ExitCode.Usage);
  const width = Number(match[1]), height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new CliError("aspect_ratio must contain positive dimensions.", ExitCode.Usage);
  const standard: Array<[string, number]> = [["1:1", 1], ["3:2", 3 / 2], ["2:3", 2 / 3], ["4:3", 4 / 3], ["3:4", 3 / 4], ["5:4", 5 / 4], ["4:5", 4 / 5], ["16:9", 16 / 9], ["9:16", 9 / 16], ["21:9", 21 / 9], ["9:21", 9 / 21], ["2:1", 2], ["1:2", 1 / 2], ["3:1", 3], ["1:3", 1 / 3], ["4:1", 4], ["1:4", 1 / 4], ["8:1", 8], ["1:8", 1 / 8], ["7:4", 7 / 4], ["4:7", 4 / 7], ["3:5", 3 / 5], ["5:3", 5 / 3]];
  const ratio = width / height;
  const found = standard.find(([, expected]) => Math.abs(ratio - expected) / expected < 0.005);
  if (!found) throw new CliError(`Unsupported aspect ratio ${value}; use a standard ratio supported by the model.`, ExitCode.Usage);
  return found[0];
}

function dimensions(value: unknown): { width: number; height: number } | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d+)\s*[xX×]\s*(\d+)$/);
  if (!match) return null;
  const width = Number(match[1]), height = Number(match[2]);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) return null;
  return { width, height };
}

function resolutionFor(width: number, height: number): string {
  const longest = Math.max(width, height);
  if (longest >= 3000) return "4K";
  if (longest >= 1800) return "2K";
  return "1K";
}

/** Convert accepted aliases into the stable EasyAI request contract. */
export function normalizeRequest(payload: Record<string, any>, kind: MediaKind): Record<string, any> {
  const result = { ...payload };
  for (const [canonical, variants] of aliases) {
    for (const alias of variants) {
      if (result[alias] === undefined) continue;
      const equivalent = canonical === "aspect_ratio" && result[canonical] !== undefined
        ? normalizeRatio(result[canonical]) === normalizeRatio(result[alias])
        : same(result[canonical], result[alias]);
      if (result[canonical] !== undefined && !equivalent) throw new CliError(`${canonical} conflicts with ${alias}.`, ExitCode.Usage);
      result[canonical] = result[alias];
      delete result[alias];
    }
  }
  if (kind === "image" && result.size !== undefined) {
    const parsed = dimensions(result.size);
    if (parsed) {
      const ratio = normalizeRatio(`${parsed.width}:${parsed.height}`);
      const resolution = resolutionFor(parsed.width, parsed.height);
      if (result.aspect_ratio !== undefined && normalizeRatio(result.aspect_ratio) !== ratio) throw new CliError(`size=${result.size} conflicts with aspect_ratio=${result.aspect_ratio}.`, ExitCode.Usage);
      if (result.resolution !== undefined && String(result.resolution).toUpperCase() !== resolution.toUpperCase()) throw new CliError(`size=${result.size} conflicts with resolution=${result.resolution}.`, ExitCode.Usage);
      result.aspect_ratio = ratio;
      result.resolution = resolution;
    } else {
      // A ratio is accepted as a convenience alias, but provider-specific size names are not.
      result.aspect_ratio = normalizeRatio(result.size);
    }
    delete result.size;
  }
  if (result.aspect_ratio !== undefined) result.aspect_ratio = normalizeRatio(result.aspect_ratio);
  for (const field of ["quality", "output_format", "background"] as const) if (typeof result[field] === "string") result[field] = result[field].trim().toLowerCase();
  if (result.resolution !== undefined && typeof result.resolution === "string") {
    const imageTier = result.resolution.trim().toUpperCase();
    result.resolution = kind === "image" && ["1K", "2K", "4K"].includes(imageTier) ? imageTier : result.resolution.trim();
  }
  if (kind === "image") {
    if (result.n === undefined) result.n = 1;
    if (!Number.isInteger(result.n) || result.n < 1) throw new CliError("n must be a positive integer.", ExitCode.Usage);
  } else {
    if (result.watermark !== undefined && result.watermark !== false) throw new CliError('Video watermark must be false.', ExitCode.Usage);
    result.watermark = false;
  }
  return result;
}
