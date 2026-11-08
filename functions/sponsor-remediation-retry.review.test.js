"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {simulateRemediationRetry: simulate} = require("./sponsor-remediation-retry.review");
const initial = () => ({linksBySponsor: {s1: "u1"}, linksByUid: {u1: "s1"},
  accountStatus: {u1: {sponsorId: "s1", active: true}},
  auditEvents: {old: {action: "LINKED", sponsorId: "s1", uid: "u1"}}});
const input = () => ({sponsorId: "s1", uid: "u1", authorized: true,
  freshSnapshot: true, eventId: "e2", administratorUid: "admin", timestamp: 123,
  eligibilityResult: {ok: false, action: "REQUIRE_AUTHORIZED_REMEDIATION"}});
test("no contention deactivates and preserves previous audit", () => {
  const r = simulate({initialState: initial(), input: input()});
  assert.equal(r.committed, true);
  assert.equal(r.finalState.accountStatus.u1.active, false);
  assert.equal(r.finalState.auditEvents.old.action, "LINKED");
  assert.equal(r.finalState.auditEvents.e2.action, "DEACTIVATED");
});
test("concurrent unrelated audit survives retry", () => {
  const changed = initial(); changed.auditEvents.other = {action: "OTHER"};
  const r = simulate({initialState: initial(), concurrentState: changed, input: input()});
  assert.equal(r.committed, true);
  assert.equal(r.finalState.auditEvents.other.action, "OTHER");
  assert.equal(r.finalState.auditEvents.e2.action, "DEACTIVATED");
});
test("concurrent unrelated sponsor status survives retry", () => {
  const changed = initial();
  changed.linksBySponsor.s2 = "u2"; changed.linksByUid.u2 = "s2";
  changed.accountStatus.u2 = {sponsorId: "s2", active: true};
  const r = simulate({initialState: initial(), concurrentState: changed, input: input()});
  assert.equal(r.committed, true);
  assert.equal(r.finalState.accountStatus.u2.active, true);
});
test("concurrent unlink aborts remediation without restoring link", () => {
  const changed = initial(); delete changed.linksBySponsor.s1;
  delete changed.linksByUid.u1;
  changed.accountStatus.u1.active = false;
  const r = simulate({initialState: initial(), concurrentState: changed, input: input()});
  assert.equal(r.committed, false);
  assert.equal(r.final.code, "LINK_NOT_FOUND");
  assert.equal(r.finalState.linksBySponsor.s1, undefined);
});
test("concurrent deactivation results in no-op", () => {
  const changed = initial(); changed.accountStatus.u1.active = false;
  const r = simulate({initialState: initial(), concurrentState: changed, input: input()});
  assert.equal(r.committed, false);
  assert.equal(r.final.code, "ALREADY_INACTIVE");
});
test("concurrent conflicting reverse index fails closed", () => {
  const changed = initial(); changed.linksByUid.u1 = "other";
  const r = simulate({initialState: initial(), concurrentState: changed, input: input()});
  assert.equal(r.committed, false);
});
test("concurrent audit ID collision fails closed", () => {
  const changed = initial(); changed.auditEvents.e2 = {action: "OTHER"};
  const r = simulate({initialState: initial(), concurrentState: changed, input: input()});
  assert.equal(r.committed, false);
  assert.equal(r.final.code, "INVALID_AUDIT_METADATA");
});
test("missing authorization prevents first proposal", () => {
  const args = input(); args.authorized = false;
  const r = simulate({initialState: initial(), input: args});
  assert.equal(r.committed, false);
  assert.equal(r.first.code, "AUTHORIZATION_REQUIRED");
});
test("original snapshot remains unchanged", () => {
  const state = initial();
  simulate({initialState: state, input: input()});
  assert.equal(state.accountStatus.u1.active, true);
  assert.equal(state.auditEvents.e2, undefined);
});
