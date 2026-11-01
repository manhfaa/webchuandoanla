import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";

export class AgromindError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "AgromindError";
    this.status = status;
  }
}

export class AgromindClient {
  #key;
  #baseUrl;

  constructor(apiKey, { baseUrl = "https://api.agromind.farm" } = {}) {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("HTTPS base URL required");
    if (typeof apiKey !== "string" || !apiKey.startsWith("sk_agm_") || /[\r\n]/.test(apiKey)) throw new Error("Invalid API key");
    this.#key = apiKey;
    this.#baseUrl = baseUrl.replace(/\/$/, "");
  }

  async diagnose(imagePath, { idempotencyKey, timeoutMs = 60000 } = {}) {
    if (typeof idempotencyKey !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(idempotencyKey)) throw new Error("Invalid idempotency key");
    if ((await stat(imagePath)).size > 8 * 1024 * 1024) throw new Error("Image exceeds 8 MB");
    const file = await readFile(imagePath);
    if (file.length > 8 * 1024 * 1024) throw new Error("Image exceeds 8 MB");
    const data = new FormData();
    data.append("image", new Blob([file]), basename(imagePath));
    const response = await fetch(`${this.#baseUrl}/api/developer/v1/diagnoses/`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(timeoutMs),
      headers: { Authorization: `Bearer ${this.#key}`, "Idempotency-Key": idempotencyKey }, body: data,
    });
    let payload;
    try { payload = await response.json(); } catch { throw new AgromindError(response.status, "Unexpected API response"); }
    if (response.status !== 200) throw new AgromindError(response.status, typeof payload?.detail === "string" ? payload.detail : "API request failed");
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new AgromindError(response.status, "Unexpected API response");
    return payload;
  }
}
