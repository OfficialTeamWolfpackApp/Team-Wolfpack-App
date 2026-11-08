"use strict";
// REVIEW ONLY: synthetic Auth eligibility change after an RTDB commit.
// Demonstrates detection + authorized remediation proposal; does not execute remediation.
const assert = require("node:assert/strict");
const admin = require("firebase-admin");
const {validateEmulatorEnvironment} = require("./sponsor-emulator-guard.review");
const {reviewPostCommitEligibility} = require("./sponsor-post-commit-eligibility.review");
const {proposeSponsorRemediation} = require("./sponsor-remediation.review");
async function main() {
  const guard = validateEmulatorEnvironment(process.env);
  assert.equal(guard.ok, true, guard.code);
  assert.equal(guard.host, "127.0.0.1:19130");
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:19131");
  const projectId = "demo-team-wolfpack-sponsorship-isolated";
  const app = admin.initializeApp({projectId}, "sponsor-postcommit-review");
  const uid = "sponsor_postcommit_" + process.pid + "_" + Date.now();
  const sponsorId = "s1";
  const sponsor = {team: "wolfpack"};
  const authInput = user => ({uid, sponsor, user,
    adminUids: ["test-admin"], officialTeamAccountLinks: {}});
  const committed = {ok: true, code: "COMMITTED"};
  const state = {linksBySponsor: {[sponsorId]: uid},
    linksByUid: {[uid]: sponsorId},
    accountStatus: {[uid]: {sponsorId, active: true}},
    auditEvents: {initial: {action: "ACTIVATED"}}};
  try {
    await app.auth().createUser({uid, email: uid + "@example.test",
      emailVerified: true, disabled: false});
    const initial = reviewPostCommitEligibility({transactionResult: committed,
      eligibilityInput: authInput(await app.auth().getUser(uid)),
      snapshotVerifiedFresh: true, operation: "setStatus"});
    assert.equal(initial.ok, true);
    assert.equal(initial.atomicGuarantee, false);
    await app.auth().updateUser(uid, {disabled: true});
    const changed = reviewPostCommitEligibility({transactionResult: committed,
      eligibilityInput: authInput(await app.auth().getUser(uid)),
      snapshotVerifiedFresh: true, operation: "setStatus"});
    assert.equal(changed.ok, false);
    assert.equal(changed.action, "REQUIRE_AUTHORIZED_REMEDIATION");
    assert.equal(changed.reason, "ACCOUNT_NOT_ELIGIBLE");
    assert.equal(proposeSponsorRemediation({state, sponsorId, uid,
      eligibilityResult: changed, authorized: false, freshSnapshot: true,
      eventId: "remediate", administratorUid: "test-admin", timestamp: 200}).code,
    "AUTHORIZATION_REQUIRED");
    const proposal = proposeSponsorRemediation({state, sponsorId, uid,
      eligibilityResult: changed, authorized: true, freshSnapshot: true,
      eventId: "remediate", administratorUid: "test-admin", timestamp: 200});
    assert.equal(proposal.ok, true);
    assert.equal(proposal.nextState.accountStatus[uid].active, false);
    assert.equal(proposal.nextState.auditEvents.remediate.action, "DEACTIVATED");
    assert.equal(state.accountStatus[uid].active, true,
      "proposal must not write to original database state");
    console.log("ISOLATED POST-COMMIT AUTH CHANGE DETECTION PASSED");
  } finally {
    try { await app.auth().deleteUser(uid); } finally { await app.delete(); }
  }
}
main().catch(error => {console.error(error); process.exitCode = 1;});
