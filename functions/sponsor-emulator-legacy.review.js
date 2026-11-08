"use strict";
// REVIEW ONLY. Isolated RTDB emulator fixture for legacy-link inventory.
// Reads only the test-created subtree. Never accesses live account records.
const assert = require("node:assert/strict");
const {validateEmulatorEnvironment} = require("./sponsor-emulator-guard.review");
const {assessLinkWithInventory} = require("./sponsor-legacy-inventory.review");
async function main() {
  const guard = validateEmulatorEnvironment(process.env);
  assert.equal(guard.ok, true, guard.code);
  assert.equal(guard.host, "127.0.0.1:19130");
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:19131");
  const project = "demo-team-wolfpack-sponsorship-isolated";
  const namespace = project + "-default-rtdb";
  const key = "legacy_" + process.pid + "_" + Date.now();
  const base = "http://127.0.0.1:19130/sponsorAccountManagement/" + key +
    ".json?ns=" + encodeURIComponent(namespace);
  async function request(method, body) {
    return fetch(base, {method,
      ...(body === undefined ? {} : {headers: {"content-type": "application/json"},
        body: JSON.stringify(body)})});
  }
  assert.equal((await request("GET")).status, 200);
  try {
    const fixture = {
      canonical: {linksBySponsor: {}, linksByUid: {}, accountStatus: {}},
      legacy: {sponsorAccountLinks: {s1: "u1"}, sponsorAccountByUid: {u1: "s1"}},
    };
    assert.equal((await request("PUT", fixture)).status, 200);
    const stored = await (await request("GET")).json();
    const denied = assessLinkWithInventory({
      canonical: stored.canonical, legacy: stored.legacy, sponsorId: "s1", uid: "u1",
    });
    assert.equal(denied.ok, false);
    assert.equal(denied.code, "LEGACY_LINK_REVIEW_REQUIRED");
    assert.equal(denied.inventory.requiresReview, true);
    assert.equal(denied.inventory.migrationAuthorized, false);
    const inconsistent = structuredClone(fixture);
    inconsistent.legacy.sponsorAccountByUid.u1 = "s2";
    assert.equal((await request("PUT", inconsistent)).status, 200);
    const changed = await (await request("GET")).json();
    const mismatch = assessLinkWithInventory({
      canonical: changed.canonical, legacy: changed.legacy, sponsorId: "s1", uid: "u1",
    });
    assert.equal(mismatch.ok, false);
    assert.ok(mismatch.inventory.issueCodes.includes("LEGACY_INDEX_MISMATCH"));
    assert.equal(mismatch.inventory.migrationAuthorized, false);
    console.log("ISOLATED LEGACY SPONSOR INVENTORY FAIL-CLOSED TEST PASSED");
  } finally {
    assert.equal((await request("DELETE")).status, 200);
  }
}
main().catch(error => {console.error(error); process.exitCode = 1;});
