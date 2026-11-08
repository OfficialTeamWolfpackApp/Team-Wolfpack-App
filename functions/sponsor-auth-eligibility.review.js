"use strict";

// REVIEW ONLY: pure eligibility decision for a snapshot of Firebase Auth and RTDB.
// Caller must independently verify the snapshot was fetched from trusted sources.
// This cannot lock Auth or RTDB data across a later transaction.
function evaluateSponsorEligibility(input = {}) {
  const {sponsor, user, uid, adminUids, officialTeamAccountLinks} = input;
  if (typeof uid !== "string" || !uid.trim()) {
    return {ok: false, code: "INVALID_IDENTITY"};
  }
  if (!sponsor || typeof sponsor !== "object" || Array.isArray(sponsor)) {
    return {ok: false, code: "SPONSOR_NOT_ELIGIBLE"};
  }
  if (sponsor.team === "sloan") {
    return {ok: false, code: "SPONSOR_NOT_ELIGIBLE"};
  }
  if (!user || typeof user !== "object" || user.uid !== uid) {
    return {ok: false, code: "ACCOUNT_NOT_FOUND"};
  }
  if (user.disabled !== false || user.emailVerified !== true ||
      user.customClaims?.officialMember === true ||
      (Array.isArray(adminUids) && adminUids.includes(uid))) {
    return {ok: false, code: "ACCOUNT_NOT_ELIGIBLE"};
  }
  // Fail closed unless the authoritative admin set and official links
  // have been explicitly supplied by the caller.
  if (!Array.isArray(adminUids) || !officialTeamAccountLinks ||
      typeof officialTeamAccountLinks !== "object" ||
      Array.isArray(officialTeamAccountLinks)) {
    return {ok: false, code: "ELIGIBILITY_DATA_INCOMPLETE"};
  }
  if (Object.values(officialTeamAccountLinks).includes(uid)) {
    return {ok: false, code: "OFFICIAL_ACCOUNT_NOT_ELIGIBLE"};
  }
  return {ok: true, code: "ELIGIBLE_FOR_PREFLIGHT_ONLY"};
}
module.exports = {evaluateSponsorEligibility};
