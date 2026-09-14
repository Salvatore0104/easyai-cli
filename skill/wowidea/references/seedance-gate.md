# Optional Seedance storyboard tools

Seedance accepts video generate --file request.json --idempotency-key <UUID> directly. No storyboard images, approval phrase, manifest state or price threshold is required. An existing manifest can be used with --manifest as an optional request format. For storyboard work explicitly requested by the user, legacy validate/approve/finalize remain available; their QC checks apply only to that optional workflow.

Use [execution](workflow.md) and [selection](auto-routing.md). Keep website capability checks, reference identity, watermark:false by default, one task key, and recovery without duplicate submission. Report actual media and available pointsUsage; missing billing is unknown, never zero.
