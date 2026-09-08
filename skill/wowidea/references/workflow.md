# Execute and recover

Use installed wowidea (easyai compatible). Check help when uncertain. Use the website account key through existing credentials or hidden auth use-key --prompt. No provider keys or browser login. Run models route for exact current capability; guides are not API schemas.

Write a UTF-8 request and save one UUID key before submission. Authorized images and non-Seedance videos:

```text
wowidea --json image generate --file request.json --idempotency-key <UUID> --dir <directory>
wowidea --json video generate --file request.json --idempotency-key <UUID> --dir <directory>
```

Default generation waits and downloads. --no-wait is only for explicit background requests, with later recovery/delivery. Present returned absolute paths as local media. Keep stdout as the final JSON envelope; do not merge stderr into it.

Seedance follows [approval](seedance-gate.md), manifest and creative approval and technical validation.

Once an ID exists, query only it using image/video status, watch or download. watch can end after 30 minutes; continue observation of the same ID. For uncertainty use tasks list and tasks resume <idempotencyKey>, both read-only. Unique task deltas can recover acceptance; ambiguous candidates stay unresolved. Known rejected requests must not recover an unrelated task. Never POST again because of timeout, restart, missing URL or failed download.

Validation errors do not authorize changing creative/billable settings. No automatic paid retries, model switches or aesthetic rerolls. Successful tasks temporarily missing URLs are queried again, not regenerated. Failed result downloads are retrieval problems.

Report task status and media paths; do not report billing. Save task/settings/references/outputs/QC in project records when used. Inspect media before quality claims. Partial completion remains partial.
