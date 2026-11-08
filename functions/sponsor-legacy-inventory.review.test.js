"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {inventorySponsorLinks: inventory, assessLinkWithInventory: assess} =
  require("./sponsor-legacy-inventory.review");
test("empty inventory reports no legacy records", () => {
  assert.deepEqual(inventory({}, {}), {
    canonicalForwardCount: 0, canonicalReverseCount: 0,
    legacyForwardCount: 0, legacyReverseCount: 0,
    issueCodes: [], requiresReview: false, migrationAuthorized: false,
  });
});
test("consistent legacy pair still requires manual review", () => {
  const result = inventory({}, {sponsorAccountLinks: {s1: "u1"},
    sponsorAccountByUid: {u1: "s1"}});
  assert.equal(result.requiresReview, true);
  assert.deepEqual(result.issueCodes, []);
});
test("legacy forward-only record reports mismatch", () => {
  assert.ok(inventory({}, {sponsorAccountLinks: {s1: "u1"}})
    .issueCodes.includes("LEGACY_INDEX_MISMATCH"));
});
test("legacy reverse-only record reports mismatch", () => {
  assert.ok(inventory({}, {sponsorAccountByUid: {u1: "s1"}})
    .issueCodes.includes("LEGACY_INDEX_MISMATCH"));
});
test("canonical sponsor collision is identified", () => {
  const result = inventory({linksBySponsor: {s1: "u2"}},
    {sponsorAccountLinks: {s1: "u1"}, sponsorAccountByUid: {u1: "s1"}});
  assert.ok(result.issueCodes.includes("CANONICAL_SPONSOR_CONFLICT"));
});
test("canonical UID collision is identified", () => {
  const result = inventory({linksByUid: {u1: "s2"}},
    {sponsorAccountLinks: {s1: "u1"}, sponsorAccountByUid: {u1: "s1"}});
  assert.ok(result.issueCodes.includes("CANONICAL_UID_CONFLICT"));
});
test("malformed legacy value is identified", () => {
  assert.ok(inventory({}, {sponsorAccountLinks: {s1: 42}})
    .issueCodes.includes("INVALID_LEGACY_FORWARD"));
});
test("assessment fails closed when legacy data exists", () => {
  const result = assess({canonical: {}, legacy: {sponsorAccountLinks: {s1: "u1"}},
    sponsorId: "s1", uid: "u1"});
  assert.equal(result.code, "LEGACY_LINK_REVIEW_REQUIRED");
});
test("assessment passes through canonical consistency when legacy empty", () => {
  const result = assess({canonical: {}, legacy: {}, sponsorId: "s1", uid: "u1"});
  assert.equal(result.code, "UNLINKED");
});
test("inventory never authorizes migration", () => {
  assert.equal(inventory({}, {}).migrationAuthorized, false);
  assert.equal(inventory({}, {sponsorAccountLinks: {s1: "u1"}}).migrationAuthorized, false);
});
