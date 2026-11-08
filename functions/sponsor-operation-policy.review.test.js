"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {reviewSponsorOperation: review} = require("./sponsor-operation-policy.review");
const base = {sponsorId: "s1", uid: "u1"};
const call = (operation, state = {}, legacy = {}) => review({...base, operation, state, legacy});
test("verification accepts an unlinked pair for further checks", () => {
  assert.equal(call("verify").code, "UNLINKED");
});
test("management preflight accepts an unlinked pair for further checks", () => {
  assert.equal(call("link").code, "UNLINKED");
});
test("both endpoints reject legacy links", () => {
  for (const operation of ["verify", "link"]) {
    assert.equal(call(operation, {}, {sponsorAccountLinks: {s1: "u1"}}).code, "LEGACY_LINK_REVIEW_REQUIRED");
  }
});
test("both endpoints reject index conflicts", () => {
  for (const operation of ["verify", "link"]) {
    assert.equal(call(operation, {linksBySponsor: {s1: "u2"}}).code, "SPONSOR_ALREADY_LINKED");
  }
});
test("management does not treat active existing link as new link", () => {
  assert.equal(call("link", {linksBySponsor: {s1: "u1"}, linksByUid: {u1: "s1"},
    accountStatus: {u1: {sponsorId: "s1", active: true}}}).code, "ALREADY_ACTIVE");
});
test("management requires review of existing inactive linked account", () => {
  assert.equal(call("link", {linksBySponsor: {s1: "u1"}, linksByUid: {u1: "s1"},
    accountStatus: {u1: {sponsorId: "s1", active: false}}}).code, "INACTIVE_LINK_REQUIRES_REVIEW");
});
test("inactive history permits relink preflight but not authorization", () => {
  assert.equal(call("link", {accountStatus: {u1: {sponsorId: "s1", active: false}}}).code,
    "UNLINKED_WITH_INACTIVE_HISTORY");
});
test("invalid identity fails closed", () => {
  assert.equal(review({operation: "link", sponsorId: "", uid: "u1"}).code, "INVALID_IDENTITY");
});
test("unsupported operation fails closed", () => {
  assert.equal(call("unlink").code, "UNSUPPORTED_OPERATION");
});
