# Nano Banana prompt writing

Use for Nano Banana 2, Pro or 2 Lite generation and edits, choosing the exact live model. Selected restoration rules adapt the locally installed MIT Nano Banana Skill by Salvatore0104; see [notice](nano-banana-MIT.txt) and [sources](sources.md). Its GRSAI scripts, credentials, fixed limits and deterministic prompt appending are not part of this workflow.

## Choose generation, edit or restoration

- Generation: establish subject, purpose, composition, medium, material-scale behavior, light and exact text when needed. Avoid decorative repetition only when unwanted; never remove authored patterns by default.
- Edit: state the precise target and change. Preserve unrequested content within the agreed scope. Read the image first and distinguish observed facts from user descriptions.
- Restoration: identify actual unwanted artifacts, retain identity and composition, then repair tone/detail without redrawing content. Do not classify all textures as damage or promise recovered historical detail not present in the source.

## Reference strategy

Give each image explicit authority: product identity, pose, palette, background, material or layout. For example, Image 1 supplies the bottle geometry; Image 2 supplies frosted-glass texture, not its bottle shape or label. Keep order consistent with image_urls. A style reference is not a first-frame lock. Do not add extra inputs without a clear role and user-authorized input plan.

## Prompt patterns

Generation: `[subject and purpose]; [framing, arrangement and depth]; [medium, material behavior and lighting]; [exact text if needed]; [channel-specific constraints].`

Edit: `In Image 1, change only [target] to [new state]. Preserve [identity, geometry, label, crop and other relevant anchors]. Match [necessary local shadow/reflection].`

Restoration: `Repair the observed [artifact] in [region/material]. Preserve [content anchors]. Restore tonal continuity and restrained detail without invented texture, plastic smoothing or sharpening halos. Keep the intentional [weave/scales/grain] intact.`

Do not blanket-ban deformation when the user requests a transformation. Do not append every anti-artifact term to every image. Moire, fish-scale-like periodic patterns, banding and honeycomb microtexture are descriptions of observations, not model parameters.

## Complete original examples

Illustration generation:

```text
An illustrated cover showing a curious fox sorting fallen leaves into a spiral on a forest floor. View from slightly above, with the fox on the lower left and the spiral leading toward a quiet title area at the top. Use translucent watercolour washes and irregular pencil outlines; orange fur contrasts with blue-green shadows. Preserve the handmade variation of the paper and brush marks. No added text.
```

Two-image material transfer:

```text
Use Image 1 for the chair's exact silhouette, leg angles and camera perspective. Use Image 2 only for the woven fabric's colour and coarse thread scale. Replace the chair upholstery with that fabric, following the existing seat curvature and seams. Preserve the frame, background and crop from Image 1. Do not transfer any objects or logos from Image 2.
```

Restoration with confirmed moire:

```text
Remove the unintended broad moire bands from the photographed jacket in Image 1. Preserve the person's identity, pose, jacket seams, real fabric weave, framing, light direction and colour relationships. Recover a continuous tonal surface without blurring the seam edges or inventing fine threads. Do not change other regions.
```

## Execution and QC

Only use modes, counts, ratio and resolution verified in EasyAI. Prompt exclusions belong in the supported prompt field unless a separate negative field is explicitly mapped. Do not reuse GRSAI's Base64 path or its six-image ceiling. Review intended changes and protected details side by side; material restoration is not a licence to change identity. Use [execution](workflow.md) for authorized calls, never auto-reroll a failed aesthetic check.
