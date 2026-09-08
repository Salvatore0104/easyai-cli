import { CliError, ExitCode } from "./errors.js";
import { taskRows } from "./submission.js";

export const registry = [
  ["Nano Banana 2", "image_nanoBanana2", "image", "nano-banana"],
  ["Nano Banana Pro", "image_nanoBanana_pro", "image", "nano-banana"],
  ["Nano Banana 2 Lite", "image_nanoBanana2Lite", "image", "nano-banana"],
  ["GPT Image 2", "gpt-image-2", "image", "gpt-image"],
  ["MiniMax-H3", "MiniMax-H3", "video", "minimax-h3"],
  ["MiniMax-H3-Max", "MiniMax-H3-Max", "video", "minimax-h3"],
  ["Google Omni", "video_google_omni", "video", "google-omni"],
  ["Wan3.0-Video", "wan3.0-video", "video", "wan"],
  ["Wan3.0-Video-Prime", "wan3.0-video-prime", "video", "wan"],
  ["豆包Seedance-2.0", "doubao-seedance-2-0-260128", "video", "seedance-20"],
  ["豆包Seedance-2.0-fast", "doubao-seedance-2-0-fast-260128", "video", "seedance-20"],
  ["豆包Seedance-2.0-mini", "doubao-seedance-2-0-mini-260615", "video", "seedance-20"],
  ["豆包Seedance-2.5", "doubao-seedance-2-5-260628", "video", "seedance-25"],
].map(([id, modelName, kind, guide]) => ({ id: id!, modelName: modelName!, kind: kind!, guide: `references/${guide}.md`, adapter: kind === "image" ? "platform-image" : "platform-video" }));
const norm = (s: string) => s.toLowerCase().replace(/[\s_.-]/g, "").replace(/^豆包/, "");
export function routeModel(catalog: unknown, kind: string, requested?: string) {
  if (!["image", "video"].includes(kind)) throw new CliError("kind must be image or video", ExitCode.Usage);
  const name = requested || (kind === "image" ? "Nano Banana 2" : "豆包Seedance-2.0");
  const aliases: Record<string, string> = { minimax: "MiniMax-H3", seedance: "豆包Seedance-2.0", wan30: "Wan3.0-Video", wan30prime: "Wan3.0-Video-Prime" };
  const alias = aliases[norm(name)] || name;
  const entry = registry.find(r => [r.id, r.modelName].some(v => norm(v) === norm(alias)));
  if (!entry || entry.kind !== kind) throw new CliError(`Unsupported ${kind} model: ${name}. Use models list; no substitution was made.`, ExitCode.Usage);
  const live = taskRows(catalog).find((r: any) => [r.id, r.model, r.modelName, r.name].some(v => typeof v === "string" && [entry.id, entry.modelName].includes(v))) as any;
  if (!live || live.enabled === false || live.available === false) throw new CliError(`Model unavailable for this account: ${entry.id}. No substitution was made.`, ExitCode.Usage);
  return { ...entry, model: live.id || live.model || entry.id, capabilities: live, suggestedDefaults: kind === "image" ? { aspectRatio: "3:4", resolution: "2K", note: "Use only when supported by live capabilities" } : {}, approvalRequired: /seedance/i.test(entry.modelName) };
}

export function validateCapabilities(selected: ReturnType<typeof routeModel>, payload: Record<string, any>) {
  const caps = selected.capabilities.capabilities || {};
  const mode = selected.kind === "image" ? "image" : String(payload.mode || "text_to_video");
  const images = payload.image_urls || [], videos = payload.video_urls || [], audios = payload.audio_urls || [];
  for (const values of [images, videos, audios]) if (!Array.isArray(values) || values.some(v => typeof v !== "string" || !/^https:\/\//.test(v))) throw new CliError("References must be HTTPS URL arrays.", ExitCode.Usage);
  const capability = selected.kind === "image" ? caps[images.length ? "image_edit" : "image_generate"] : caps.omni_video || caps[mode === "text_to_video" ? "video_generate" : "image_to_video"];
  if (!capability) throw new CliError("Selected mode has no verified platform capability.", ExitCode.Approval);
  if (capability.supported_modes && !capability.supported_modes.includes(mode)) throw new CliError(`Mode ${mode} is not supported by ${selected.id}.`, ExitCode.Usage);
  if (selected.kind === "video" && !capability.supported_modes && !["text_to_video", "first_last_frame", "image_reference"].includes(mode)) throw new CliError("This mode has not been verified for the model.", ExitCode.Approval);
  const rules = { ...capability, ...capability.mode_constraints?.[mode] };
  for (const [field, allowed] of [["resolution", rules.output_resolutions], ["aspect_ratio", rules.aspect_ratio_allowed], ["duration", rules.duration_options]] as const) {
    if (payload[field] !== undefined && Array.isArray(allowed) && !allowed.includes(payload[field])) throw new CliError(`${field} is not supported by ${selected.id}.`, ExitCode.Usage);
  }
  if (selected.kind === "video") {
    if (!Number.isFinite(payload.duration) || !payload.resolution || !payload.aspect_ratio || typeof payload.audio !== "boolean") throw new CliError("Video requires explicit duration, resolution, aspect_ratio and audio.", ExitCode.Usage);
    if (!rules.duration_options && !rules.duration_range) throw new CliError("Model duration limits are unverified.", ExitCode.Approval);
    if (rules.duration_range && (payload.duration < rules.duration_range[0] || payload.duration > rules.duration_range[1])) throw new CliError("Duration is outside the platform range.", ExitCode.Usage);
    if (rules.output_audio_mode === "always" && payload.audio !== true) throw new CliError("This model requires audio; changing the approved settings needs confirmation.", ExitCode.Approval);
    if (payload.audio && rules.output_audio !== true) throw new CliError("Audio output capability is unverified.", ExitCode.Approval);
  }
  if (mode === "text_to_video" && (images.length || videos.length || audios.length)) throw new CliError("Text-only mode cannot include references.", ExitCode.Usage);
  if (mode === "first_last_frame" && (images.length !== 2 || videos.length || audios.length)) throw new CliError("First/last mode requires exactly two images and no other references.", ExitCode.Usage);
  for (const [kind, refs, limit] of [["image", images, rules.max_images || rules.input_max_images_count], ["video", videos, rules.max_videos], ["audio", audios, rules.max_audios]] as const) {
    const mediaRules = rules.input_media_constraints?.[kind]; const maximum = limit ?? mediaRules?.max_count;
    if (refs.length && (!Number.isFinite(maximum) || refs.length > maximum) && !(mode === "first_last_frame" && kind === "image" && rules.input_first_last_frame)) throw new CliError(`Reference ${kind} count exceeds or lacks a verified limit.`, ExitCode.Approval);
    if (kind === "audio" && refs.length && (rules.input_audio !== true || (mediaRules?.requires_visual_reference && !images.length && !videos.length))) throw new CliError("Audio reference combination is not supported.", ExitCode.Approval);
  }
  return payload;
}
