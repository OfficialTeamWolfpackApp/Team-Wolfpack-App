"use strict";

// REVIEW ONLY. Both endpoint adapters can call this common policy,
// but it is NOT wired into live Firebase Functions.
const {inspectSponsorLink} = require("./sponsor-link-consistency.review");

function reviewSponsorOperation({operation, state, sponsorId, uid, legacy}) {
  if (operation !== "verify" && operation !== "link") {
    return {ok: false, code: "UNSUPPORTED_OPERATION"};
  }
  if (typeof sponsorId !== "string" || !sponsorId.trim() ||
      typeof uid !== "string" || !uid.trim()) {
    return {ok: false, code: "INVALID_IDENTITY"};
  }
  const result = inspectSponsorLink(state, sponsorId, uid, legacy);
  if (!result.ok) return result;
  if (operation === "link" && result.code === "ALREADY_LINKED") {
    return result.active
      ? {ok: false, code: "ALREADY_ACTIVE"}
      : {ok: false, code: "INACTIVE_LINK_REQUIRES_REVIEW"};
  }
  return result;
}

module.exports = {reviewSponsorOperation};
