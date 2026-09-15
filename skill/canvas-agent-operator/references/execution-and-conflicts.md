# Execution and Conflicts

Read this reference for task execution, event recovery, collaboration watching, reference-contract failures, or unresolved `409` conflicts.

## Execution

```powershell
easyai-canvas run node NODE
easyai-canvas run group GROUP --wait --timeout 30m
easyai-canvas run canvas --wait --timeout 30m
easyai-canvas run status TASK
easyai-canvas run events TASK --after CURSOR
easyai-canvas run cancel TASK --reason "用户取消"
```

The server loads the authoritative saved graph. Node execution targets one node; group execution targets executable direct members; canvas execution targets all executable non-group nodes.

`run --wait` and `watch` emit NDJSON. Exit `2` means remote execution failure; exit `3` means local cancellation or timeout. A timeout does not imply that the accepted remote task stopped.

Persist the highest contiguous `eventSeq` and replay with `run events --after`. Deduplicate previously observed events and do not advance past a sequence gap.

## Reference failures

For `CANVAS_REFERENCE_CONTRACT_INVALID`, run `node inputs NODE` and correct every reported binding, prompt token, required mode input, or global asset token. Do not retry unchanged.

## Conflicts

Every write uses one `clientMutationId` and exact `baseVersion`. The CLI retries a `409` at most three times only when its touched nodes, edges, and data paths still match the baseline.

If the CLI reports a changed target:

1. Read the affected node or state.
2. Compare current data with the intended change.
3. Re-read the node type only if its kind or schema is now uncertain.
4. Submit a new minimal mutation with a new mutation ID.

Never force an overwrite. Reusing the original mutation ID after a transport failure returns its stored receipt.

## Collaboration

`watch` emits the initial state, normalized collaboration operations, Presence, and runtime progress. The Agent is temporary Presence, not a project member. On reconnect the CLI refreshes authoritative state, replays task events, obtains a new signed ticket, and rejoins.

The server-advertised WebSocket URL takes precedence. In standalone deployments where the ticket omits it, the CLI derives the same-origin `/socket.io` route after removing a trailing `/api` or `/api/vN` path. Use `EASYAI_CANVAS_WS_URL` only for deployments whose public WebSocket route is different; Desktop-managed tickets and explicit overrides are never rewritten.
