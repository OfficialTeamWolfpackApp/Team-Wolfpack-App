"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {canDispatch,deliverySummary}=require("./reminder-delivery-policy");
const now=Date.UTC(2026,10,10),expiry=now+30*86400000;
const reminder={status:"queued",expiresAt:expiry,daysBeforeExpiry:30,createdAt:now};
const entitlement={expiresAt:expiry};
const preferences={membershipRenewalReminders:true,email:true,updatedAt:now};
test("opt-in and matching entitlement required",()=>{
  assert.equal(canDispatch({reminder,entitlement,preferences,channel:"email",now}).allowed,true);
  assert.equal(canDispatch({reminder,entitlement,preferences:null,channel:"email",now}).reason,"no_opt_in");
  assert.equal(canDispatch({reminder,entitlement,preferences:{...preferences,email:false},channel:"email",now}).reason,"no_opt_in");
});
test("never send expired, changed or already claimed reminders",()=>{
  assert.equal(canDispatch({reminder,entitlement:{expiresAt:expiry+86400000},preferences,channel:"email",now}).allowed,false);
  assert.equal(canDispatch({reminder,entitlement,preferences,channel:"email",now:expiry}).allowed,false);
  assert.equal(canDispatch({reminder:{...reminder,status:"sent"},entitlement,preferences,channel:"email",now}).allowed,false);
});
test("delivery summary exposes only state and counters",()=>{
  assert.deepEqual(deliverySummary({status:"sent",attempts:1,sentAt:now,email:"private@example.com"}),{status:"sent",attempts:1,sentAt:now});
});
