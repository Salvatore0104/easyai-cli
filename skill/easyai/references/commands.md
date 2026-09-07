# Command routing

Run `easyai <group> --help` when arguments are uncertain.

- Authentication: `auth status|login|logout|use-key`; account keys: `api-key create|list|revoke`.
- Discovery: `models list|show`, `balance`, `canvas project list|show`, `canvas node-types list|show|options`.
- Images: `image generate --file request.json`, then `image status` and `image download`.
- Videos: `video preflight --file request.json`; review quote; submit the same payload with `video generate --file request.json --quote ID`. Add `--yes --max-cost N` only after explicit approval in non-interactive work.
- Canvas edits: node, bind, edge, group, asset, and template subcommands. Use `canvas operation` for one low-level operation and `canvas batch` for up to 100 operations.
- Canvas execution: `canvas run PROJECT --node|--group|--all --preflight`, then repeat without `--preflight` using the quote and identical payload.
- Task observation does not authorize cancellation. Treat cancellation, deletion, key management, mutation, and generation as separate user actions.
- After an approved Seedance task finishes, use `seedance finalize MANIFEST --dir OUTPUT` to download outputs and create the ledger and QC artifacts. Inspect them manually; this command never regenerates.

Exit codes: 2 usage, 3 auth, 4 conflict, 5 service, 6 approval, 7 budget. A network error after submission has an uncertain outcome; query by the reported idempotency key and do not resubmit.
