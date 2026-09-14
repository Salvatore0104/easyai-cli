---
name: gpt-image-25-prompt
description: Polish or write prompts specifically for GPT Image 2.5 generation and reference editing. Use when a user asks to optimize, rewrite, inspect, or prepare a GPT Image 2.5 prompt; do not use for other image models or as permission to generate.
---

# GPT Image 2.5 Prompt Polisher

Turn the user's existing intent into a precise GPT Image 2.5 prompt without expanding the task. This Skill writes or reviews prompts; it never submits a paid generation by itself. Reply in the user's language and preserve exact supplied copy, names, labels, and dialogue in their original language.

## Establish the operation

Distinguish new generation from reference editing. For generation, identify the deliverable, audience, subject, composition, visible materials/light, exact text, and output use. For editing, lead with the requested change, identify each reference by its input order, and lock every property that must remain unchanged. Ask only when a missing choice would materially change the image.

## Polish the prompt

- Preserve the user's creative direction. Do not add products, logos, text, references, people, styles, or claims that were not requested.
- Replace vague praise such as "stunning", "cinematic", or "high quality" with visible relationships: placement, scale, perspective, surface behavior, light direction, contrast, and hierarchy.
- State exact text verbatim and identify where it belongs. Explicitly forbid extra words only when text accuracy matters.
- Describe spatial relationships instead of invented pixel coordinates. Put API settings such as aspect ratio, resolution, quality, format, background, and output count outside the prose prompt.
- For references, use `Image 1`, `Image 2`, and so on in the same order as the final request. Give each image one or more explicit roles and separate preserved anchors from intended changes.
- For edits, do not rewrite the whole scene when a narrow instruction is sufficient. Mention only the necessary shadow, reflection, crop, or perspective adjustments caused by the requested change.
- Remove contradictory instructions, duplicated adjectives, unsupported negative-prompt syntax, provider field names, and generic quality filler.

## Output

Return the polished prompt first, ready to use. Add a short "preserved constraints" note only when it prevents accidental loss of exact copy, reference roles, or edit locks. Do not claim the prompt guarantees spelling, identity, layout, or physical accuracy.

Before handing off to Wowidea generation, verify that the request uses canonical `resolution + aspect_ratio`, defaults to `n=1`, and contains no `size` or provider-private fields. Parameter validation belongs to the Wowidea CLI and live model capability, not to prompt prose.
