"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {membershipState,buildRenewal,dueReminders,DAY_MS}=require("./membership-renewal");
const {validateApplication}=require("./membership-policy");

const approvedAt=Date.UTC(2026,0,1);
const expiry=Date.UTC(2027,0,1);
const entitlement={type:"personal",tier:"bronze",pricePence:1000,approvedAt,expiresAt:expiry};
test("membership active before expiry and expired at boundary",()=>{
  assert.equal(membershipState(entitlement,expiry-1).status,"active");
  assert.equal(membershipState(entitlement,expiry).status,"expired");
  assert.equal(membershipState(entitlement,expiry).paid,false);
});
test("expired supporter keeps free display state when no entitlement exists",()=>{
  assert.deepEqual(membershipState(null),{status:"free",paid:false,daysRemaining:null});
});
test("renewal requires verified payment",()=>{
  assert.throws(()=>buildRenewal(entitlement,{
    applicantUid:"testUser123",type:"personal",tier:"bronze",pricePence:1000,
    status:"active",approvedBy:"admin",approvedAt:expiry-10*DAY_MS,
    paymentStatus:"unverified"
  }),/verified/);
});
test("early verified renewal extends from existing expiry",()=>{
  const renewal=buildRenewal(entitlement,{
    applicantUid:"testUser123",type:"personal",tier:"bronze",pricePence:1000,
    status:"active",approvedBy:"admin",approvedAt:expiry-10*DAY_MS,
    paymentStatus:"verified",paymentVerifiedBy:"admin",paymentVerifiedAt:expiry-11*DAY_MS
  });
  assert.equal(renewal.startsAt,expiry);
  assert.equal(renewal.expiresAt,Date.UTC(2028,0,1));
});
test("30-day reminder window",()=>{
  assert.deepEqual(dueReminders(entitlement,expiry-30*DAY_MS),[30]);
});
test("price is fixed by server policy",()=>{
  const result=validateApplication({
    type:"personal",package:"bronze",fullName:"Example Supporter",
    location:"London",email:"example@example.com",bio:"Example biography",
    pricePence:1,status:"active",paymentStatus:"verified"
  });
  assert.equal(result.pricePence,1000);
  assert.equal(Object.hasOwn(result,"status"),false);
});
