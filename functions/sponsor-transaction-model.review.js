"use strict";

// REVIEW ONLY: pure model of the existing sponsorAccountManagement RTDB transaction.
// Not wired to Functions. Legacy checks require a separately verified inventory.
const {reviewTransition} = require("./sponsor-link-transition.review");

function applySponsorTransition({state = {}, operation, sponsorId, uid, active, eventId,
  administratorUid, timestamp, legacy}) {
  const verdict = reviewTransition({state, operation, sponsorId, uid, active, legacy});
  if (!verdict.ok || verdict.noop) return {verdict, nextState: null};
  if (typeof eventId !== "string" || !eventId ||
      typeof administratorUid !== "string" || !administratorUid ||
      !Number.isSafeInteger(timestamp) || timestamp < 0) {
    return {verdict: {ok: false, code: "INVALID_AUDIT_METADATA"}, nextState: null};
  }
  const next = {...state,
    linksBySponsor: {...state.linksBySponsor},
    linksByUid: {...state.linksByUid},
    accountStatus: {...state.accountStatus},
    auditEvents: {...state.auditEvents}};
  if (Object.hasOwn(next.auditEvents, eventId)) {
    return {verdict: {ok: false, code: "DUPLICATE_AUDIT_EVENT"}, nextState: null};
  }
  let action;
  if (operation === "link") {
    next.linksBySponsor[sponsorId] = uid;
    next.linksByUid[uid] = sponsorId;
    next.accountStatus[uid] = {sponsorId, active: false, updatedAt: timestamp};
    action = "LINKED";
  } else if (operation === "unlink") {
    delete next.linksBySponsor[sponsorId];
    delete next.linksByUid[uid];
    next.accountStatus[uid] = {sponsorId, active: false, updatedAt: timestamp};
    action = "UNLINKED";
  } else {
    next.accountStatus[uid] = {sponsorId, active, updatedAt: timestamp};
    action = active ? "ACTIVATED" : "DEACTIVATED";
  }
  next.auditEvents[eventId] = {action, sponsorId, uid, administratorUid, timestamp};
  return {verdict, nextState: next};
}
module.exports = {applySponsorTransition};
