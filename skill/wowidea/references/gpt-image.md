# GPT Image 2 prompt writing

Use for generation, layout, typography, reference editing and visual concept work. These are original task-specific methods informed by the curated community library and Flova's separation of planning, reference use and prompt writing. See [sources](sources.md); examples are not provider capability guarantees.

## Select the task before the prose

For a new image, specify purpose, subject, composition, materials/light, exact text and output constraints. For an edit, lead with the requested change and lock only the properties the user wants retained. A short local edit should not become an elaborate scene rewrite. For a series, carry accepted identity/layout rules into each image rather than merely repeating a style adjective.

Plan information hierarchy before ornamental style: headline, secondary copy, product/character and supporting details. Specify relationships such as aligned left edges, quiet space around a title or a foreground object occluding a frame. Do not invent pixel coordinates, mask tokens or annotation IDs. Preserve supplied text verbatim and make text ownership explicit (printed product label versus added headline).

## Prompt pattern

```text
Create [deliverable] for [use and audience].
Subject and composition: [visible subject, placement, scale, perspective and hierarchy].
Visual treatment: [medium, palette relationships, material and light behavior].
Text: [exact strings, ordering, placement and contrast], or explicitly no added text when appropriate.
References: Image 1 controls [dimensions]; Image 2 controls [dimensions]. Preserve [anchors], change [requested scope].
Output intent: [channel/crop/empty regions]. Actual file settings are supplied separately through supported API fields.
```

Use only relevant lines. Do not impose cinematic lighting, stage negative space, realism or minimalism on every design. Choose a small number of relevant [case methods](image-case-index.md), not the entire library.

## Complete original examples

Poster without references:

```text
Create a square editorial poster for a neighbourhood repair workshop. A single oversized red thread passes through a blue ceramic cup's repaired crack and forms a loose circle around the title. Use cut-paper shapes with visible fibrous edges on warm off-white stock. Place the exact headline "MAKE IT LAST" at the upper left in large dark-blue lettering, and "Saturday · 10 AM" below it in a smaller, clear line. Keep the cup in the lower right; the thread connects the information and object without crossing the letters. No additional words or logos.
```

Reference edit (Image 1 must be the actual source):

```text
In Image 1, replace only the background with a warm grey paper sweep. Preserve the bag's shape, handles, seam placement, colour, printed label and viewing angle. Adjust only the contact shadow needed to seat it on the new surface. Do not add objects, change the crop or rewrite the label.
```

Typography as structure: describe how the exact words form the composition while retaining their reading order. For packaging or UI concepts, name visible surfaces/states; never promise editable vectors, print-ready dielines or executable interfaces from a raster result.

## Pre-submit and review

Keep final prompt reference order identical to image_urls. Check model ID, image_generate/image_edit, image limits, resolution and ratio in `models route`; do not import Flova's aspect list or another API's transparency/mask fields. Evaluate actual text spelling, object identity, hierarchy, crop and intentional changes at the target display scale. Report unresolved text/artifacts without automatic regeneration. Prompt-only requests do not call an API; authorized generation uses [Wowidea execution](workflow.md).
