# Midjourney v8.2 and Fast

Original guidance for the platform's Midjourney routes; not an official Midjourney package. Midjourney reads a parameter tail rather than separate API option fields, so the prompt and its trailing flags must stay consistent. Check live limits before promising a mode.

## Write the prompt, then the tail

Lead with the visible subject, action and setting, then the medium, light and mood. Keep the sentence plain; Midjourney rewards concrete nouns over stacked style adjectives. Put style and framing control in parameters instead of repeating them in prose.

```text
[subject and action], [setting and time], [medium and light], [composition intent] --ar [ratio] --v 8.2 --style raw --stylize [0-1000]
```

Use only the flags the request actually needs:

| Flag | Purpose |
| --- | --- |
| `--ar` | Output ratio. Choose from the route's allowed list; do not invent ratios. |
| `--v 8.2` | Midjourney version. Keep it explicit so an account default cannot silently change the result. |
| `--style raw` | Restrained, less decorative interpretation. Useful for product, editorial and reference-faithful work. |
| `--stylize` | Interpretation strength. Lower values stay literal; higher values add artistic latitude. |
| `--chaos` | Variation across a batch. The platform returns one image per task, so prefer changing the prompt instead. |
| `--seed` | Reproducibility aid, not a guarantee that a rerun is identical. |
| `--no` | Exclude listed concepts, for example `--no text, watermark, logo`. |

## Platform boundaries

The platform routes expose one image per task and no quality selector for this family, so do not promise a four-image grid or a `--quality` control. `mj-v8.2-fast` offers fewer generate resolutions than the standard route; confirm the actual route before fixed-resolution delivery. Reference editing accepts one input image, not a multi-reference board. Text rendering is weaker than GPT Image or Nano Banana routes, so route exact or typographic deliverables elsewhere and say so.

Midjourney flags are not interchangeable with the JSON fields other models accept. Keep `--ar` aligned with the request's `aspect_ratio`, and never place a flag that the platform must parse as a field inside free prose. Preserve user-supplied flags verbatim, and treat any flag the live capability data does not confirm as unverified rather than supported.

## Review

Judge the delivered frame against the task: subject legibility, ratio and composition, palette control, and whether excluded concepts actually stayed out. A successful task is not aesthetic acceptance. Use [execution](workflow.md) for authorized generation and [review](visual-review.md) before any quality claim.
