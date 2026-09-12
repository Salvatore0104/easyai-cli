# Execute and recover

Use project-local node .wowidea/runtime/dist/cli.js when initialized, otherwise installed wowidea. Determine purpose and stage before automatic routing; explicit settings take priority. Use UTF-8 JSON request files and persist one UUID key per generation before submitting.

Commands: image generate, image edit, video generate, video edit --file <request> --idempotency-key <UUID> --project-dir <project> --dir <outputs>. Edits use --parent <taskId> --change <summary> and actual source references. Image image/image_urls and video video_urls accept local paths or HTTPS URLs. files upload can upload explicitly; local references refresh after 24-hour expiry. Keep original files.

Seedance submits directly without storyboard or price approval. --manifest is optional. Default waits and downloads; --no-wait returns acceptance only. Retain the running process until completion. After acceptance use status/watch/download or tasks resume, never generate again for a timeout or missing output. If a user explicitly requests another identical result, use a new key with --allow-reroll.

Show local media, task state, pricing and pointsUsage. Missing actual charge/refund means interface unavailable; do not infer charges from balance differences. No automatic aesthetic rerolls. Inspect outputs and use [review](visual-review.md). Runs in .wowidea/runs retain task and revision context; never overwrite original media to implement a revision.
