"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {applySponsorTransition: apply} = require("./sponsor-transaction-model.review");
const base = {sponsorId: "s1", uid: "u1", administratorUid: "admin",
  eventId: "evt1", timestamp: 1234};
const run = (operation, state = {}, extra = {}) => apply({...base, operation, state, ...extra});
test("link updates both indexes, inactive status and audit in one snapshot", () => {
  const {nextState: n} = run("link");
  assert.equal(n.linksBySponsor.s1, "u1");
  assert.equal(n.linksByUid.u1, "s1");
  assert.deepEqual(n.accountStatus.u1, {sponsorId: "s1", active: false, updatedAt: 1234});
  assert.equal(n.auditEvents.evt1.action, "LINKED");
});
test("link does not mutate original transaction snapshot", () => {
  const state = {linksBySponsor: {}, linksByUid: {}, accountStatus: {}, auditEvents: {}};
  run("link", state);
  assert.deepEqual(state, {linksBySponsor: {}, linksByUid: {}, accountStatus: {}, auditEvents: {}});
});
test("existing link is no-op and produces no audit event", () => {
  const state = {linksBySponsor: {s1: "u1"}, linksByUid: {u1: "s1"},
    accountStatus: {u1: {sponsorId: "s1", active: false}}};
  const result = run("link", state);
  assert.equal(result.verdict.noop, true);
  assert.equal(result.nextState, null);
});
test("unlink removes both indexes but retains inactive history and audit", () => {
  const state = {linksBySponsor: {s1: "u1"}, linksByUid: {u1: "s1"},
    accountStatus: {u1: {sponsorId: "s1", active: true}}};
  const {nextState: n} = run("unlink", state);
  assert.equal(n.linksBySponsor.s1, undefined);
  assert.equal(n.linksByUid.u1, undefined);
  assert.equal(n.accountStatus.u1.active, false);
  assert.equal(n.auditEvents.evt1.action, "UNLINKED");
});
test("status change preserves links and records audit", () => {
  const state = {linksBySponsor: {s1: "u1"}, linksByUid: {u1: "s1"},
    accountStatus: {u1: {sponsorId: "s1", active: false}}};
  const {nextState: n} = run("setStatus", state, {active: true});
  assert.equal(n.accountStatus.u1.active, true);
  assert.equal(n.linksBySponsor.s1, "u1");
  assert.equal(n.auditEvents.evt1.action, "ACTIVATED");
});
test("inconsistent links cannot produce new state", () => {
  assert.equal(run("link", {linksBySponsor: {s1: "u1"}}).nextState, null);
});
test("legacy links cannot produce new state", () => {
  assert.equal(run("link", {}, {legacy: {sponsorAccountLinks: {s1: "u1"}}}).nextState, null);
});
test("audit event key collisions fail closed", () => {
  assert.equal(run("link", {auditEvents: {evt1: {action: "PREVIOUS"}}}).verdict.code,
    "DUPLICATE_AUDIT_EVENT");
});
test("missing audit metadata fails closed", () => {
  assert.equal(run("link", {}, {eventId: ""}).verdict.code, "INVALID_AUDIT_METADATA");
});
