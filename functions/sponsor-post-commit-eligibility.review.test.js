"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {reviewPostCommitEligibility: check} =
  require("./sponsor-post-commit-eligibility.review");
const valid = () => ({operation: "link", snapshotVerifiedFresh: true,
  transactionResult: {ok: true, code: "COMMITTED"},
  eligibilityInput: {uid: "u1", sponsor: {team: "wolfpack"},
    user: {uid: "u1", disabled: false, emailVerified: true, customClaims: {}},
    adminUids: [], officialTeamAccountLinks: {}}});
test("fresh eligible committed link may continue but not claim atomicity", () => {
  assert.deepEqual(check(valid()), {ok: true,
    code: "POST_COMMIT_ELIGIBILITY_CONFIRMED",
    action: "CONTINUE", atomicGuarantee: false});
});
test("disabled account after commit requires remediation", () => {
  const v = valid(); v.eligibilityInput.user.disabled = true;
  assert.equal(check(v).action, "REQUIRE_AUTHORIZED_REMEDIATION");
});
test("unverified account after commit requires remediation", () => {
  const v = valid(); v.eligibilityInput.user.emailVerified = false;
  assert.equal(check(v).reason, "ACCOUNT_NOT_ELIGIBLE");
});
test("new official claim after commit requires remediation", () => {
  const v = valid(); v.eligibilityInput.user.customClaims.officialMember = true;
  assert.equal(check(v).action, "REQUIRE_AUTHORIZED_REMEDIATION");
});
test("new official account mapping after commit requires remediation", () => {
  const v = valid(); v.eligibilityInput.officialTeamAccountLinks = {"mr-wolfie": "u1"};
  assert.equal(check(v).reason, "OFFICIAL_ACCOUNT_NOT_ELIGIBLE");
});
test("missing fresh snapshot flag holds", () => {
  const v = valid(); v.snapshotVerifiedFresh = false;
  assert.equal(check(v).code, "FRESH_SNAPSHOT_REQUIRED");
});
test("unverified transaction result holds", () => {
  const v = valid(); v.transactionResult = {ok: false, code: "AUDIT_COMMIT_MISMATCH"};
  assert.equal(check(v).code, "TRANSACTION_NOT_VERIFIED");
});
test("unlink is not subject to link eligibility recheck", () => {
  const v = valid(); v.operation = "unlink";
  assert.equal(check(v).code, "UNSUPPORTED_RECHECK_OPERATION");
});
test("status activation also requires post-commit eligibility", () => {
  const v = valid(); v.operation = "setStatus";
  assert.equal(check(v).code, "POST_COMMIT_ELIGIBILITY_CONFIRMED");
});
test("missing authoritative admin snapshot requires remediation", () => {
  const v = valid(); delete v.eligibilityInput.adminUids;
  assert.equal(check(v).reason, "ELIGIBILITY_DATA_INCOMPLETE");
});
