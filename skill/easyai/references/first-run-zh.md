# 首次调用模板

安装后，用户可以对 Codex 说：

```text
使用 EasyAI CLI 查看我的模型、余额和无限画布项目。只做只读操作，返回 JSON，不要生成图片或视频。
```

如果需要安装 Skill：

```text
请使用仓库中的 skill/easyai Skill，通过 EasyAI CLI 查看我的模型和余额，只读操作。
```

API Key 不要直接写进对话。让用户在自己的终端设置 `EASYAI_API_KEY`，或用 `--api-key-stdin` 单次注入。CLI 不需要浏览器登录即可工作。
