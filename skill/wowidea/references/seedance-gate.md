# Seedance storyboard and execution gate

Applies to every Seedance version and prompt Skill that hands off generation.

1. Establish the exact operation and approved input plan: text-only, references, first/last frames, edit or continuation. Assign every asset a role; show image/video/audio counts. Do not silently add or omit assets.
2. Prepare actual storyboard images and [review them](storyboard-quality.md) against sources. Present them to the user and confirm the visual direction and final prompt before generation.
3. Prepare a private UTF-8 manifest: state, prompt, model, duration, aspectRatio, resolution, audio, watermark:false, mode, lastFrameRequested, storyboard, storyboardQc, references, referenceCounts. Storyboard items contain shot, description, image, sourceRoles; references contain type, role, localPath or url; counts use images, videos, audio. Review images are not automatically input references.
4. Prefer stable public URLs already accepted by the EasyAI platform and pass them directly through `video generate --manifest`; preserve reference order and roles. Do not require MinIO. Use `seedance upload-references` only as an optional compatibility path when the active platform operation explicitly requires a signed upload and the user has configured it.
5. Validate limits, media duration, mode/role and audio combinations. Always show complete shots, exact prompt, mode, model, duration, ratio, resolution, audio, reference roles/counts, last-frame choice and watermark:false before generation.
6. Storyboard image generation also uses single-task idempotency. Timeout/download failure requires recovery, not a new image call. --allow-reroll requires explicit intent for a new generation.
7. After the user confirms the storyboard and prompt direction, run `seedance validate manifest.json --for-approval`, then record the creative approval. Any change to storyboard, prompt intent, model, mode, references, duration, ratio, resolution or audio invalidates approval and requires renewed review.
8. Export seedance payload manifest.json --file request.json. Do not require a quote, point estimate or cost confirmation. A storyboard approval is the only creative gate.
9. Immediately before the paid call, verify serialized payload equals the latest approved manifest, all expected arrays are populated and watermark is exactly false. Submit once with one key using video generate --manifest. Existing IDs are polled only; uncertain acceptance is recovered, never duplicated.
10. On success run seedance finalize manifest.json --dir <absolute-directory>. Download video and any returned last frame promptly; record ledger and QC; do not report points. Inspect contact sheet, final frame and sampled bottom-right regions. State missing ffmpeg or unperformed motion/audio checks. Report task status, media paths and QC; do not report points. No automatic paid regeneration after QC.

Keep private manifests out of Git. Correct a rejected technical validation issue only without changing the approved creative/billable plan; material changes require new approval. See [recovery](workflow.md).
