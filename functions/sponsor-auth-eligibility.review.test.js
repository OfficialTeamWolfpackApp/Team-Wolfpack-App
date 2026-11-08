"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {evaluateSponsorEligibility: check} = require("./sponsor-auth-eligibility.review");
const valid = () => ({uid: "u1", sponsor: {team: "wolfpack"},
  user: {uid: "u1", disabled: false, emailVerified: true, customClaims: {}},
  adminUids: ["admin1"], officialTeamAccountLinks: {}});
test("eligible account is only approved for preflight", () => {
  assert.deepEqual(check(valid()), {ok: true, code: "ELIGIBLE_FOR_PREFLIGHT_ONLY"});
});
test("disabled account is rejected", () => {
  assert.equal(check({...valid(), user: {...valid().user, disabled: true}}).code, "ACCOUNT_NOT_ELIGIBLE");
});
test("unverified email is rejected", () => {
  assert.equal(check({...valid(), user: {...valid().user, emailVerified: false}}).code, "ACCOUNT_NOT_ELIGIBLE");
});
test("official member custom claim is rejected", () => {
  assert.equal(check({...valid(), user: {...valid().user, customClaims: {officialMember: true}}}).code,
    "ACCOUNT_NOT_ELIGIBLE");
});
test("admin UID is rejected", () => {
  assert.equal(check({...valid(), adminUids: ["u1"]}).code, "ACCOUNT_NOT_ELIGIBLE");
});
test("official team account link is rejected", () => {
  assert.equal(check({...valid(), officialTeamAccountLinks: {"mr-wolfie": "u1"}}).code,
    "OFFICIAL_ACCOUNT_NOT_ELIGIBLE");
});
test("team sloan sponsor is rejected", () => {
  assert.equal(check({...valid(), sponsor: {team: "sloan"}}).code, "SPONSOR_NOT_ELIGIBLE");
});
test("missing sponsor is rejected", () => {
  assert.equal(check({...valid(), sponsor: null}).code, "SPONSOR_NOT_ELIGIBLE");
});
test("missing or mismatched auth user is rejected", () => {
  assert.equal(check({...valid(), user: null}).code, "ACCOUNT_NOT_FOUND");
  assert.equal(check({...valid(), user: {...valid().user, uid: "other"}}).code, "ACCOUNT_NOT_FOUND");
});
test("missing trusted admin set fails closed", () => {
  assert.equal(check({...valid(), adminUids: undefined}).code, "ELIGIBILITY_DATA_INCOMPLETE");
});
test("missing official links snapshot fails closed", () => {
  assert.equal(check({...valid(), officialTeamAccountLinks: undefined}).code,
    "ELIGIBILITY_DATA_INCOMPLETE");
});
test("invalid UID is rejected", () => {
  assert.equal(check({...valid(), uid: ""}).code, "INVALID_IDENTITY");
});
