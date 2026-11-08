"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {reviewTransition} = require("./sponsor-link-transition.review");
const s = "s1", u = "u1";
const linked = (active = false) => ({linksBySponsor: {[s]: u},
  linksByUid: {[u]: s}, accountStatus: {[u]: {sponsorId: s, active}}});
const run = (operation, state = {}, extra = {}) =>
  reviewTransition({operation, state, sponsorId: s, uid: u, ...extra});

test("link creates a new account link", () => {
  assert.equal(run("link").code, "CREATE_LINK");
});
test("link permits matching inactive unlink history", () => {
  assert.equal(run("link", {accountStatus: {[u]: {sponsorId: s, active: false}}}).code, "CREATE_LINK");
});
test("link remains idempotent for existing active or inactive link", () => {
  for (const active of [false, true]) {
    assert.deepEqual(run("link", linked(active)), {ok: true, code: "ALREADY_LINKED", noop: true});
  }
});
test("unlink requires existing complete link", () => {
  assert.equal(run("unlink").code, "LINK_NOT_FOUND");
  assert.equal(run("unlink", linked()).code, "UNLINK_LINKED_ACCOUNT");
});
test("status update requires existing complete link", () => {
  assert.equal(run("setStatus").code, "LINK_NOT_FOUND");
});
test("status update rejects nonboolean active", () => {
  assert.equal(run("setStatus", linked(), {active: "true"}).code, "INVALID_ACTIVE_STATUS");
});
test("status update is idempotent when already set", () => {
  assert.deepEqual(run("setStatus", linked(false), {active: false}),
    {ok: true, code: "STATUS_UNCHANGED", noop: true});
});
test("status update allows a valid change", () => {
  assert.equal(run("setStatus", linked(false), {active: true}).code, "UPDATE_ACTIVE_STATUS");
});
test("all operations reject inconsistent indexes", () => {
  for (const operation of ["link", "unlink", "setStatus"]) {
    assert.equal(run(operation, {linksBySponsor: {[s]: u}}).code, "INCOMPLETE_ACCOUNT_LINK");
  }
});
test("all operations reject legacy records", () => {
  for (const operation of ["link", "unlink", "setStatus"]) {
    assert.equal(run(operation, {}, {legacy: {sponsorAccountByUid: {[u]: s}}}).code,
      "LEGACY_LINK_REVIEW_REQUIRED");
  }
});
test("unsupported operations fail closed", () => {
  assert.equal(run("delete").code, "UNSUPPORTED_OPERATION");
});
