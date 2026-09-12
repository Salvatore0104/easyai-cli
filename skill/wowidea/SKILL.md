---
name: wowidea
description: Create and review images and videos through the Wowidea CLI for posters, branding, products, illustration, spatial concepts and stage visuals. Use for Wowidea creation, editing, reference planning, project continuity and delivery; stage workflows apply only to stage requests.
---

# Wowidea Visual Agent

Codex makes creative decisions; the installed wowidea CLI executes through the user's website account. easyai and easyai-canvas remain compatible. Reply in the user's language. English instructions do not require English conversation or translation of supplied text/dialogue.

## Initialize once per project

When asked to initialize, run wowidea project setup --dir <project>. Read the returned project instructions immediately. Subsequent media work uses node <project>/.wowidea/runtime/dist/cli.js and this project's skill, without requiring another /wowidea invocation. Use project setup --update only for an explicitly requested update. Keep keys in OS credentials or environment, never in project files. No Git commit or publication is implied.

## Choose the next creative decision

Use [task routing](references/design-tasks.md) to infer purpose, audience, deliverable and change scope. A one-off image or local edit needs no archive or full storyboard. Complex work may need [direction](references/creative-direction.md) and [bounded rounds](references/production-rounds.md). Stage is optional: load [VJ recipes](references/vj-recipes.md) only for explicit performance/stage work. Space, loop or key visual alone is insufficient.

Ongoing projects use accepted [preferences and records](references/project-workflow.md). Trials do not overwrite accepted directions or other projects. For reusable external methods read [recipe authoring](references/recipe-authoring.md).

## Select model and prompt guide

Read [automatic selection](references/auto-routing.md). Before generating, establish purpose and stage from the conversation; ask briefly only when unclear. Run models route --kind image|video --purpose <purpose> --stage preview|final|edit|refine --file <constraints.json>, with --model when specified. Use its payload, retaining prompt and reference order. Explicit user settings override automatic choices. One candidate by default. Images prioritize quality and final 4K; do not downscale to save money when price is unchanged. Videos preview at economical supported settings, then generate final only when the user requests final delivery. No automatic model switch after a failed submission.

Read only the relevant guide. Model prompt methods are bundled as internal Wowidea references and are selected by the single `$wowidea` entry:

| Model | Guide |
| --- | --- |
| MiniMax H3 / H3-Max | [H3](references/minimax-h3.md) |
| Seedance 2.0 family | [2.0](references/seedance-20.md) |
| Seedance 2.5 | [2.5](references/seedance-25.md) |
| GPT Image 2 / 2.5 family | [GPT Image](references/gpt-image.md) |
| Nano Banana family | [Nano Banana](references/nano-banana.md) |
| Midjourney v8.2 / 8.2-fast | [Midjourney](references/midjourney.md) |

Other routes: [Google Omni](references/google-omni.md), [Wan](references/wan.md). Use `wowidea guides list|show` to locate bundled references. Prompt-only requests make no paid call. Check API capability independently from official creative guidance.

Inspect references and define [roles/order](references/reference-planning.md). Use [case methods](references/image-case-index.md) only when helpful. Keep exact copy, labels and approved constraints intact. Choose proportions from the task; choose high supported image resolution; final defaults to 4K.

## Execute the authorized scope

Read [execution/recovery](references/workflow.md). Use UTF-8 request files and one key per authorized task. Default generate waits and downloads; retain its process handle until the terminal result. Existing tasks are observed/recovered, not submitted again. No duplicate polling owners, automatic paid retries or aesthetic rerolls.

Seedance directly uses video generate --file; storyboard, visual QC and manifest are optional. There is no creative approval or points gate. Technical capability checks still apply. Reference arrays accept HTTPS URLs or local files; local files are uploaded through the website and refreshed after expiry. Use image edit or video edit for requested modifications, with --parent <sourceTaskId> --change <summary>. Preserve the selected version as reference; do not merely restate the prompt.

## Review and deliver

Open actual outputs before [quality claims](references/visual-review.md). Judge task-specific text/hierarchy, product identity, narrative or stage readability. Distinguish intentional surreal design from defects. State uninspected motion/audio and unfinished production requirements. API success is not quality acceptance.

Present local output media and real task status. Save task ID, prompt, settings, ordered inputs, outputs and QC when using records. Record failures do not authorize regeneration. Report task status, media paths, estimated pricing and pointsUsage. Unknown task charges are “接口未提供”, not zero; balance changes are not task costs. Read prior .wowidea/runs records to preserve version continuity.

## Credentials and canvas

Use the existing account key or hidden local auth use-key --prompt. No provider credentials or browser login. Keys never enter Skills, prompts, records or Git. Keep signed requests private; redact query strings in review copies.

Read current canvas state and actual CLI help. Refresh version conflicts instead of overwriting collaborators. Cancellation, deletion and key management require matching user intent. Large results support --output. [Sources](references/sources.md) are reviewed and bundled, never auto-synced at runtime.
