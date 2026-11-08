"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {inspectSponsorLink} = require("./sponsor-link-consistency.review");
const S = "sponsor-1", U = "user-1";
const inspect = (state, legacy) => inspectSponsorLink(state, S, U, legacy);

test("unlinked sponsor/account is eligible for further checks", () => {
  assert.deepEqual(inspect({}), {ok: true, code: "UNLINKED"});
});
test("matching forward and reverse link with status is consistent", () => {
  assert.deepEqual(inspect({linksBySponsor: {[S]: U},
    linksByUid: {[U]: S}, accountStatus: {[U]: {sponsorId: S, active: true}}}),
  {ok: true, code: "ALREADY_LINKED", active: true});
});
test("existing sponsor mapped to another account fails closed", () => {
  assert.equal(inspect({linksBySponsor: {[S]: "user-2"}}).code, "SPONSOR_ALREADY_LINKED");
});
test("existing account mapped to another sponsor fails closed", () => {
  assert.equal(inspect({linksByUid: {[U]: "sponsor-2"}}).code, "ACCOUNT_ALREADY_LINKED");
});
test("partial link fails closed", () => {
  assert.equal(inspect({linksBySponsor: {[S]: U}}).code, "INCOMPLETE_ACCOUNT_LINK");
});
test("inconsistent status fails closed", () => {
  assert.equal(inspect({linksBySponsor: {[S]: U}, linksByUid: {[U]: S},
    accountStatus: {[U]: {sponsorId: "sponsor-2", active: true}}}).code, "STATUS_LINK_MISMATCH");
});
test("inactive status left after unlink permits same-sponsor relink review", () => {
  assert.equal(inspect({accountStatus: {[U]: {sponsorId: S, active: false}}}).code, "UNLINKED_WITH_INACTIVE_HISTORY");
});
test("active orphan status fails closed", () => {
  assert.equal(inspect({accountStatus: {[U]: {sponsorId: S, active: true}}}).code, "ORPHAN_ACCOUNT_STATUS");
});
test("inactive history for a different sponsor fails closed", () => {
  assert.equal(inspect({accountStatus: {[U]: {sponsorId: "sponsor-2", active: false}}}).code, "ORPHAN_ACCOUNT_STATUS");
});
test("duplicate UID in forward index fails closed", () => {
  assert.equal(inspect({linksBySponsor: {[S]: U, "sponsor-2": U}}).code, "DUPLICATE_LINK_CONFLICT");
});
test("duplicate sponsor in reverse index fails closed", () => {
  assert.equal(inspect({linksByUid: {[U]: S, "user-2": S}}).code, "DUPLICATE_LINK_CONFLICT");
});
test("legacy forward index requires review", () => {
  assert.equal(inspect({}, {sponsorAccountLinks: {[S]: U}}).code, "LEGACY_LINK_REVIEW_REQUIRED");
});
test("legacy reverse index requires review", () => {
  assert.equal(inspect({}, {sponsorAccountByUid: {[U]: S}}).code, "LEGACY_LINK_REVIEW_REQUIRED");
});

test("unrelated corrupt forward index blocks a new link", () => {
  assert.equal(inspect({linksBySponsor: {"sponsor-3": "user-3"}}).code, "GLOBAL_INDEX_MISMATCH");
});
test("unrelated corrupt reverse index blocks a new link", () => {
  assert.equal(inspect({linksByUid: {"user-3": "sponsor-3"}}).code, "GLOBAL_INDEX_MISMATCH");
});
test("unrelated consistent indexes allow a new link", () => {
  assert.equal(inspect({linksBySponsor: {"sponsor-3": "user-3"},
    linksByUid: {"user-3": "sponsor-3"}}).code, "UNLINKED");
});
