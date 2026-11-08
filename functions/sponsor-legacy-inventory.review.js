"use strict";

// REVIEW ONLY: offline inventory of legacy sponsor link paths. Never writes.
// This is a diagnostic, not proof that a live database has no legacy records.
const {inspectSponsorLink} = require("./sponsor-link-consistency.review");
const record = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};

function inventorySponsorLinks(canonicalInput, legacyInput) {
  const canonical = record(canonicalInput);
  const legacy = record(legacyInput);
  const forward = record(canonical.linksBySponsor);
  const reverse = record(canonical.linksByUid);
  const oldForward = record(legacy.sponsorAccountLinks);
  const oldReverse = record(legacy.sponsorAccountByUid);
  const issues = [];
  for (const [sponsorId, uid] of Object.entries(oldForward)) {
    if (typeof uid !== "string" || !uid) {
      issues.push({code: "INVALID_LEGACY_FORWARD", sponsorId});
    } else if (oldReverse[uid] !== sponsorId) {
      issues.push({code: "LEGACY_INDEX_MISMATCH", sponsorId});
    }
    if (forward[sponsorId] && forward[sponsorId] !== uid) {
      issues.push({code: "CANONICAL_SPONSOR_CONFLICT", sponsorId});
    }
    if (typeof uid === "string" && reverse[uid] && reverse[uid] !== sponsorId) {
      issues.push({code: "CANONICAL_UID_CONFLICT", sponsorId});
    }
  }
  for (const [uid, sponsorId] of Object.entries(oldReverse)) {
    if (typeof sponsorId !== "string" || !sponsorId) {
      issues.push({code: "INVALID_LEGACY_REVERSE", uid});
    } else if (oldForward[sponsorId] !== uid) {
      issues.push({code: "LEGACY_INDEX_MISMATCH", uid});
    }
  }
  const legacyCount = Object.keys(oldForward).length + Object.keys(oldReverse).length;
  const canonicalForwardCount = Object.keys(forward).length;
  const canonicalReverseCount = Object.keys(reverse).length;
  // Do not enumerate personal account IDs in the summary.
  return {
    canonicalForwardCount, canonicalReverseCount,
    legacyForwardCount: Object.keys(oldForward).length,
    legacyReverseCount: Object.keys(oldReverse).length,
    issueCodes: [...new Set(issues.map(x => x.code))].sort(),
    requiresReview: legacyCount > 0 || issues.length > 0,
    migrationAuthorized: false,
  };
}

function assessLinkWithInventory({canonical, legacy, sponsorId, uid}) {
  const inventory = inventorySponsorLinks(canonical, legacy);
  if (inventory.requiresReview) {
    return {ok: false, code: "LEGACY_LINK_REVIEW_REQUIRED", inventory};
  }
  return { ...inspectSponsorLink(canonical, sponsorId, uid, legacy), inventory };
}

module.exports = {inventorySponsorLinks, assessLinkWithInventory};
