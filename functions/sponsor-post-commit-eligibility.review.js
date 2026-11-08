"use strict";

// REVIEW ONLY. A post-commit eligibility recheck cannot make Auth + RTDB
// atomic. Any failed recheck requires a separate authorized remediation path.
const {evaluateSponsorEligibility} = require("./sponsor-auth-eligibility.review");

function reviewPostCommitEligibility({transactionResult, eligibilityInput,
  snapshotVerifiedFresh, operation}) {
  if (!transactionResult || transactionResult.ok !== true ||
      transactionResult.code !== "COMMITTED") {
    return {ok: false, code: "TRANSACTION_NOT_VERIFIED", action: "HOLD"};
  }
  if (operation !== "link" && operation !== "setStatus") {
    return {ok: false, code: "UNSUPPORTED_RECHECK_OPERATION", action: "HOLD"};
  }
  if (snapshotVerifiedFresh !== true) {
    return {ok: false, code: "FRESH_SNAPSHOT_REQUIRED", action: "HOLD"};
  }
  const eligibility = evaluateSponsorEligibility(eligibilityInput);
  if (!eligibility.ok) {
    return {ok: false, code: "POST_COMMIT_ELIGIBILITY_CHANGED",
      reason: eligibility.code, action: "REQUIRE_AUTHORIZED_REMEDIATION"};
  }
  return {ok: true, code: "POST_COMMIT_ELIGIBILITY_CONFIRMED",
    action: "CONTINUE", atomicGuarantee: false};
}
module.exports = {reviewPostCommitEligibility};
