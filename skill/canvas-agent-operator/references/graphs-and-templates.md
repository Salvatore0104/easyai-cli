# Graphs and Templates

Read this reference for complex multi-node graphs, groups, template operations, or unfamiliar reference slots.

## Bindings and references

`referenceProtocol` from `node-types describe KIND` is authoritative for slot names, accepted types, multiplicity, mode rules, and prompt token templates.

- Prefer `node add --bind` when creating a connected node.
- Use `node bind` and `node unbind` for existing nodes.
- A plain incoming edge is not a strict reference binding; execution may ignore it.
- For nodes that require prompt mentions, run `node inputs NODE` and copy exact tokens such as `<<<image_1>>>`; do not calculate tokens.

## Groups

```powershell
easyai-canvas group create --members NODE1,NODE2 --label "场景"
easyai-canvas group ungroup GROUP
```

Use structured group commands. Do not emulate grouping with independent moves. The server owns coordinate conversion and rejects nested or invalid groups atomically.

## Templates

```powershell
easyai-canvas template list --source all
easyai-canvas template get TEMPLATE --snapshot
easyai-canvas template create --title "模板" --node NODE --scope personal
easyai-canvas template import TEMPLATE --position 1200,320
```

System templates can expose selected nodes and assets; require the explicit public confirmation flag. Keep template selection minimal and use a stable mutation ID when replay may be necessary.
