# MiniMax H3 prompt writing

Use this guide for H3/H3-Max prompts, not as a provider API schema. It adapts the official H3 prompt specification; attribution and snapshots are in [sources](sources.md). Communicate in the user's language. Write the model's structured prompt in English, preserving dialogue, lyrics and visible text verbatim.

## Choose the creative mode

| Mode | Intent | Prompt structure |
| --- | --- | --- |
| T2VA | Build an audiovisual shot from text | Three fields |
| I2VA | Begin at a strict first frame | Alignment line, then three fields |
| FL2VA | Travel continuously between strict first and last frames | Alignment line, then three fields |
| L2VA | Converge to a strict last frame | Alignment line, then three fields |
| Ref2VA | Reuse selected identity, environment, motion, style or sound | Six fields |

These names are creative modes, not EasyAI mode aliases. Ordinary image reference does not lock a first frame. Define references using [reference planning](reference-planning.md) before composing the prompt.

## Text and keyframe structure

Use these fields in this order, separated by blank lines:

```text
integrated_multimodal_description: [Shot 1] Establish the visual style, framing, subjects and current state, then describe action, camera, sound and the resulting state.

overall_soundscape: Describe environmental and physical sounds across the clip.

non_diegetic_music: Describe music heard only by the audience, or N/A when no score is wanted.
```

For I2VA, prepend exactly:
`For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.`

For FL2VA, prepend:
`How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot N) aligns with the S.SS-second mark of the target video.`

For L2VA, prepend:
`How the reference pictures align with the target video — <Picture 1> (from [Shot N]) aligns with the S.SS-second mark of the target video.`

Replace N with the actual last shot and S.SS with the duration to two decimals. Leave a blank line after alignment. I2VA develops from the observed image; FL2VA describes the intermediate path, not two unrelated pictures; L2VA designs an opening that can plausibly reach the target. Never invent unobserved source details.

## Shot and audio grammar

- The opening `[Shot 1]` has no timestamp. Subsequent cuts use `[Shot N] At MM:SS.mmm, ...`, increasing and inside the requested duration. Do not write more action than the clip can communicate.
- Write camera motion in natural language, with direction, scale and endpoint when useful. Keep performance, object motion, camera motion and environmental motion distinguishable.
- Give vocal sources stable `(S1)`, `(S2)` IDs; silent characters do not need speaker IDs. Establish voice identity and delivery outside the dialogue tag. Use `<d>[Language] exact words</d>` without translating supplied text.
- For voiceover use `says in an off-screen voiceover`; when referring to an on-screen speaker, state after the dialogue that their lips remain closed.
- A line crossing a cut uses `<scenetrans>` at both connecting points and explicit continuous-audio prose. Use `<cutoff>` for speech deliberately cut off by the end.
- Put visible text in English double quotes, preserving its original spelling. Do not invent captions because speech exists.
- `overall_soundscape` describes ambience, impacts, breathing and other physical sounds; do not repeat dialogue or diegetic music already placed in the timeline. Use N/A for full silence only when requested. Prompt silence cannot override a platform that always outputs audio.

## Ref2VA: six fields

1. `subject_definitions`: one line per content entity. `<Subject N>` denotes reusable visible content, including people, objects, scenes, style or action. Cite the source `<Picture N>` or `<Video N>`. An entity may draw appearance and motion from different sources. A source-only picture need not have a separate definition; define it separately when it serves as a frame/composition/storyboard anchor. `<Video N>` identifies source editing, continuation or temporal structure. `<Audio N>` identifies an explicitly enabled audio signal. Keep its speaker ID consistent with the global speaker order.
2. `summary`: begin with the applicable bracketed task types: `reference generation`, `keyframe completion`, `video editing`, `video continuation`, `audio reuse`, `audio reference`; combine with ` + `. Mere media presence does not imply editing or reuse. For an edit begin the body with `The target video is an edited version of <Video 1>.`
3. `retention_analysis`: give each tracked entity its shot/scope and retention marker. Visual: `fully_preserved`, `partially_preserved`, `attribute_transfer`, `weak_reference`. Audio: `fully_copy`, `partially_copy`, `reference`, `weak_reference`. Judge fidelity within the defined role; a new background is not identity loss when only identity was locked.
4. `detailed_description`: establish style before `[Shot 1]`; describe each shot's composition, appearance, position, environment, light, action, camera, sound and state change. Insert labels where their role actually takes effect. Do not substitute a list of references for a shootable scene.
5. `overall_soundscape`: environmental and physical audio, including relevant audio references.
6. `non_diegetic_music`: audience-only score, or N/A.

Image/video/audio indices are independent. A video's soundtrack is not an audio reference unless explicitly enabled. Do not emit undefined labels or Flova `<<<image_N>>>` tokens as H3's native grammar.

## Complete original examples

Text-only product vignette, four-second concept:

```text
integrated_multimodal_description: [Shot 1] A frontal close view of an unbranded ceramic cup on a pale oak table. A thin ribbon of steam rises and bends toward an open window on the left. The camera slowly moves closer, ending with the cup rim and steam in focus. The cup and table remain still; morning window light reveals the glaze's slight unevenness.

overall_soundscape: Quiet room tone and distant leaves moving outside the window.

non_diegetic_music: N/A
```

Single-image ordinary reference, four-second concept (Picture 1 must actually contain the described bag):

```text
subject_definitions: <Subject 1> is the canvas bag from <Picture 1>, retaining its silhouette, handles, stitched pocket and printed label.

summary: [reference generation] Present <Subject 1> on a warm grey tabletop while moving from a frontal to a slight three-quarter view.

retention_analysis: <Subject 1> (appears in [Shot 1]): fully_preserved - preserve bag identity and label; replace the source background and allow the viewing angle to change.

detailed_description: A tactile product film with broad soft window light. [Shot 1] <Subject 1> stands upright at centre. The camera makes a shallow arc to the right, revealing the side seam while keeping the printed label readable. The handles settle slightly; the bag does not rotate independently. The shot ends in a stable three-quarter composition.

overall_soundscape: Quiet room tone with a faint cloth rustle as the handles settle.

non_diegetic_music: N/A
```

## EasyAI execution boundary

Run `models route --kind video --model MiniMax-H3` (or the exact H3-Max ID). Current verified adapters cover text-only and image-only reference. Text becomes `content:[{type:"text",text:prompt}]`. `mode:image_reference` becomes `videoGenerateMode:omni_reference`; ordered images become `type:image_url`, `role:reference_image`, `image_url:{url}` entries. Retain the same image array order and reject duplicates or conflicting native content.

Image-only live validation used 4 seconds, 720p, 16:9, audio:true, watermark:false. This is evidence, not a universal default: the returned dimensions/duration differed slightly from the request. H3-Max, mixed video/audio, strict keyframes, edit and continuation still require their own verified platform mapping. A catalogue listing alone does not prove the native request adapter. Write their prompts but stop unsupported submission. Never silently map 720p to Flova's 768p or launch an H3 regeneration/upscale paid stage. Follow [execution](workflow.md).
