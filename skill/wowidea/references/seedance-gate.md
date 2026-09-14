# Mandatory Seedance storyboard and cost gate

Every Seedance request requires storyboard images and visual QC before any paid video call. Present them for review. Revisions, questions, silence, or ambiguous language are not approval. Any change to creative intent, mode, references, duration, ratio, resolution, model, or audio invalidates approval.

## Preflight and approval

1. Establish the exact mode and reference plan. Assign each image, video, and audio reference one unique role; do not infer inclusion or omission.
2. Create storyboard images, inspect them using [storyboard quality](storyboard-quality.md), and record honest QC. Image generation used to make the board is a separate authorized action, not Seedance video approval.
3. Prepare a UTF-8 manifest containing the exact prompt, model, duration, aspect ratio, resolution, audio, `watermark:false`, mode, last-frame request, reference roles/counts, storyboard and QC.
4. For local approved references, run `seedance upload-references`; it uses the configured private MinIO store, creates temporary signed URLs and verifies readability. Redact signed query strings in any review copy.
5. Run `seedance validate <manifest> --verify-remote --for-approval`, then present the storyboard, reference counts and billable settings. Approve only after the user explicitly confirms the reviewed storyboard. Bind that decision with `seedance approve <manifest> --confirmation "I APPROVE STORYBOARD"`.
6. Immediately before submission, revalidate the approved manifest and confirm that the serialized payload has the same prompt/settings/reference counts and `watermark` is exactly `false`.

Submit exactly one task with `video generate --manifest <manifest> --idempotency-key <UUID>`. Never use raw request JSON for a Seedance paid call. Do not submit duplicates, comparisons, automatic retries, or aesthetic rerolls. If no task ID is returned, diagnose without changing the approved plan; material changes require a revised board and new approval. If a task ID exists, poll only that task.

After success, download outputs and the last frame promptly, then use `seedance finalize` to record settings, references, paths and QC. Inspect a contact sheet, final frame and bottom-right samples for adherence and visible watermark. Report defects and wait; QC never authorizes regeneration.
