"use strict";
// Isolated Firebase RTDB emulator smoke test. Uses Node's built-in fetch.
// Run ONLY inside firebase emulators:exec with the dedicated demo project.
const assert = require("node:assert/strict");
const {validateEmulatorEnvironment} = require("./sponsor-emulator-guard.review");

async function main() {
  const env = validateEmulatorEnvironment(process.env);
  assert.equal(env.ok, true, env.code);
  assert.equal(env.host, "127.0.0.1:19130");
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:19131");
  const base = "http://127.0.0.1:19130";
  const project = "demo-team-wolfpack-sponsorship-isolated";
  const namespace = project + "-default-rtdb";
  const endpoint = (key) => base + "/sponsorAccountManagement/" + key +
    ".json?ns=" + encodeURIComponent(namespace);
  const key = "step38_" + process.pid + "_" + Date.now();
  const url = endpoint(key);
  const initial = {linksBySponsor: {s1: "u1"}, linksByUid: {u1: "s1"},
    accountStatus: {u1: {sponsorId: "s1", active: true}},
    auditEvents: {old: {action: "LINKED"}}};
  async function req(method, value, headers = {}) {
    const response = await fetch(url, {method, headers: {
      ...(value === undefined ? {} : {"content-type": "application/json"}), ...headers},
    ...(value === undefined ? {} : {body: JSON.stringify(value)})});
    return response;
  }
  // Emulator readiness is a hard gate before test writes.
  const health = await fetch(url);
  assert.equal(health.ok, true, "RTDB emulator readiness failed");
  try {
    assert.equal((await req("PUT", initial)).status, 200);
    const read = await req("GET", undefined, {"X-Firebase-ETag": "true"});
    assert.equal(read.ok, true);
    const etag = read.headers.get("etag");
    assert.ok(etag, "missing emulator ETag");
    const concurrent = structuredClone(initial);
    concurrent.auditEvents.other = {action: "OTHER"};
    assert.equal((await req("PUT", concurrent)).status, 200);
    const stale = structuredClone(initial);
    stale.accountStatus.u1.active = false;
    stale.auditEvents.new = {action: "DEACTIVATED"};
    const conflict = await req("PUT", stale, {"if-match": etag});
    assert.equal(conflict.status, 412, "stale compare-and-swap must fail");
    const fresh = await req("GET", undefined, {"X-Firebase-ETag": "true"});
    const current = await fresh.json();
    assert.equal(current.auditEvents.other.action, "OTHER");
    const next = structuredClone(current);
    next.accountStatus.u1.active = false;
    next.auditEvents.new = {action: "DEACTIVATED"};
    const committed = await req("PUT", next, {"if-match": fresh.headers.get("etag")});
    assert.equal(committed.status, 200);
    const final = await (await req("GET")).json();
    assert.equal(final.accountStatus.u1.active, false);
    assert.equal(final.auditEvents.old.action, "LINKED");
    assert.equal(final.auditEvents.other.action, "OTHER");
    assert.equal(final.auditEvents.new.action, "DEACTIVATED");
    console.log("ISOLATED RTDB EMULATOR CAS SMOKE TEST PASSED");
  } finally {
    const removed = await req("DELETE");
    assert.equal(removed.status, 200, "test-only cleanup failed");
  }
}
main().catch((error) => {console.error(error); process.exitCode = 1;});
