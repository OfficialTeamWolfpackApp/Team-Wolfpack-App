"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {entitlementFromApplication,isActive,projectEntitlement}=require("./membership-entitlements");
const {calculateExpiry}=require("./membership-policy");

const now=Date.UTC(2026,10,10);
const valid={
  applicantUid:"supporter_test_123",type:"personal",tier:"bronze",
  pricePence:1000,status:"active",paymentStatus:"verified",
  paymentVerifiedAt:now-1000,paymentVerifiedBy:"admin_test",
  approvedAt:now,approvedBy:"admin_test",expiresAt:calculateExpiry(now)
};
test("paid benefits require verified payment",()=>{
  assert.throws(()=>entitlementFromApplication({...valid,paymentStatus:"unverified"},valid.applicantUid),/verified payment/);
  assert.throws(()=>entitlementFromApplication({...valid,paymentVerifiedBy:null},valid.applicantUid),/verified payment/);
});
test("paid benefits require administrator approval",()=>{
  assert.throws(()=>entitlementFromApplication({...valid,approvedBy:null},valid.applicantUid),/administrator approval/);
  assert.throws(()=>entitlementFromApplication({...valid,status:"awaiting_payment"},valid.applicantUid),/approved applications/);
});
test("client price and account mismatch cannot create benefits",()=>{
  assert.throws(()=>entitlementFromApplication({...valid,pricePence:1},valid.applicantUid),/Invalid approved package/);
  assert.throws(()=>entitlementFromApplication(valid,"another_supporter"),/approved applications/);
});
test("approved paid entitlement expires at boundary",()=>{
  const entitlement=entitlementFromApplication(valid,valid.applicantUid);
  assert.equal(isActive(entitlement,now),true);
  assert.equal(isActive(entitlement,entitlement.expiresAt),false);
});
test("free membership may activate without payment verification",()=>{
  const free={...valid,tier:"free",pricePence:0,paymentStatus:"unverified",
    paymentVerifiedBy:null,paymentVerifiedAt:null};
  assert.equal(entitlementFromApplication(free,free.applicantUid).tier,"free");
});

function mockDatabase(existing){
  const state={value:existing};
  return {
    state,
    ref(){
      return {async transaction(update){
        const next=update(state.value);
        if(next===undefined)return {committed:false,snapshot:{val:()=>state.value}};
        state.value=next;
        return {committed:true,snapshot:{val:()=>state.value}};
      }};
    }
  };
}
test("repeated activation projection is idempotent",async()=>{
  const db=mockDatabase(null);
  const first=await projectEntitlement(db,valid.applicantUid,valid);
  const second=await projectEntitlement(db,valid.applicantUid,valid);
  assert.equal(first.committed,true);
  assert.equal(second.committed,false);
  assert.deepEqual(db.state.value,first.entitlement);
});
test("stale activation cannot replace newer entitlement",async()=>{
  const newer={...entitlementFromApplication(valid,valid.applicantUid),
    approvedAt:now+86400000,expiresAt:calculateExpiry(now+86400000),
    source:"membershipRenewalRequests"};
  const db=mockDatabase(newer);
  const result=await projectEntitlement(db,valid.applicantUid,valid);
  assert.equal(result.committed,false);
  assert.deepEqual(db.state.value,newer);
});
test("same-date approval cannot overwrite renewal or other entitlement data",async()=>{
  const existing={...entitlementFromApplication(valid,valid.applicantUid),
    expiresAt:calculateExpiry(now+86400000),source:"membershipRenewalRequests"};
  const db=mockDatabase(existing);
  const result=await projectEntitlement(db,valid.applicantUid,valid);
  assert.equal(result.committed,false);
  assert.deepEqual(db.state.value,existing);
});
