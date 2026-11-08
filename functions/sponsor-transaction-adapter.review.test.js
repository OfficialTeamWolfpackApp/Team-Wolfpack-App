"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {reviewTransactionCallback: run} = require("./sponsor-transaction-adapter.review");
const args = {operation: "link", sponsorId: "s1", uid: "u1",
  administratorUid: "admin", timestamp: 1234, eventId: "e1"};
test("transaction callback returns new state for successful link", () => {
  const result = run(null, args);
  assert.equal(result.outcome, "CREATE_LINK");
  assert.equal(result.nextValue.linksBySponsor.s1, "u1");
  assert.equal(result.nextValue.auditEvents.e1.action, "LINKED");
});
test("existing link aborts transaction without changing snapshot", () => {
  const state = {linksBySponsor: {s1: "u1"}, linksByUid: {u1: "s1"},
    accountStatus: {u1: {sponsorId: "s1", active: false}}};
  const result = run(state, args);
  assert.equal(result.outcome, "ALREADY_LINKED");
  assert.equal(result.nextValue, undefined);
});
test("conflicting link aborts transaction", () => {
  const result = run({linksBySponsor: {s1: "u2"}}, args);
  assert.equal(result.outcome, "SPONSOR_ALREADY_LINKED");
  assert.equal(result.nextValue, undefined);
});
test("invalid audit metadata aborts transaction", () => {
  const result = run(null, {...args, eventId: ""});
  assert.equal(result.outcome, "INVALID_AUDIT_METADATA");
  assert.equal(result.nextValue, undefined);
});
test("unlink preserves inactive history within transaction state", () => {
  const state = {linksBySponsor: {s1: "u1"}, linksByUid: {u1: "s1"},
    accountStatus: {u1: {sponsorId: "s1", active: true}}};
  const result = run(state, {...args, operation: "unlink"});
  assert.equal(result.outcome, "UNLINK_LINKED_ACCOUNT");
  assert.equal(result.nextValue.accountStatus.u1.active, false);
  assert.equal(result.nextValue.linksByUid.u1, undefined);
});
test("status update keeps both indexes and writes audit", () => {
  const state = {linksBySponsor: {s1: "u1"}, linksByUid: {u1: "s1"},
    accountStatus: {u1: {sponsorId: "s1", active: false}}};
  const result = run(state, {...args, operation: "setStatus", active: true});
  assert.equal(result.outcome, "UPDATE_ACTIVE_STATUS");
  assert.equal(result.nextValue.linksBySponsor.s1, "u1");
  assert.equal(result.nextValue.auditEvents.e1.action, "ACTIVATED");
});
