import { CanvasApiClient, CanvasAuthStore, type CanvasCliConfig, type CanvasCliProfile } from "@easyaigc/canvas-cli";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { configDir } from "./config.js";
import { CliError, ExitCode } from "./errors.js";
import { writeJson } from "./storage.js";

export const canvasBaseUrl = "https://wowidea.top/api";
const service = "easyai-canvas-cli";
const tokenFields = new Set(["accessToken", "refreshToken"]);

type Keytar = {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
};

async function keytar(required = true): Promise<Keytar | undefined> {
  try { return (await import("keytar")).default; }
  catch {
    if (required) throw new CliError("OS credential storage is unavailable. Canvas login cannot persist tokens; use EASYAI_CANVAS_ACCESS_TOKEN and EASYAI_CANVAS_REFRESH_TOKEN for this process.", ExitCode.Auth);
    return undefined;
  }
}

function metadataPath(): string { return join(configDir(), "canvas.json"); }
function secretAccount(profile: string, kind: "access" | "refresh"): string { return `${profile}:${kind}`; }
function stripTokens(profile: CanvasCliProfile): CanvasCliProfile {
  return Object.fromEntries(Object.entries(profile).filter(([key]) => !tokenFields.has(key))) as CanvasCliProfile;
}

export class SecureCanvasAuthStore extends CanvasAuthStore {
  constructor() { super(metadataPath()); }

  override async read(): Promise<CanvasCliConfig> {
    try {
      const parsed = JSON.parse(await readFile(metadataPath(), "utf8"));
      return parsed && typeof parsed === "object" && parsed.profiles && typeof parsed.profiles === "object" ? parsed : { profiles: {} };
    } catch { return { profiles: {} }; }
  }

  override async get(profile = "default"): Promise<CanvasCliProfile | undefined> {
    const stored = (await this.read()).profiles[profile];
    const accessToken = process.env.EASYAI_CANVAS_ACCESS_TOKEN;
    const refreshToken = process.env.EASYAI_CANVAS_REFRESH_TOKEN;
    if (accessToken || refreshToken) return { baseUrl: canvasBaseUrl, ...stored, ...(accessToken ? { accessToken } : {}), ...(refreshToken ? { refreshToken } : {}) };
    const vault = await keytar(false);
    if (!stored && !vault) return undefined;
    const [access, refresh] = vault ? await Promise.all([
      vault.getPassword(service, secretAccount(profile, "access")),
      vault.getPassword(service, secretAccount(profile, "refresh")),
    ]) : [null, null];
    return { baseUrl: canvasBaseUrl, ...stored, ...(access ? { accessToken: access } : {}), ...(refresh ? { refreshToken: refresh } : {}) };
  }

  override async set(value: CanvasCliProfile, profile = "default"): Promise<void> {
    if (value.baseUrl && value.baseUrl.replace(/\/+$/, "") !== canvasBaseUrl) throw new CliError(`Canvas BaseURL is fixed to ${canvasBaseUrl}.`, ExitCode.Usage);
    const hasEnvironmentOverride = Boolean(process.env.EASYAI_CANVAS_ACCESS_TOKEN || process.env.EASYAI_CANVAS_REFRESH_TOKEN);
    if ((value.accessToken || value.refreshToken) && !hasEnvironmentOverride) {
      const vault = await keytar(true);
      await Promise.all([
        value.accessToken ? vault!.setPassword(service, secretAccount(profile, "access"), value.accessToken) : Promise.resolve(),
        value.refreshToken ? vault!.setPassword(service, secretAccount(profile, "refresh"), value.refreshToken) : Promise.resolve(),
      ]);
    }
    const config = await this.read();
    config.profiles[profile] = { ...stripTokens(value), baseUrl: canvasBaseUrl, updatedAt: new Date().toISOString() };
    await mkdir(configDir(), { recursive: true });
    await writeJson(metadataPath(), config);
  }

  override async delete(profile = "default"): Promise<void> {
    const vault = await keytar(false);
    if (vault) await Promise.all([
      vault.deletePassword(service, secretAccount(profile, "access")),
      vault.deletePassword(service, secretAccount(profile, "refresh")),
    ]);
    const config = await this.read();
    delete config.profiles[profile];
    await mkdir(configDir(), { recursive: true });
    await writeJson(metadataPath(), config);
  }
}

export async function canvasClient(profileName = "default"): Promise<{ client: CanvasApiClient; profile: CanvasCliProfile; store: SecureCanvasAuthStore }> {
  const store = new SecureCanvasAuthStore();
  const profile = await store.get(profileName);
  if (!profile?.accessToken && !profile?.refreshToken) throw new CliError(`Canvas OAuth login is required. Run easyai-canvas auth login --method password --account <account> --password-stdin --profile ${profileName}.`, ExitCode.Auth);
  const client = new CanvasApiClient({ ...profile, baseUrl: canvasBaseUrl }, undefined, async patch => {
    const current = await store.get(profileName) || { baseUrl: canvasBaseUrl };
    await store.set({ ...current, ...patch, baseUrl: canvasBaseUrl }, profileName);
  });
  return { client, profile: { ...profile, baseUrl: canvasBaseUrl }, store };
}
