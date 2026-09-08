# 项目档案与创作记录

适用于用户指定目录的持续设计项目，也兼容已有节目档案。单次设计不强制建档。非舞台项目沿用现有schema，将stage.screens留空、其他stage字符串留空；不要要求用户提供舞台信息或把品牌规格伪装成LED规格。项目主题和认可偏好使用theme/preferences，具体交付与生成设置写单次settings。

所有命令均支持全局 --json；以下命令完全本地运行，不访问账号或生成接口。

```text
wowidea --json project init --dir <节目目录> --name <节目名>
wowidea --json project show --dir <节目目录>
wowidea --json project validate --dir <节目目录>
wowidea --json project record --dir <节目目录> --file <创作记录.json>
wowidea --json guides list
wowidea --json guides show vj-recipes
```

明确节目目录后读取 `.wowidea/project.json`。不存在时初始化；不递归猜测其他节目的档案。一次性创作无节目目录时无需强制建档。init 不覆盖已有文件。

Codex 按用户输入编辑 name/theme/audience、stage.screens/viewingDistance/deliveryNotes、preferences.styles/preserve/avoid。屏幕宽高记录真实像素；未知时保留空 screens，不拿模型默认尺寸替代。长期风格更新必须来自用户明确认可；approvedDirections 记录 description、用户原话 confirmation、confirmedAt。用户纠正后修改对应偏好，保留单次记录追踪过程。

每次创作使用 `.wowidea/creations/` 中的独立记录，不修改长期风格。准备阶段可保存 draft id；得到任务 ID 后立即保存另一个 submitted id；恢复和 QC 后保存 result id。用同一 ID 前缀关联修订，已存在记录不覆盖。记录失败不能再次提交生成任务，先恢复本地记录。仅需交付最终稿时也必须在提交后及时保存 taskId。

```json
{
  "schemaVersion": "wowidea.creation/v1",
  "id": "opening-001-draft",
  "prompt": "实际完整提示词",
  "model": "具体模型 ID",
  "mode": "明确的实际模式",
  "settings": {"duration": 8, "aspectRatio": "16:9", "resolution": "以平台为准", "audio": false},
  "references": [
    {"type": "image", "role": "hero_shape", "source": "assets/hero.png", "scope": "主体轮廓", "preserve": ["轮廓"], "change": ["材质"]}
  ],
  "taskId": null,
  "outputs": [],
  "qc": {"verdict": "not_reviewed", "evidence": []}
}
```

相对素材和输出路径均相对节目目录解释。结果记录填写真实 taskId、outputs 和 qc；pass/revise 必须有 reviewedAt（ISO 时间）与实际视觉证据 evidence。没有调用 API 就保持 taskId:null，不编造成功结果。

共享档案只保存非秘密素材信息。API Key 和 MinIO 凭据不入档；签名 URL、执行请求和审批 manifest 放在节目目录的 `.wowidea/private/` 并加入该项目的忽略规则。临时签名 URL 不应替代稳定源文件路径。团队移交前明确哪些素材具有可共享权限。
