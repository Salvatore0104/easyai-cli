import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CliError, ExitCode } from "./errors.js";

export const guideVersion = "0.3.2";
export const guideRegistry = [
  ["design-tasks", "按设计用途分流"],
  ["production-rounds", "按创作轮次推进"], ["recipe-authoring", "编写与复用创作配方"],
  ["creative-direction", "设计意图与美术方向"], ["vj-recipes", "VJ 与舞台创作方法"],
  ["project-workflow", "项目档案与创作记录"], ["reference-planning", "素材角色与顺序"],
  ["visual-review", "按任务意图评审"], ["seedance-20", "Seedance 2.0"],
  ["seedance-25", "Seedance 2.5"], ["minimax-h3", "MiniMax H3 / H3-Max"],
  ["nano-banana", "Nano Banana"], ["gpt-image", "GPT Image 2"],
  ["google-omni", "Google Omni"], ["wan", "Wan3.0"],
  ["seedance-gate", "Seedance 审批与执行"], ["storyboard-quality", "分镜质检"],
  ["image-case-index", "精选图片案例索引"], ["sources", "来源与许可"], ["workflow", "执行与恢复"],
].map(([id, title]) => ({ id: id!, title: title!, guide: `references/${id}.md`, version: guideVersion }));
export function guideInfo(id: string) {
  const entry = guideRegistry.find(g => g.id === id);
  if (!entry) throw new CliError("Unknown guide; use guides list.", ExitCode.Usage);
  // Both src and bundled dist are one level below the package root. Never use cwd or a mutable installed Skill copy.
  return { ...entry, path: resolve(dirname(fileURLToPath(import.meta.url)), "../skill/wowidea", entry.guide) };
}
export async function showGuide(id: string) {
  const info = guideInfo(id);
  return { ...info, content: await readFile(info.path, "utf8") };
}
