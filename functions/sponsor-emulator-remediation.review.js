"use strict";
// REVIEW ONLY: authorized remediation in a synthetic isolated RTDB emulator.
// Authorization and snapshot freshness are test assertions, NOT a production security boundary.
const assert = require("node:assert/strict");
const admin = require("firebase-admin");
const {validateEmulatorEnvironment} = require("./sponsor-emulator-guard.review");
const {proposeSponsorRemediation} = require("./sponsor-remediation.review");
async function main() {
  const guard = validateEmulatorEnvironment(process.env);
  assert.equal(guard.ok, true, guard.code);
  assert.equal(guard.host, "127.0.0.1:19130");
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:19131");
  const projectId = "demo-team-wolfpack-sponsorship-isolated";
  const app = admin.initializeApp({projectId,
    databaseURL: "https://" + projectId + "-default-rtdb.firebaseio.com"},
  "sponsor-remediation-review");
  const ref = app.database().ref("sponsorAccountManagement/remediation_" +
    process.pid + "_" + Date.now());
  const uid = "u1", sponsorId = "s1";
  const eligibilityResult = {ok: false,
    action: "REQUIRE_AUTHORIZED_REMEDIATION"};
  const input = {sponsorId, uid, eligibilityResult, freshSnapshot: true,
    eventId: "remediation-1", administratorUid: "test-admin", timestamp: 200};
  const original = {linksBySponsor: {s1: uid}, linksByUid: {[uid]: sponsorId},
    accountStatus: {[uid]: {sponsorId, active: true, updatedAt: 100}},
    auditEvents: {"linked-1": {action: "ACTIVATED"}}};
  try {
    await ref.set(original);
    await new Promise((resolve, reject) => {
      let initialized = false;
      ref.on("value", () => {if (!initialized) {initialized = true; resolve();}},
        reject);
    });
    async function transact(authorized, eventId, overrides = {}) {
      let verdict;
      const result = await ref.transaction(current => {
        verdict = proposeSponsorRemediation({...input, ...overrides, eventId, authorized,
          state: current});
        return verdict.ok && !verdict.noop ? verdict.nextState : undefined;
      }, undefined, false);
      return {result, verdict};
    }
    const denied = await transact(false, "denied-1");
    assert.equal(denied.result.committed, false);
    assert.equal(denied.verdict.code, "AUTHORIZATION_REQUIRED");
    assert.deepEqual((await ref.once("value")).val(), original);
    const stale = await transact(true, "stale-1", {freshSnapshot: false});
    assert.equal(stale.result.committed, false);
    assert.equal(stale.verdict.code, "FRESH_SNAPSHOT_REQUIRED");
    const wrongIdentity = await transact(true, "wrong-link-1", {uid: "u2"});
    assert.equal(wrongIdentity.result.committed, false);
    assert.equal(wrongIdentity.verdict.code, "LINK_NOT_FOUND");
    const noReason = await transact(true, "no-reason-1", {
      eligibilityResult: {ok: true, action: "CONTINUE"},
    });
    assert.equal(noReason.result.committed, false);
    assert.equal(noReason.verdict.code, "REMEDIATION_NOT_REQUIRED");
    assert.deepEqual((await ref.once("value")).val(), original);
    const applied = await transact(true, "remediation-1");
    assert.equal(applied.result.committed, true);
    assert.equal(applied.verdict.code, "DEACTIVATION_PROPOSED");
    const state = (await ref.once("value")).val();
    assert.equal(state.accountStatus[uid].active, false);
    assert.equal(state.linksBySponsor.s1, uid);
    assert.equal(state.linksByUid[uid], sponsorId);
    assert.equal(state.auditEvents["remediation-1"].reason,
      "POST_COMMIT_ELIGIBILITY_CHANGED");
    assert.equal(Object.keys(state.auditEvents).length, 2);
    const duplicate = await transact(true, "remediation-2");
    assert.equal(duplicate.result.committed, false);
    assert.equal(duplicate.verdict.code, "ALREADY_INACTIVE");
    assert.equal((await ref.once("value")).val().auditEvents["remediation-2"],
      undefined);
    assert.equal(Object.keys((await ref.once("value")).val().auditEvents).length, 2);
    console.log("ISOLATED FIREBASE ADMIN SDK REMEDIATION NEGATIVE CASES PASSED");
    console.log("ISOLATED FIREBASE ADMIN SDK REMEDIATION TRANSACTION PASSED");
  } finally {
    ref.off("value");
    await ref.remove();
    await app.delete();
  }
}
main().catch(error => {console.error(error); process.exitCode = 1;});
