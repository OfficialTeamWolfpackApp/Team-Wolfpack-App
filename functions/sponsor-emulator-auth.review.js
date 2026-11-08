"use strict";
// REVIEW ONLY: synthetic Firebase Auth emulator eligibility test; no production users.
const assert = require("node:assert/strict");
const admin = require("firebase-admin");
const {validateEmulatorEnvironment} = require("./sponsor-emulator-guard.review");
const {evaluateSponsorEligibility} = require("./sponsor-auth-eligibility.review");
async function main() {
  const guard = validateEmulatorEnvironment(process.env);
  assert.equal(guard.ok, true, guard.code);
  assert.equal(guard.host, "127.0.0.1:19130");
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:19131");
  const projectId = "demo-team-wolfpack-sponsorship-isolated";
  const app = admin.initializeApp({projectId}, "sponsor-auth-review");
  const uid = "sponsor_test_" + process.pid + "_" + Date.now();
  const sponsor = {team: "wolfpack"};
  const input = {uid, sponsor, adminUids: ["test-admin"], officialTeamAccountLinks: {}};
  try {
    await app.auth().createUser({uid, email: uid + "@example.test",
      emailVerified: true, disabled: false});
    const eligible = evaluateSponsorEligibility({...input,
      user: await app.auth().getUser(uid)});
    assert.equal(eligible.ok, true);
    assert.equal(eligible.code, "ELIGIBLE_FOR_PREFLIGHT_ONLY");
    await app.auth().updateUser(uid, {emailVerified: false});
    assert.equal(evaluateSponsorEligibility({...input,
      user: await app.auth().getUser(uid)}).code, "ACCOUNT_NOT_ELIGIBLE");
    await app.auth().updateUser(uid, {emailVerified: true, disabled: true});
    assert.equal(evaluateSponsorEligibility({...input,
      user: await app.auth().getUser(uid)}).code, "ACCOUNT_NOT_ELIGIBLE");
    await app.auth().updateUser(uid, {disabled: false});
    await app.auth().setCustomUserClaims(uid, {officialMember: true});
    assert.equal(evaluateSponsorEligibility({...input,
      user: await app.auth().getUser(uid)}).code, "ACCOUNT_NOT_ELIGIBLE");
    await app.auth().setCustomUserClaims(uid, {});
    assert.equal(evaluateSponsorEligibility({...input,
      user: await app.auth().getUser(uid),
      officialTeamAccountLinks: {"mr-wolfie": uid}}).code,
    "OFFICIAL_ACCOUNT_NOT_ELIGIBLE");
    assert.equal(evaluateSponsorEligibility({...input,
      user: await app.auth().getUser(uid), adminUids: [uid]}).code,
    "ACCOUNT_NOT_ELIGIBLE");
    assert.equal(evaluateSponsorEligibility({...input,
      user: await app.auth().getUser(uid), adminUids: undefined}).code,
    "ELIGIBILITY_DATA_INCOMPLETE");
    console.log("ISOLATED FIREBASE AUTH SPONSOR ELIGIBILITY TEST PASSED");
  } finally {
    try { await app.auth().deleteUser(uid); } finally { await app.delete(); }
  }
}
main().catch(error => {console.error(error); process.exitCode = 1;});
