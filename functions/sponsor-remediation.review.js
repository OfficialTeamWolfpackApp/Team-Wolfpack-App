"use strict";

// REVIEW ONLY: a pure, fail-closed remediation proposal. Does not write RTDB.
// Caller must independently authorize administrator and verify a fresh snapshot.
const {inspectSponsorLink} = require("./sponsor-link-consistency.review");

function proposeSponsorRemediation({state, sponsorId, uid, eligibilityResult,
  authorized, freshSnapshot, eventId, administratorUid, timestamp, legacy}) {
  if (authorized !== true) return {ok: false, code: "AUTHORIZATION_REQUIRED"};
  if (freshSnapshot !== true) return {ok: false, code: "FRESH_SNAPSHOT_REQUIRED"};
  if (!eligibilityResult || eligibilityResult.ok !== false ||
      eligibilityResult.action !== "REQUIRE_AUTHORIZED_REMEDIATION") {
    return {ok: false, code: "REMEDIATION_NOT_REQUIRED"};
  }
  if (typeof sponsorId !== "string" || !sponsorId.trim() ||
      typeof uid !== "string" || !uid.trim()) {
    return {ok: false, code: "INVALID_IDENTITY"};
  }
  const inspection = inspectSponsorLink(state, sponsorId, uid, legacy);
  if (!inspection.ok) return {ok: false, code: inspection.code};
  if (inspection.code !== "ALREADY_LINKED") {
    return {ok: false, code: "LINK_NOT_FOUND"};
  }
  if (inspection.active === false) {
    return {ok: true, code: "ALREADY_INACTIVE", noop: true, nextState: null};
  }
  if (!state || !state.auditEvents || typeof state.auditEvents !== "object" ||
      Array.isArray(state.auditEvents) ||
      typeof eventId !== "string" || !eventId ||
      Object.hasOwn(state.auditEvents, eventId) ||
      typeof administratorUid !== "string" || !administratorUid ||
      !Number.isSafeInteger(timestamp) || timestamp < 0) {
    return {ok: false, code: "INVALID_AUDIT_METADATA"};
  }
  const nextState = {...state, accountStatus: {...state.accountStatus},
    auditEvents: {...state.auditEvents}};
  nextState.accountStatus[uid] = {...state.accountStatus[uid], active: false,
    updatedAt: timestamp};
  nextState.auditEvents[eventId] = {action: "DEACTIVATED",
    reason: "POST_COMMIT_ELIGIBILITY_CHANGED", sponsorId, uid,
    administratorUid, timestamp};
  return {ok: true, code: "DEACTIVATION_PROPOSED", noop: false, nextState};
}
module.exports = {proposeSponsorRemediation};
