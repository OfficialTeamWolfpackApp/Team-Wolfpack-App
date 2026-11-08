"use strict";

// REVIEW ONLY. Pure operation-specific guards for an RTDB transaction snapshot.
// Authentication, legacy data and authorization must be checked separately.
const {inspectSponsorLink} = require("./sponsor-link-consistency.review");

function reviewTransition({operation, state, sponsorId, uid, legacy, active}) {
  if (!["link", "unlink", "setStatus"].includes(operation)) {
    return {ok: false, code: "UNSUPPORTED_OPERATION"};
  }
  if (typeof sponsorId !== "string" || !sponsorId.trim() ||
      typeof uid !== "string" || !uid.trim()) {
    return {ok: false, code: "INVALID_IDENTITY"};
  }
  const result = inspectSponsorLink(state, sponsorId, uid, legacy);
  if (!result.ok) return result;
  if (operation === "link") {
    if (result.code === "ALREADY_LINKED") {
      return {ok: true, code: "ALREADY_LINKED", noop: true};
    }
    return {ok: true, code: "CREATE_LINK", noop: false};
  }
  if (result.code !== "ALREADY_LINKED") {
    return {ok: false, code: "LINK_NOT_FOUND"};
  }
  if (operation === "unlink") {
    return {ok: true, code: "UNLINK_LINKED_ACCOUNT", noop: false};
  }
  if (typeof active !== "boolean") {
    return {ok: false, code: "INVALID_ACTIVE_STATUS"};
  }
  if (result.active === active) {
    return {ok: true, code: "STATUS_UNCHANGED", noop: true};
  }
  return {ok: true, code: "UPDATE_ACTIVE_STATUS", noop: false};
}

module.exports = {reviewTransition};
