import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { URL } from "node:url";
import { EasyAiApi } from "./api.js";
import { clearSecrets, getProfile, getSecret, saveProfile, setSecret } from "./config.js";
import { CliError, ExitCode } from "./errors.js";

const encode = (value: Buffer) => value.toString("base64url");

function openBrowser(url: string): void {
  const [command, args] = process.platform === "win32"
    ? ["cmd", ["/c", "start", "", url]]
    : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  const child = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
}

export async function browserLogin(profileName?: string, baseUrl?: string, timeoutMs = 120_000): Promise<Record<string, unknown>> {
  const profile = await getProfile(profileName, baseUrl);
  const verifier = encode(randomBytes(32));
  const challenge = encode(createHash("sha256").update(verifier).digest());
  const state = encode(randomBytes(18));
  const result = await new Promise<{ code: string; redirectUri: string }>((resolve, reject) => {
    const server = createServer((request, response) => {
      const callback = new URL(request.url || "/", "http://127.0.0.1");
      if (callback.pathname !== "/callback") { response.writeHead(404).end(); return; }
      if (callback.searchParams.get("state") !== state) { response.writeHead(400).end("State mismatch"); reject(new CliError("Login state mismatch.", ExitCode.Auth)); server.close(); return; }
      const code = callback.searchParams.get("code");
      if (!code) { response.writeHead(400).end("Missing code"); reject(new CliError("Login callback did not contain a code.", ExitCode.Auth)); server.close(); return; }
      response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" }).end("EasyAI CLI authorization complete. You may close this window.");
      resolve({ code, redirectUri: `http://127.0.0.1:${(server.address() as { port: number }).port}/callback` }); server.close();
    });
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as { port: number }).port;
      const redirectUri = `http://127.0.0.1:${port}/callback`;
      const authorize = new URL("/api/auth/cli/authorize", profile.config.baseUrl);
      authorize.search = new URLSearchParams({ redirect_uri: redirectUri, code_challenge: challenge, code_challenge_method: "S256", state, scope: "canvas:read canvas:write canvas:execute canvas:collaborate" }).toString();
      openBrowser(authorize.toString());
    });
    setTimeout(() => { server.close(); reject(new CliError("Browser login timed out.", ExitCode.Auth)); }, timeoutMs).unref();
  });
  const api = new EasyAiApi({ baseUrl: profile.config.baseUrl, timeoutMs });
  const token = await api.post<{ access_token?: string; token?: string; refresh_token?: string; expires_in?: number }>("/auth/cli/token", { grant_type: "authorization_code", code: result.code, redirect_uri: result.redirectUri, code_verifier: verifier });
  const accessToken = token.access_token || token.token;
  if (!accessToken) throw new CliError("Token exchange returned no access token.", ExitCode.Auth);
  await setSecret(profile.name, "session", JSON.stringify({ accessToken, refreshToken: token.refresh_token, expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined }));
  await saveProfile(profile.name, { baseUrl: profile.config.baseUrl, authMode: "login" });
  return { authenticated: true, profile: profile.name, baseUrl: profile.config.baseUrl, mode: "login" };
}

export async function useApiKey(apiKey: string, profileName?: string, baseUrl?: string): Promise<Record<string, unknown>> {
  if (!apiKey.trim()) throw new CliError("API key cannot be empty.", ExitCode.Usage);
  const profile = await getProfile(profileName, baseUrl);
  await setSecret(profile.name, "api-key", apiKey.trim());
  await saveProfile(profile.name, { baseUrl: profile.config.baseUrl, authMode: "api-key" });
  return { authenticated: true, profile: profile.name, baseUrl: profile.config.baseUrl, mode: "api-key" };
}

export async function authStatus(profileName?: string, baseUrl?: string): Promise<Record<string, unknown>> {
  const profile = await getProfile(profileName, baseUrl);
  let secret = null;
  try { secret = await getSecret(profile.name); } catch { /* credential backend unavailable */ }
  let expiresAt: string | null = null;
  if (secret?.kind === "session") try { const value = JSON.parse(secret.value) as { expiresAt?: number }; expiresAt = value.expiresAt ? new Date(value.expiresAt).toISOString() : null; } catch { /* legacy token */ }
  return { authenticated: Boolean(secret), profile: profile.name, baseUrl: profile.config.baseUrl, mode: secret?.kind || null, expiresAt };
}

export async function accessToken(profileName?: string, baseUrl?: string, timeoutMs = 30_000): Promise<string> {
  const profile = await getProfile(profileName, baseUrl); const secret = await getSecret(profile.name);
  if (!secret) throw new CliError("Not authenticated. Run easyai auth login or easyai auth use-key.", ExitCode.Auth);
  if (secret.kind === "api-key") return secret.value;
  let session: { accessToken: string; refreshToken?: string; expiresAt?: number };
  try { session = JSON.parse(secret.value); } catch { return secret.value; }
  if (!session.expiresAt || session.expiresAt > Date.now() + 60_000) return session.accessToken;
  if (!session.refreshToken) throw new CliError("Login session expired. Run easyai auth login again.", ExitCode.Auth);
  const api = new EasyAiApi({ baseUrl: profile.config.baseUrl, timeoutMs });
  const token = await api.post<{ access_token: string; refresh_token?: string; expires_in?: number }>("/auth/cli/token", { grant_type: "refresh_token", refresh_token: session.refreshToken });
  if (!token.access_token) throw new CliError("Session refresh returned no access token.", ExitCode.Auth);
  session = { accessToken: token.access_token, refreshToken: token.refresh_token || session.refreshToken, expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined };
  await setSecret(profile.name, "session", JSON.stringify(session)); return session.accessToken;
}

export async function logout(profileName?: string, baseUrl?: string): Promise<Record<string, unknown>> {
  const profile = await getProfile(profileName, baseUrl);
  try { const token = await accessToken(profile.name, baseUrl); await new EasyAiApi({ baseUrl: profile.config.baseUrl, token, timeoutMs: 10_000 }).post("/auth/cli/revoke"); } catch { /* local logout must still complete */ }
  await clearSecrets(profile.name);
  return { authenticated: false, profile: profile.name };
}
