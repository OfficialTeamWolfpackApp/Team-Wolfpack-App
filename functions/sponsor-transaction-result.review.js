"use strict";

// REVIEW ONLY. Finalize an RTDB transaction from its final result, not from
// a mutable variable assigned during a potentially retried update callback.
const {inspectSponsorLink} = require("./sponsor-link-consistency.review");

function finalizeSponsorTransaction({operation, sponsorId, uid, active, committed,
  snapshot, eventId, legacy}) {
  if (!["link", "unlink", "setStatus"].includes(operation)) {
    return {ok: false, httpStatus: 400, code: "UNSUPPORTED_OPERATION"};
  }
  if (typeof sponsorId !== "string" || !sponsorId.trim() ||
      typeof uid !== "string" || !uid.trim()) {
    return {ok: false, httpStatus: 400, code: "INVALID_IDENTITY"};
  }
  if (typeof committed !== "boolean") {
    return {ok: false, httpStatus: 500, code: "UNKNOWN_TRANSACTION_RESULT"};
  }
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return {ok: false, httpStatus: 500, code: "MISSING_FINAL_SNAPSHOT"};
  }
  const state = snapshot;
  const inspection = inspectSponsorLink(state, sponsorId, uid, legacy);
  if (!inspection.ok) {
    return {ok: false, httpStatus: 409, code: inspection.code};
  }
  if (!committed) {
    // The original endpoint treats an already linked pair as idempotent.
    if (operation === "link" && inspection.code === "ALREADY_LINKED") {
      return {ok: true, httpStatus: 200, code: "ALREADY_LINKED", alreadyLinked: true};
    }
    return {ok: false, httpStatus: 409, code: "TRANSACTION_NOT_COMMITTED"};
  }
  // Only a committed snapshot with the matching audit event can prove a write.
  const audit = state.auditEvents && state.auditEvents[eventId];
  const expectedAction = operation === "link" ? "LINKED" :
    operation === "unlink" ? "UNLINKED" : active === true ? "ACTIVATED" : "DEACTIVATED";
  if (typeof eventId !== "string" || !eventId ||
      !audit || audit.action !== expectedAction ||
      audit.sponsorId !== sponsorId || audit.uid !== uid) {
    return {ok: false, httpStatus: 500, code: "AUDIT_COMMIT_MISMATCH"};
  }
  const expectedLink = operation !== "unlink";
  if ((inspection.code === "ALREADY_LINKED") !== expectedLink) {
    return {ok: false, httpStatus: 500, code: "FINAL_LINK_STATE_MISMATCH"};
  }
  if (operation === "unlink") {
    const status = state.accountStatus && state.accountStatus[uid];
    if (!status || status.sponsorId !== sponsorId || status.active !== false) {
      return {ok: false, httpStatus: 500, code: "FINAL_STATUS_MISMATCH"};
    }
  }
  if (operation === "setStatus" &&
      (typeof active !== "boolean" || inspection.active !== active)) {
    return {ok: false, httpStatus: 500, code: "FINAL_STATUS_MISMATCH"};
  }
  if (operation === "link" && inspection.active !== false) {
    return {ok: false, httpStatus: 500, code: "FINAL_STATUS_MISMATCH"};
  }
  return {ok: true, httpStatus: 200, code: "COMMITTED", alreadyLinked: false};
}

module.exports = {finalizeSponsorTransaction};
