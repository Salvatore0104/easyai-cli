import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { CliError, ExitCode } from "./errors.js";

export interface ProfileConfig { baseUrl: string; authMode?: "login" | "api-key"; }
interface ConfigFile { currentProfile: string; profiles: Record<string, ProfileConfig>; }
const service = "easyai-cli";

export function configDir(): string {
  return process.env.EASYAI_CONFIG_DIR || join(homedir(), ".config", "easyai");
}

async function loadConfigFile(): Promise<ConfigFile> {
  try { return JSON.parse(await readFile(join(configDir(), "config.json"), "utf8")) as ConfigFile; }
  catch { return { currentProfile: "default", profiles: { default: { baseUrl: "https://ai.wowidea.top" } } }; }
}

export async function getProfile(name?: string, baseUrl?: string): Promise<{ name: string; config: ProfileConfig }> {
  const file = await loadConfigFile();
  const profileName = name || process.env.EASYAI_PROFILE || file.currentProfile || "default";
  const config = file.profiles[profileName] || { baseUrl: "https://ai.wowidea.top" };
  return { name: profileName, config: { ...config, baseUrl: (baseUrl || process.env.EASYAI_BASE_URL || config.baseUrl).replace(/\/+$/, "") } };
}

export async function saveProfile(name: string, update: Partial<ProfileConfig>): Promise<void> {
  const file = await loadConfigFile();
  file.currentProfile = name;
  file.profiles[name] = { baseUrl: "https://ai.wowidea.top", ...file.profiles[name], ...update };
  await mkdir(configDir(), { recursive: true });
  await writeFile(join(configDir(), "config.json"), JSON.stringify(file, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
}

async function keytar(): Promise<{ getPassword(s: string, a: string): Promise<string | null>; setPassword(s: string, a: string, p: string): Promise<void>; deletePassword(s: string, a: string): Promise<boolean> }> {
  try { return (await import("keytar")).default; }
  catch { throw new CliError("OS credential storage is unavailable. Install the optional keytar package or use EASYAI_API_KEY/EASYAI_ACCESS_TOKEN.", ExitCode.Auth); }
}

export async function setSecret(profile: string, kind: "api-key" | "session", value: string): Promise<void> {
  await (await keytar()).setPassword(service, `${profile}:${kind}`, value);
}
export async function getSecret(profile: string): Promise<{ kind: "api-key" | "session"; value: string } | null> {
  if (process.env.EASYAI_API_KEY) return { kind: "api-key", value: process.env.EASYAI_API_KEY };
  if (process.env.EASYAI_ACCESS_TOKEN) return { kind: "session", value: process.env.EASYAI_ACCESS_TOKEN };
  const store = await keytar();
  const apiKey = await store.getPassword(service, `${profile}:api-key`);
  if (apiKey) return { kind: "api-key", value: apiKey };
  const session = await store.getPassword(service, `${profile}:session`);
  return session ? { kind: "session", value: session } : null;
}
export async function clearSecrets(profile: string): Promise<void> {
  const store = await keytar();
  await Promise.all([store.deletePassword(service, `${profile}:api-key`), store.deletePassword(service, `${profile}:session`)]);
}

export async function creativeDefaults(): Promise<{ image: string; video: string }> {
  const saved = await readFile(join(configDir(), "wowidea-install.json"), "utf8").then(JSON.parse).catch(() => ({}));
  return { image: "Nano Banana 2", video: "豆包Seedance-2.0", ...saved.defaults };
}
