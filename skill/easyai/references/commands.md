# Command routing

Use CLI help for exact arguments. `wowidea` uses API-key authentication for model discovery, pricing and explicit `--direct`. `easyai-canvas` uses a separate scoped OAuth session and the fixed `https://wowidea.top/api` BaseURL. Default media creation uses the directory binding in `.wowidea/canvas.json`; full Canvas control uses the official command tree. Media execution, costs and recovery follow [the shared workflow](../../wowidea/references/workflow.md).

Canvas edits require current project state and version checks. Seedance cannot bypass its manifest through canvas execution. Observation does not authorize cancellation. Large output supports --output. Exit codes: 2 usage, 3 auth, 4 conflict, 5 service/uncertain, 6 approval, 7 budget.
