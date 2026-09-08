# Seedance gate

Historical 0.2.0 guidance below is superseded by wowidea/references/seedance-gate.md in 0.2.2: only Seedance video has a cost gate. At or below 200 quoted points, prepare the manifest and generate without asking; only above 200 ask once for storyboard/settings/cost confirmation. Other models submit directly. Report actual points after completion. Preserve technical validation and no-retry rules.

Prepare a storyboard and storyboard images first and show them for review. Approval requires an explicit user statement approving those images for generation; questions, revisions, silence, or ambiguous language are not approval.

Before asking for paid approval:

1. Fix the exact mode: text, image/video/audio references, first/last frame, edit, continuation, or an explicitly supported combination.
2. Give every reference one role. Upload approved local media to private MinIO, create temporary signed GET URLs, verify readability, and show final image/video/audio counts.
3. Create a UTF-8 manifest containing the exact prompt, model, duration, aspect ratio, resolution, audio, reference roles/counts, last-frame choice, and `watermark: false`.
4. Run `easyai seedance validate`; approve only after images are accepted. Any creative, reference, mode, or billable-setting change invalidates approval.
5. Run video preflight with the exact serialized payload. Summarize shots and billable settings, then obtain cost-aware confirmation.

Submit exactly one task. Do not retry, re-roll, compare, or change the mode after an error. If a task ID exists, poll only it. Download the video and returned last frame, record settings and paths in a ledger, and inspect a contact sheet, final frame, and sampled bottom-right regions for visible watermark and prompt adherence. Report QC without regenerating.

For the existing fantasy-dancer project only, a future user-approved revision should prioritize realistic delayed translucent-silk motion and reduce synthetic bloom/sparkle. This note does not authorize a retry.
