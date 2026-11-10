"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {transition}=require("./membership-review-transition");
const {calculateExpiry}=require("./membership-policy");
const now=Date.UTC(2026,10,10),admin="admin_uid";
const paid={applicantUid:"user1",type:"personal",tier:"bronze",pricePence:1000,
  status:"new",paymentStatus:"unverified"};
const free={...paid,tier:"free",pricePence:0};
test("paid application cannot activate before payment verification",()=>{
  assert.throws(()=>transition(paid,"activate",admin,now),/not allowed/);
  const awaiting=transition(paid,"mark_awaiting_payment",admin,now);
  assert.throws(()=>transition(awaiting,"activate",admin,now),/not allowed/);
});
test("paid activation requires admin payment verification",()=>{
  const awaiting=transition(paid,"mark_awaiting_payment",admin,now);
  const verified=transition(awaiting,"verify_payment",admin,now+1);
  assert.equal(verified.paymentVerifiedBy,admin);
  const active=transition(verified,"activate",admin,now+2);
  assert.equal(active.approvedBy,admin);
  assert.equal(active.expiresAt,calculateExpiry(now+2));
});
test("repeating activation does not extend expiry",()=>{
  const awaiting=transition(paid,"mark_awaiting_payment",admin,now);
  const verified=transition(awaiting,"verify_payment",admin,now+1);
  const active=transition(verified,"activate",admin,now+2);
  assert.deepEqual(transition(active,"activate",admin,now+86400000),active);
});
test("free membership can activate without payment",()=>{
  const active=transition(free,"activate",admin,now);
  assert.equal(active.status,"active");
  assert.equal(active.expiresAt,calculateExpiry(now));
});
test("declined application cannot be activated",()=>{
  const declined=transition(paid,"decline",admin,now);
  assert.throws(()=>transition(declined,"activate",admin,now+1),/not allowed/);
});
test("invalid or forged package price is rejected",()=>{
  assert.throws(()=>transition({...paid,pricePence:1},"mark_awaiting_payment",admin,now),/validation/);
});
