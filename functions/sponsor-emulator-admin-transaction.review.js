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
    databaseURL: "https://" + projectId + "-default-rtdb.firebaseio.com",
  }, "sponsor-admin-emulator-review");
  const ref = app.database().ref("sponsorAccountManagement/admin_" +
    process.pid + "_" + Date.now());
  const input = {sponsorId: "s1", uid: "u1", administratorUid: "test-admin"};
  // Keep an active value subscription so the SDK transaction callback has a
  // synchronized snapshot; a one-shot read alone did not maintain this cache.
  const onValue = () => {};
  async function perform(operation, eventId, active, overrides = {}) {
    let lastOutcome;
    const result = await ref.transaction(current => {
      const reviewed = reviewTransactionCallback(current, {
        ...input, ...overrides, operation, eventId, active, timestamp: 100,
      });
      lastOutcome = reviewed.outcome;
      return reviewed.nextValue;
    }, undefined, false);
    const status = (await ref.once("value")).val()?.accountStatus?.u1;
    console.log("ADMIN TRANSACTION DIAGNOSTIC", JSON.stringify({operation, eventId,
      committed: result.committed, outcome: lastOutcome, active: status?.active}));
    return {committed: result.committed, outcome: lastOutcome};
  }
  try {
    await new Promise((resolve, reject) => ref.on("value", () => {
      onValue(); resolve();
    }, reject));
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
    // A second sponsor can link, but the same sponsor cannot be reassigned
    // to another UID by a later transaction.
    assert.equal((await perform("link", "second-linked", undefined,
      {sponsorId: "s2", uid: "u2"})).committed, true);
    const conflict = await perform("link", "conflicting-link", undefined,
      {sponsorId: "s2", uid: "u3"});
    assert.equal(conflict.committed, false);
    assert.equal(conflict.outcome, "DUPLICATE_LINK_CONFLICT");
    const afterConflict = (await ref.once("value")).val();
    assert.equal(afterConflict.linksBySponsor.s2, "u2");
    assert.equal(afterConflict.linksByUid.u2, "s2");
    assert.equal(afterConflict.linksByUid.u3, undefined);
    assert.equal(afterConflict.auditEvents["conflicting-link"], undefined);
    assert.equal(Object.keys(afterConflict.auditEvents).length, 5);
    console.log("ISOLATED FIREBASE ADMIN SDK CONFLICT TEST PASSED");
    console.log("ISOLATED FIREBASE ADMIN SDK TRANSACTIONS PASSED");
  } finally {
    ref.off("value");
    await ref.remove();
    await app.delete();
  }
}
main().catch(error => {console.error(error); process.exitCode = 1;});
