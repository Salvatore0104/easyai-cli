# Assets and Portraits

Read this reference only for ordinary assets, global asset tokens, or Seedance portrait workflows.

## Ordinary assets

Use server-returned assets and tokens; never synthesize an asset ID.

```powershell
easyai-canvas asset list
easyai-canvas asset add --kind image --label "产品" --file ./product.png
easyai-canvas asset add --kind character --label "角色" --resource workspace://resource/image/RESOURCE_ID
easyai-canvas asset reference NODE ASSET --field /prompt
easyai-canvas asset remove ASSET
```

An asset participates only when its exact `<<<asset:assetId>>>` token appears in a server-declared prompt path. `globalAssets.ignored` means the material is not used.

For unfamiliar asset kinds, read `node-types describe canvas.asset-library` and follow `assetLibraryProtocol`. Local files are uploaded first; do not reconstruct the canonical payload.
Prefer `--resource` for AI Creation outputs. Do not search the workspace with `find` or `ls` when the generation result already returned a resource ID or URI. Generation output `kind` is a media kind and is not the asset-library kind; choose `character`, `scene`, `prop`, or another server-declared asset kind from user intent.

`--resource` requires the Desktop broker's scoped workspace-resource resolver. In standalone online mode, use `--file` for a local readable file or `--url` for an already hosted HTTP(S) asset; do not pass a Desktop `workspace://` URI or resource ID to an independent client.

## Seedance portraits

Persistent Seedance portrait materials must come from the server:

```powershell
easyai-canvas portrait-asset capability
easyai-canvas portrait-asset groups
easyai-canvas portrait-asset list
easyai-canvas portrait-asset create --name "角色" --file ./portrait.png --confirm-rights
easyai-canvas portrait-asset add MATERIAL
```

- Require explicit confirmation that the user owns sufficient rights before `portrait-asset create`.
- Check `usable`; do not claim a pending material is ready.
- Use the returned `canvasAsset` and token. Never synthesize `materialId`, status, or provider payloads.
- In real-person or digital-human workflows, use the approved `seedance_portrait_asset` token as the identity source for every identity-consuming node.
- Do not also bind the original portrait image into storyboard, image, or video nodes. It may remain only as disconnected provenance.
- Product images, storyboard sheets, video, and audio remain ordinary slot inputs.
- After removing an old identity binding, use `node inputs NODE` because remaining media tokens may be renumbered; copy the exact returned tokens and require `valid: true` before execution.
