import assert from "node:assert/strict";
import { mkdtemp, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { AgromindClient, AgromindError } from "./index.js";

test("uploads once with server-side authorization and idempotency", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "agromind-sdk-"));
  const file = join(dir, "leaf.png");
  await writeFile(file, "image");
  t.after(async () => { await unlink(file); await rmdir(dir); });
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.agromind.farm/api/developer/v1/diagnoses/");
    assert.equal(options.headers["Idempotency-Key"], "request-1");
    assert.equal(options.redirect, "error");
    return { status: 200, json: async () => ({ plant_name: "Tomato" }) };
  };
  assert.equal((await new AgromindClient("sk_agm_test_example").diagnose(file, { idempotencyKey: "request-1" })).plant_name, "Tomato");
});

test("requires HTTPS and a valid idempotency key", async () => {
  assert.throws(() => new AgromindClient("sk_agm_test_example", { baseUrl: "http://example.com" }));
  await assert.rejects(new AgromindClient("sk_agm_test_example").diagnose("unused", { idempotencyKey: "bad key" }));
  assert.equal(new AgromindError(202, "processing").status, 202);
});
