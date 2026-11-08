"use strict";

// Pure, offline consistency checks for proposed sponsor-account linking.
// REVIEW ONLY: no Firebase imports, writes, migrations or production exports.
function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function inspectSponsorLink(stateInput, sponsorId, uid, legacyInput = {}) {
  const state = record(stateInput);
  const forward = record(state.linksBySponsor);
  const reverse = record(state.linksByUid);
  const statuses = record(state.accountStatus);
  const legacy = record(legacyInput);

  // Unknown legacy data must be inventoried before either path can be trusted.
  if (Object.keys(record(legacy.sponsorAccountLinks)).length ||
      Object.keys(record(legacy.sponsorAccountByUid)).length) {
    return {ok: false, code: "LEGACY_LINK_REVIEW_REQUIRED"};
  }

  const duplicateSponsors = Object.entries(forward)
    .filter(([id, linkedUid]) => id !== sponsorId && linkedUid === uid);
  const duplicateUids = Object.entries(reverse)
    .filter(([linkedUid, id]) => linkedUid !== uid && id === sponsorId);
  if (duplicateSponsors.length || duplicateUids.length) {
    return {ok: false, code: "DUPLICATE_LINK_CONFLICT"};
  }

  const linkedUid = forward[sponsorId];
  const linkedSponsor = reverse[uid];
  if (linkedUid && linkedUid !== uid) {
    return {ok: false, code: "SPONSOR_ALREADY_LINKED"};
  }
  if (linkedSponsor && linkedSponsor !== sponsorId) {
    return {ok: false, code: "ACCOUNT_ALREADY_LINKED"};
  }
  if (Boolean(linkedUid) !== Boolean(linkedSponsor)) {
    return {ok: false, code: "INCOMPLETE_ACCOUNT_LINK"};
  }

  // Reject any unrelated malformed forward/reverse pair before allowing a write.
  for (const [id, linkedUid] of Object.entries(forward)) {
    if (typeof linkedUid !== "string" || reverse[linkedUid] !== id) {
      return {ok: false, code: "GLOBAL_INDEX_MISMATCH"};
    }
  }
  for (const [linkedUid, id] of Object.entries(reverse)) {
    if (typeof id !== "string" || forward[id] !== linkedUid) {
      return {ok: false, code: "GLOBAL_INDEX_MISMATCH"};
    }
  }

  if (linkedUid === uid && linkedSponsor === sponsorId) {
    const status = statuses[uid];
    if (!status || status.sponsorId !== sponsorId ||
        typeof status.active !== "boolean") {
      return {ok: false, code: "STATUS_LINK_MISMATCH"};
    }
    return {ok: true, code: "ALREADY_LINKED", active: status.active};
  }

  if (statuses[uid]) {
    const status = statuses[uid];
    // Management deliberately retains an inactive status after unlink.
    // A matching inactive tombstone may be relinked; an active or
    // mismatched orphan status must fail closed.
    if (status && status.sponsorId === sponsorId && status.active === false) {
      return {ok: true, code: "UNLINKED_WITH_INACTIVE_HISTORY"};
    }
    return {ok: false, code: "ORPHAN_ACCOUNT_STATUS"};
  }
  return {ok: true, code: "UNLINKED"};
}

module.exports = {inspectSponsorLink};
