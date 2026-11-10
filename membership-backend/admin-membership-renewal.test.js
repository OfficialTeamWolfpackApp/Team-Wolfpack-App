"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {validVerifiedRenewal}=require("./renewal-verification");
const {buildRenewal}=require("./membership-renewal");
const {calculateExpiry}=require("./membership-policy");

const uid="supporter_test_123";
const admin="PRGa9TsCW0QDn1QtoUXyYjEi7YB3";
const requestedAt=Date.UTC(2026,10,10);
const verified={
  applicantUid:uid,renewalId:"c6e5c9d1-3c4b-4b28-96d8-29a8714b6c4a",
  type:"personal",tier:"bronze",pricePence:1000,
  status:"payment_verified",paymentStatus:"verified",
  requestedAt,paymentVerifiedAt:requestedAt+1000,paymentVerifiedBy:admin
};
test("verified manual renewal is eligible for activation",()=>{
  assert.equal(validVerifiedRenewal(verified,uid),true);
});
test("rejects unverified or unapproved payment evidence",()=>{
  for(const change of [
    {paymentStatus:"unverified"},{status:"awaiting_payment"},
    {paymentVerifiedBy:"attacker"},{paymentVerifiedAt:null},
    {paymentVerifiedAt:requestedAt-1}
  ])assert.equal(validVerifiedRenewal({...verified,...change},uid),false);
});
test("rejects invalid renewal identity, mismatched user and forged price",()=>{
  for(const change of [
    {renewalId:"not-a-uuid"},{applicantUid:"other_user"},
    {pricePence:1},{tier:"free"},{type:"unknown"}
  ])assert.equal(validVerifiedRenewal({...verified,...change},uid),false);
});
test("early renewal extends from existing expiry rather than payment date",()=>{
  const approvedAt=requestedAt+2000;
  const previous={
    type:"personal",tier:"bronze",pricePence:1000,
    approvedAt:Date.UTC(2026,0,1),expiresAt:Date.UTC(2027,0,1)
  };
  const result=buildRenewal(previous,{
    ...verified,status:"active",approvedBy:admin,approvedAt
  });
  assert.equal(result.startsAt,previous.expiresAt);
  assert.equal(result.expiresAt,calculateExpiry(previous.expiresAt));
});
