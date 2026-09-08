# Seedance 2.5 prompt writing

This independent guide adapts the verified [official 2.5 guide](https://ark.volcengine.com/region:cn-beijing/docs/82379/2607689?lang=zh). The official page recommends sd25-pe, but its original Skill distribution was not obtained; do not claim to bundle it. Flova is a workflow reference, not the EasyAI capability authority.

## Write in four layers

1. Define the actual input order, subjects and per-asset role. Multiple views may define one subject; explain which view supplies which evidence.
2. Give a short premise: subject, place, event and visual treatment.
3. Write consecutive integer-second ranges or ordered shots. Each range describes action, spatial change, camera, dialogue and effects. Use purposeful transitions and avoid accidental gaps. Reduce excess events rather than increasing billable duration without approval.
4. State global continuity and audio rules. Keep locked identity, materials and world rules distinct from the properties intended to change.

Integer time ranges are creative guidance, not a guarantee of frame-exact editing or a fixed number of actions every second. Unlike 2.0, the official 2.5 guide explicitly describes integer timelines and multiple keyframes. Do not transfer its limits to another model version.

## References, frames and parameter locks

| Official operation | Prompt responsibility | Official semantics; not EasyAI request fields |
| --- | --- | --- |
| Multimodal reference | Assign identity, movement, camera, style and sound roles | Semantic reference does not lock output ratio/duration |
| Independent keyframes | Declare frame order and the path between anchors | Reference images differ from strict endpoint roles |
| Storyboard grid | Identify panel order, shot mapping and movement | Approximate narrative guide, not guaranteed panel reproduction |
| Strict first/last frame | Declare actual first_frame/last_frame roles | Adaptive ratio follows the first frame; duration selectable |
| Edit | Source video, time scope, A→B target and preserved layers | Adaptive ratio and automatic source duration (Ark duration=-1) |
| Prepend/append | Source, extension direction and boundary action | Adaptive ratio; selectable extension duration; official MOV guidance |

The official snapshot describes up to 30 seconds, 30 images, 10 videos and 10 audio assets, 50 combined; video/audio totals each at most 30 seconds. These are not account entitlements or locally verified EasyAI limits. Do not submit Ark field names, auto-duration or MOV assumptions unless the concrete EasyAI adapter supports them. Do not substitute ordinary reference for a locked edit or endpoint request.

## White-model and storyboard references

Specify whether a blockout controls body trajectory, object placement, camera, timing or light. Map the intended character image to the blockout subject. Exclude axes, rig handles and path guides from the output. Improved materials cannot compensate for missing action. Prefer separate clean keyframes when exact visual alignment matters; a grid serves review unless explicitly approved as input.

## Complete original example

Eight-second product-film concept; use only if this duration and reference mode are supported. Image 1 must show the actual product; Image 2 is optional material/lighting guidance only when approved.

```text
Image 1 defines the perfume bottle's silhouette, cap and exact printed label. Image 2 provides only the diffuse side-light relationship and pale stone surface; do not copy its objects or text.
A restrained product reveal in which the bottle emerges from a moving shadow.
0–3 seconds: A fixed frontal close view shows the bottle on the stone surface. A broad shadow slides away from left to right, gradually revealing the label. The bottle stays still.
3–6 seconds: The camera moves in a shallow arc to the right, revealing the side thickness while keeping the front label legible. The cap remains aligned with the bottle.
6–8 seconds: The camera settles. A soft highlight travels along the shoulder and fades, ending on a stable three-quarter view.
Preserve the bottle's proportions and exact label throughout. Sound: quiet room ambience and one soft glass resonance as the highlight appears. No speech, captions or background score.
```

For edit, replace the premise with a precise source edit and write only affected intervals plus preservation. For continuation, inspect the actual boundary frame/motion and write the new interval from that state. Do not copy the source's action twice. Preserve original dialogue and visible text; retain only approved reference labels.

## Execution and review

Route the exact 2.5 ID; validate mode, roles, counts, duration, resolution, ratio and audio combinations against EasyAI. Unsupported modes remain prompt-only. Follow [Seedance approval](seedance-gate.md). Inspect actual continuity and any requested timing; a successful task does not prove accurate keyframe alignment, seamless looping or final assembly.
