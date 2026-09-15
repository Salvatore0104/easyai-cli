---
name: wowidea
description: Generate and edit images and videos through the user's Wowidea website account. Use for media creation, reference-based edits, and retrieving generated results.
---

# Wowidea

Turn the user's request into a website model call, then return the actual output. Reply in the user's language. The website handles provider redundancy and failover; never call providers directly.

## Understand the request

Preserve the user's model, copy, references and output settings. Ask only when missing information materially changes the result. Prompt-only requests do not generate media. Simple generation needs no project archive, storyboard or manifest. These are optional for all models, including Seedance; respect additional user constraints.

## Prepare parameters and references

Use `node <project>/.wowidea/runtime/dist/cli.js` in an initialized project, otherwise `wowidea`. Initialize with `project setup --dir <project>` only when requested; initialization is not required for generation. Use `doctor` for connection problems, not before every request. Keys belong in OS credentials or process injection, never project files.

Use `models list --type image|video` and `models show <model>` for current website capabilities. When model selection is needed, `models route --kind image|video --purpose <purpose> --stage preview|final|edit|refine` returns suitable settings. Explicit settings take precedence. Image final output defaults to supported 4K; choose video specifications appropriate to the requested stage. Do not add a separate paid preview to a request for final output.

Read only the selected model's prompt guide:

| Model | Guide |
| --- | --- |
| GPT Image 2 | [GPT Image](references/gpt-image.md) |
| GPT Image 2.5 / Flare / Sunburst | [GPT Image 2.5](references/gpt-image-25.md), then bundled `$gpt-image-25-prompt` for prompt writing |
| Nano Banana | [Nano Banana](references/nano-banana.md) |
| Midjourney | [Midjourney](references/midjourney.md) |
| MiniMax H3 / H3-Max | [H3](references/minimax-h3.md) |
| Seedance 2.0 / 2.5 | [2.0](references/seedance-20.md) / [2.5](references/seedance-25.md) |
| Google Omni / Wan | [Omni](references/google-omni.md) / [Wan](references/wan.md) |

For images read [image parameters](references/image-parameters.md). Inspect local references and keep roles/order; the CLI uploads them and checks accessibility. Use `--reference` for images, `--video-reference` for videos and `--audio-reference` for audio, repeating options in order. Advanced combinations use [reference planning](references/reference-planning.md) and UTF-8 request JSON.

## Submit once

Common commands (replace values with the user's request):

```text
wowidea image generate --prompt "Product photo on a pale blue background" --model "Nano Banana 2" --resolution 4K --ratio 3:4
wowidea image edit --prompt "Change only the background to green" --reference ./product.png --model "Nano Banana 2"
wowidea video generate --prompt "Camera slowly approaches a ceramic cup" --model "Wan3.0-Video" --duration 5 --resolution 480p --ratio 16:9 --no-audio
```

Use direct generation options OR `--file request.json`, never both. Other supported JSON parameters remain available through the file interface. Request keys and local records are automatic; default execution waits and downloads. Retain the process handle until it exits. Use `--no-wait` only when asynchronous submission is useful, then track the returned task.

One candidate per request by default. Keep `watermark:false` for video. No automatic reroll, model switch or second generation after a failure. If interrupted, use `tasks resume <returned-key> --wait`, or image/video status and download with a known task ID. An uncertain submission must not be guessed from nearby account tasks. An explicitly requested new identical generation uses `--allow-reroll`. See [recovery](references/workflow.md) when needed.

## Deliver

Open actual output before judging quality; see [visual review](references/visual-review.md). Return local media, status and available task pricing. Unknown billing is “接口未提供”, not zero. Preserve the original in edits; use it as an actual reference and optionally record `--parent <taskId> --change <summary>`. Records under `.wowidea/runs` support continuity but require no manual maintenance.

For complex multi-round work read [project workflow](references/project-workflow.md); for explicit stage work read [VJ recipes](references/vj-recipes.md). These are not prerequisites for ordinary requests. Canvas operations, account administration, publication and Git changes require their own matching user request.
