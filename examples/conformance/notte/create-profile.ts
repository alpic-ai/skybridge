/**
 * Open a live ChatGPT session on a Notte profile.
 *
 * Zero-dependency: runs directly with Node 24 against Notte's REST API.
 * Without arguments it creates a new profile; pass an existing
 * notte-profile-... id to reopen one (e.g. to refresh a login). Whatever you
 * do in the viewer persists into the profile when the session closes.
 * Connecting the conformance app itself doesn't require a Notte session:
 * connectors are account-level, so connect it from any browser logged into
 * the same ChatGPT account/workspace.
 *
 * Usage:
 *     NOTTE_API_KEY=... node create-profile.ts [name-or-profile-id]
 */

import { createInterface } from "node:readline/promises";

const API_URL = process.env.NOTTE_API_URL ?? "https://api.notte.cc";
const apiKey = process.env.NOTTE_API_KEY;
if (!apiKey) {
  console.error("NOTTE_API_KEY is not set");
  process.exit(1);
}

async function api<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "x-notte-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error(`${method} ${path} returned ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as T;
}

const arg = process.argv[2] ?? "chatgpt-conformance";
let profileId: string;
if (arg.startsWith("notte-profile-")) {
  profileId = arg;
  console.log(`reusing profile: ${profileId}`);
} else {
  const profile = await api<{ profile_id: string }>("/profiles/create", "POST", { name: arg });
  profileId = profile.profile_id;
  console.log(`profile created: ${profileId}`);
}

const session = await api<{ session_id: string; viewer_url: string }>("/sessions/start", "POST", {
  profile: { id: profileId, persist: true },
  headless: false,
  max_duration_minutes: 15,
  idle_timeout_minutes: 15,
});
console.log(`session started: ${session.session_id}`);
console.log(`\nOpen the viewer and log into the target ChatGPT account/workspace:\n${session.viewer_url}\n`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
await rl.question("Press Enter to close the session and save the profile... ");
rl.close();

await api(`/sessions/${session.session_id}/stop`, "DELETE");
console.log(`done — use profile_id=${profileId}`);
