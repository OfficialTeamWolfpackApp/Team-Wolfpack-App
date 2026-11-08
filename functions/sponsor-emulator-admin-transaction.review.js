"use strict";
// REVIEW ONLY: exercise real Firebase Admin SDK RTDB transactions against demo emulator.
const assert = require("node:assert/strict");
const admin = require("firebase-admin");
const {validateEmulatorEnvironment} = require("./sponsor-emulator-guard.review");
const {reviewTransactionCallback} = require("./sponsor-transaction-adapter.review");
async function main() {
  const guard = validateEmulatorEnvironment(process.env);
  assert.equal(guard.ok, true, guard.code);
  assert.equal(guard.host, "127.0.0.1:19130");
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:19131");
  const projectId = "demo-team-wolfpack-sponsorship-isolated";
  const app = admin.initializeApp({
    projectId,
    databaseURL: "http://127.0.0.1:19130?ns=" + projectId + "-default-rtdb",
  }, "sponsor-admin-emulator-review");
  const ref = app.database().ref("sponsorAccountManagement/admin_" +
    process.pid + "_" + Date.now());
  const input = {sponsorId: "s1", uid: "u1", administratorUid: "test-admin"};
  async function perform(operation, eventId, active) {
    let lastOutcome;
    const result = await ref.transaction(current => {
      const reviewed = reviewTransactionCallback(current, {
        ...input, operation, eventId, active, timestamp: 100,
      });
      lastOutcome = reviewed.outcome;
      return reviewed.nextValue;
    }, undefined, false);
    return {committed: result.committed, outcome: lastOutcome};
  }
  try {
    assert.equal((await perform("link", "linked")).committed, true);
    assert.equal((await perform("link", "duplicate")).committed, false);
    assert.equal((await perform("setStatus", "activated", true)).committed, true);
    assert.equal((await perform("setStatus", "same-status", true)).committed, false);
    assert.equal((await perform("setStatus", "deactivated", false)).committed, true);
    assert.equal((await perform("unlink", "unlinked")).committed, true);
    const state = (await ref.once("value")).val();
    assert.equal(state.linksBySponsor?.s1, undefined);
    assert.equal(state.linksByUid?.u1, undefined);
    assert.equal(state.accountStatus.u1.active, false);
    assert.deepEqual(Object.keys(state.auditEvents).sort(),
      ["activated", "deactivated", "linked", "unlinked"]);
    console.log("ISOLATED FIREBASE ADMIN SDK TRANSACTIONS PASSED");
  } finally {
    await ref.remove();
    await app.delete();
  }
}
main().catch(error => {console.error(error); process.exitCode = 1;});
