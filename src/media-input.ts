import { CliError, ExitCode } from './errors.js';
import { normalizeRequest } from './request-normalization.js';

export function mediaInput(options: Record<string, any>, json: Record<string, any>, kind: 'image' | 'video') {
  const fields: Record<string, string> = { prompt: 'prompt', model: 'model', resolution: 'resolution', ratio: 'aspect_ratio', duration: 'duration', audio: 'audio', quality: 'quality', format: 'output_format', mode: 'mode' };
  const direct = Object.keys(fields).some(key => options[key] !== undefined) || options.reference?.length || options.videoReference?.length || options.audioReference?.length;
  if (direct && (options.file || options.data || options.manifest)) throw new CliError('Use direct generation options or JSON/manifest, not both.', ExitCode.Usage);
  let payload = { ...json };
  if (direct) {
    payload = Object.fromEntries(Object.entries(fields).filter(([key]) => options[key] !== undefined).map(([key, field]) => [field, options[key]]));
    for (const [option, field] of [['reference', 'image_urls'], ['videoReference', 'video_urls'], ['audioReference', 'audio_urls']]) if (options[option!]?.length) payload[field!] = options[option!];
  }
  if (payload.image !== undefined) {
    if (payload.image_urls !== undefined || payload.imageUrls !== undefined) throw new CliError('Use image or image_urls, not both.', ExitCode.Usage);
    payload.image_urls = Array.isArray(payload.image) ? payload.image : [payload.image]; delete payload.image;
  }
  return normalizeRequest(payload, kind);
}
