"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {finalizeSponsorTransaction: finish} = require("./sponsor-transaction-result.review");
const base = {sponsorId: "s1", uid: "u1", eventId: "e1"};
const linked = (active = false) => ({linksBySponsor: {s1: "u1"},
  linksByUid: {u1: "s1"}, accountStatus: {u1: {sponsorId: "s1", active}}});
const audited = (state, action) => ({...state, auditEvents: {
  e1: {action, sponsorId: "s1", uid: "u1"}}});
const run = (operation, committed, snapshot, extra = {}) =>
  finish({...base, operation, committed, snapshot, ...extra});

test("committed link requires matching final link and audit", () => {
  assert.equal(run("link", true, audited(linked(), "LINKED")).code, "COMMITTED");
});
test("aborted link to already linked pair remains idempotent", () => {
  assert.deepEqual(run("link", false, linked()), {
    ok: true, httpStatus: 200, code: "ALREADY_LINKED", alreadyLinked: true});
});
test("aborted link with inconsistent indexes fails closed", () => {
  assert.equal(run("link", false, {linksBySponsor: {s1: "u1"}}).code,
    "INCOMPLETE_ACCOUNT_LINK");
});
test("aborted unlink cannot report successful unlink", () => {
  assert.equal(run("unlink", false, {}).code, "TRANSACTION_NOT_COMMITTED");
});
test("committed unlink requires inactive history and matching audit", () => {
  const state = {accountStatus: {u1: {sponsorId: "s1", active: false}}};
  assert.equal(run("unlink", true, audited(state, "UNLINKED")).code, "COMMITTED");
});
test("committed status update requires matching active flag", () => {
  assert.equal(run("setStatus", true, audited(linked(true), "ACTIVATED"), {active: true}).code,
    "COMMITTED");
  assert.equal(run("setStatus", true, audited(linked(false), "ACTIVATED"), {active: true}).code,
    "FINAL_STATUS_MISMATCH");
});
test("committed write without audit fails closed", () => {
  assert.equal(run("link", true, linked()).code, "AUDIT_COMMIT_MISMATCH");
});
test("audit for another sponsor cannot prove commit", () => {
  const state = audited(linked(), "LINKED");
  state.auditEvents.e1.sponsorId = "other";
  assert.equal(run("link", true, state).code, "AUDIT_COMMIT_MISMATCH");
});
test("unknown committed flag fails closed", () => {
  assert.equal(run("link", undefined, linked()).code, "UNKNOWN_TRANSACTION_RESULT");
});
test("missing final snapshot fails closed", () => {
  assert.equal(run("link", true, null).code, "MISSING_FINAL_SNAPSHOT");
});
test("legacy conflict blocks even idempotent response", () => {
  assert.equal(run("link", false, linked(), {
    legacy: {sponsorAccountByUid: {u1: "s1"}}}).code, "LEGACY_LINK_REVIEW_REQUIRED");
});
