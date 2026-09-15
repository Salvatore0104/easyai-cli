---
name: wowidea
description: Generate and edit images and videos through the user's Wowidea website account. Use for media creation, reference-based edits, and retrieving generated results.
---

# Wowidea

Turn the user's request into a model node on the bound Wowidea infinite Canvas, execute it once, and return the downloaded output. Reply in the user's language. The website handles provider redundancy and failover; never call providers directly.

Control Canvas only through the project CLI and its HTTP/WebSocket APIs. Never use Computer Use, browser automation, or manual website interaction as a fallback. If Canvas authentication, authorization, or an API command fails, report the exact CLI diagnostic and stop or repair the CLI session; do not continue the operation through the website UI.

## Understand the request

Preserve the user's model, copy, references and output settings. Ask only when missing information materially changes the result. Prompt-only requests do not generate media. Seedance follows the active project's storyboard and approval gate; never bypass it through Canvas execution.

## Prepare parameters and references

Use `node <project>/.wowidea/runtime/dist/cli.js` for creation and `node <project>/.wowidea/runtime/dist/canvas-cli.js` for complete Canvas control. Before the first generation in a directory, run `project setup --dir <project> --name <name>` and retain its `.wowidea/canvas.json` binding. Existing bindings are verified and reused by ID; never guess by name. Use `project canvas show|verify|bind|switch` for explicit binding changes.

The API key is only for model discovery, pricing and explicit `--direct`. Canvas uses its own scoped OAuth login at `https://wowidea.top/api`; tokens belong only in the OS credential manager or process environment. Never echo credentials or put them in project files, Skill text, logs or Git. If keytar is unavailable, use process environment injection and do not create a plaintext token file.

Canvas login is a one-time initialization step. The wrapper stores the active profile as non-sensitive metadata, retrieves access and refresh tokens from the OS credential manager, and refreshes the same session automatically. Do not ask the user to log in again unless the saved session was revoked or the user explicitly requests an account change.

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

## Create on Canvas and submit once

Common commands (replace values with the user's request):

```text
wowidea image generate --prompt "Product photo on a pale blue background" --model "Nano Banana 2" --resolution 4K --ratio 3:4
wowidea image edit --prompt "Change only the background to green" --reference ./product.png --model "Nano Banana 2"
wowidea video generate --prompt "Camera slowly approaches a ceramic cup" --model "Wan3.0-Video" --duration 5 --resolution 480p --ratio 16:9 --no-audio
```

Use direct generation options OR `--file request.json`, never both. Other supported JSON parameters remain available through the file interface. Request keys and local records are automatic; default execution waits and downloads. Retain the process handle until it exits. Use `--no-wait` only when asynchronous submission is useful, then track the returned task.

The default flow reads the binding, queries `node-types describe`, `node options` and `node inputs`, creates visible local-reference nodes, binds the declared slots, configures a new generation node, and executes that node once. Results remain attached to the node and are also downloaded. Edits are non-destructive chains. Use `--direct` only when the user explicitly requests the legacy non-Canvas interface.

For image nodes, preserve both Canvas UI fields (`aspectRatio`, `size`) and canonical media fields (`imageGenParams.aspect_ratio`, `imageGenParams.resolution`). After execution, compare `imageResultSizes` with the requested ratio. Treat `outputSpec.status: "mismatch"` as a specification failure, report it, and never claim that the requested ratio was delivered or submit an automatic retry.

One candidate per request by default. Keep `watermark:false` for video. No automatic reroll, model switch or second generation after a failure. Canvas request records preserve the exact project, node, request and task IDs; resume only that task through `easyai-canvas run status|events PROJECT TASK`. An explicitly requested new identical generation uses `--allow-reroll`. See [recovery](references/workflow.md) when needed.

## Deliver

Open actual output before judging quality; see [visual review](references/visual-review.md). Return local media, status and available task pricing. Unknown billing is “接口未提供”, not zero. Preserve the original in edits; use it as an actual reference and optionally record `--parent <taskId> --change <summary>`. Records under `.wowidea/runs` support continuity but require no manual maintenance.

For complex multi-round work read [project workflow](references/project-workflow.md); for explicit stage work read [VJ recipes](references/vj-recipes.md). For graph editing, groups, templates, assets or collaboration, use the bundled `canvas-agent-operator` Skill. Account administration, publication and Git changes require their own matching user request.

When the user asks to open or show the bound Canvas in Codex, run `wowidea project canvas open --dir <project>` and pass the returned `canvasUrl` to Codex's browser panel with right-side placement. Do not call `easyai-canvas project open`, because it launches an external browser. The panel is for the user's live view and manual interaction; Agent mutations still use the CLI/API and appear there through Canvas collaboration updates.
