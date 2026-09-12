import { routeModel, validateCapabilities } from './models.js';
import { estimate, PriceBook } from './pricing.js';
import { CliError, ExitCode } from './errors.js';

export interface RoutingInput { kind: 'image' | 'video'; purpose?: string; stage?: 'preview' | 'final' | 'edit' | 'refine'; model?: string; speed?: boolean; payload?: Record<string, any>; }
export function autoRoute(catalog: unknown, input: RoutingInput, prices: PriceBook | null = null) {
  if (!['image','video'].includes(input.kind)) throw new CliError('kind must be image or video.', ExitCode.Usage);
  if (input.stage && !['preview','final','edit','refine'].includes(input.stage)) throw new CliError('Unknown creative stage.', ExitCode.Usage);
  if ((!input.stage || !input.purpose) && !input.model) return { needsInput: true, question: '请说明用途，以及是在测试方向、修改还是正式交付。', candidates: [] };
  const p = input.payload || {}, purpose = input.purpose || 'explicit request';
  const names = input.model ? [input.model] : input.kind === 'image'
    ? /text|layout|文字|排版|复杂/.test(purpose) ? ['GPT Image 2.5','Nano Banana 2']
    : input.stage === 'refine' ? ['Nano Banana Pro','GPT Image 2.5']
    : /style|风格|氛围|构图/.test(purpose) && input.stage !== 'edit' ? [input.speed ? 'mj-v8.2-fast' : 'mj-v8.2','Nano Banana 2']
    : ['Nano Banana 2','GPT Image 2.5']
    : /h3|minimax/i.test(purpose) ? ['MiniMax-H3','MiniMax-H3-Max']
    : input.stage === 'preview' ? ['豆包Seedance-2.0-mini','豆包Seedance-2.0-fast','豆包Seedance-2.0','豆包Seedance-2.5']
    : ['豆包Seedance-2.0','豆包Seedance-2.5','MiniMax-H3'];
  const candidates: any[] = [], rejected: any[] = [];
  for (const [rank,name] of names.entries()) {
    try {
      const selected = routeModel(catalog, input.kind, name);
      const caps = selected.capabilities.capabilities || {};
      const refs = p.image_urls?.length || p.image;
      const capability = input.kind === 'image' ? caps[refs ? 'image_edit' : 'image_generate'] : caps.omni_video || caps[p.mode && p.mode !== 'text_to_video' ? 'image_to_video' : 'video_generate'];
      if (!capability) throw new Error('Required capability unavailable');
      const resolutions: string[] = capability.output_resolutions || [];
      const desired = input.kind === 'image' ? ['4K','2K','1K'] : input.stage === 'preview' ? ['480p','720p','1080p','1440p'] : ['720p','1080p','1440p'];
      const resolution = p.resolution || desired.find(r => resolutions.includes(r));
      if (!resolution) throw new Error('No verified output resolution');
      const payload: Record<string,any> = { ...p, model: selected.model, resolution };
      if (input.kind === 'video') { payload.mode ??= 'text_to_video'; payload.duration ??= 5; payload.aspect_ratio ??= '16:9'; payload.audio ??= capability.output_audio === true; payload.watermark ??= false; }
      if (input.kind === 'image') { payload.n ??= 1; payload.aspect_ratio ??= '1:1'; }
      validateCapabilities(selected, payload);
      const pricing = estimate(prices, selected.model, input.kind, payload);
      candidates.push({ model: selected.model, payload, pricing, reason: `${purpose}: ${input.stage || 'explicit'}; capability verified`, rank, guide: selected.guideInfo });
    } catch (e) { rejected.push({ model: name, reason: (e as Error).message }); }
  }
  // Fit comes before cost. Mini/Fast are alternatives for the same preview job.
  if (!input.model && input.kind === 'video' && input.stage === 'preview') candidates.sort((a,b) => {
    const aPreview = a.rank < 2, bPreview = b.rank < 2;
    if (aPreview !== bPreview) return aPreview ? -1 : 1;
    if (aPreview && bPreview && a.pricing.estimatedPoints !== null && b.pricing.estimatedPoints !== null) return a.pricing.estimatedPoints - b.pricing.estimatedPoints || a.rank - b.rank;
    return a.rank - b.rank;
  });
  if (!candidates.length) throw new CliError('No model satisfies the requested settings; no substitution submitted.', ExitCode.Usage, rejected);
  return { needsInput: false, ...candidates[0], candidates, rejected, stage: input.stage, purpose };
}
