import { CliError, ExitCode } from "./errors.js";

export function videoSubmitTimeout(payload: Record<string, unknown>): number {
  // The live H3 route may hold POST until generation completes (~3 minutes in the smoke test).
  return /^MiniMax-H3(?:-Max)?$/i.test(String(payload.model)) ? 300_000 : 60_000;
}

// Translate the verified public CLI fields into EasyAI's native H3 content contract.
export function prepareVideoPayload(payload: Record<string, unknown>): Record<string, unknown> {
  if (!/^MiniMax-H3(?:-Max)?$/i.test(String(payload.model))) return payload;
  const mode = payload.mode || "text_to_video";
  if (mode !== "text_to_video" && mode !== "image_reference") return payload;
  if (typeof payload.prompt !== "string" || !payload.prompt.trim()) throw new CliError("H3 generation requires a non-empty prompt.", ExitCode.Usage);
  const refs = (key: string): string[] => {
    const value = payload[key];
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.some(url => typeof url !== "string" || !/^https?:\/\//.test(url))) throw new CliError(`H3 ${key} must contain HTTP(S) URLs.`, ExitCode.Usage);
    return value;
  };
  const images = refs("image_urls"), videos = refs("video_urls"), audios = refs("audio_urls");
  if (mode === "text_to_video" && (images.length || videos.length || audios.length)) throw new CliError("H3 text mode cannot contain references.", ExitCode.Usage);
  if (mode === "image_reference" && (!images.length || videos.length || audios.length)) throw new CliError("Verified H3 image_reference adapter requires images only; mixed media needs a separately verified adapter.", ExitCode.Usage);
  if (new Set(images).size !== images.length) throw new CliError("Duplicate H3 images would change provider reference numbering.", ExitCode.Usage);
  const nativeMode = mode === "image_reference" ? "omni_reference" : "text_to_video";
  if (payload.videoGenerateMode !== undefined && payload.videoGenerateMode !== nativeMode) throw new CliError("H3 native mode must match the approved CLI mode.", ExitCode.Usage);
  const content: Record<string, unknown>[] = [{ type: "text", text: payload.prompt }];
  for (const url of images) content.push({ type: "image_url", role: "reference_image", image_url: { url } });
  if (payload.content !== undefined && JSON.stringify(payload.content) !== JSON.stringify(content)) throw new CliError("H3 content must match the prompt and ordered reference arrays.", ExitCode.Usage);
  return { ...payload, ...(mode === "image_reference" ? { videoGenerateMode: nativeMode } : {}), content };
}
