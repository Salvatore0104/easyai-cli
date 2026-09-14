# Image request parameters

Build a stable EasyAI intent payload, not a provider payload. The backend may route the same public model through different platform scripts.

- Use `resolution`: `1K`, `2K`, or `4K`, limited by the live model capability.
- Use `aspect_ratio`: a live supported ratio such as `1:1`, `16:9`, or `9:16`.
- Accept `size` only from user input. Pixel dimensions derive a standard ratio and resolution tier; a ratio-like value derives `aspect_ratio`. Reject conflicts, then remove `size`.
- Use snake_case. Conflicting camelCase and snake_case aliases are an error.
- Default `n` to `1`. Automatic platform routing cannot promise multiple outputs where enabled adapters differ.
- Send `quality`, `output_format`, `background`, and references only when the selected live capability explicitly supports the value and count.
- Do not emit platform IDs or provider-specific names such as `aspectRatio`, `imageSize`, `--ar`, or provider pixel enums. Platform build scripts own those conversions.

Before submission, inspect the final normalized payload. For non-Seedance images, continue without user confirmation when it is valid. Stop on conflicts, malformed dimensions, or unsupported settings.
