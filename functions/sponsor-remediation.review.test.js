"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {proposeSponsorRemediation: propose} = require("./sponsor-remediation.review");
const base = () => ({state: {linksBySponsor: {s1: "u1"},
  linksByUid: {u1: "s1"}, accountStatus: {u1: {sponsorId: "s1", active: true}},
  auditEvents: {}}, sponsorId: "s1", uid: "u1", authorized: true,
  freshSnapshot: true, eventId: "e1", administratorUid: "admin", timestamp: 123,
  eligibilityResult: {ok: false, action: "REQUIRE_AUTHORIZED_REMEDIATION"}});
test("proposes deactivation with preserved link and audit", () => {
  const input = base(); const result = propose(input);
  assert.equal(result.code, "DEACTIVATION_PROPOSED");
  assert.equal(result.nextState.accountStatus.u1.active, false);
  assert.equal(result.nextState.linksBySponsor.s1, "u1");
  assert.equal(result.nextState.auditEvents.e1.action, "DEACTIVATED");
  assert.equal(input.state.accountStatus.u1.active, true);
});
test("missing authorization rejects", () => {
  assert.equal(propose({...base(), authorized: false}).code, "AUTHORIZATION_REQUIRED");
});
test("stale snapshot rejects", () => {
  assert.equal(propose({...base(), freshSnapshot: false}).code, "FRESH_SNAPSHOT_REQUIRED");
});
test("eligible account cannot be deactivated through remediation", () => {
  assert.equal(propose({...base(), eligibilityResult: {ok: true}}).code,
    "REMEDIATION_NOT_REQUIRED");
});
test("inactive account is idempotent", () => {
  const input = base(); input.state.accountStatus.u1.active = false;
  assert.equal(propose(input).code, "ALREADY_INACTIVE");
});
test("missing link rejects", () => {
  const input = base(); input.state = {};
  assert.equal(propose(input).code, "LINK_NOT_FOUND");
});
test("conflicting index rejects", () => {
  const input = base(); input.state.linksByUid.u1 = "other";
  assert.equal(propose(input).ok, false);
});
test("legacy data blocks remediation proposal", () => {
  assert.equal(propose({...base(), legacy: {sponsorAccountLinks: {s1: "u1"}}}).code,
    "LEGACY_LINK_REVIEW_REQUIRED");
});
test("duplicate audit ID rejects", () => {
  const input = base(); input.state.auditEvents.e1 = {action: "LINKED"};
  assert.equal(propose(input).code, "INVALID_AUDIT_METADATA");
});
test("missing audit store rejects", () => {
  const input = base(); delete input.state.auditEvents;
  assert.equal(propose(input).code, "INVALID_AUDIT_METADATA");
});
test("missing administrator rejects", () => {
  assert.equal(propose({...base(), administratorUid: ""}).code, "INVALID_AUDIT_METADATA");
});
