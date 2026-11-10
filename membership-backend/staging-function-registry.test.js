"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const Module=require("node:module");
const path=require("node:path");
const registryPath=require.resolve("./staging-function-registry");
const registry=require("./staging-function-registry");
const expected=[
 "submitMembershipApplication","reviewMembershipApplication",
 "listMembershipApplications","getPublicMembership",
 "requestMembershipRenewal","verifyMembershipRenewalPayment",
 "activateMembershipRenewal","listMembershipRenewalAlerts",
 "queueMembershipRenewalReminders",
 "getMembershipReminderPreferences","saveMembershipReminderPreferences"
];
const exportsByModule={
 "./submit-membership-application":["submitMembershipApplication"],
 "./admin-membership-review":["reviewMembershipApplication","listMembershipApplications"],
 "./public-membership":["getPublicMembership"],
 "./admin-membership-renewal":["requestMembershipRenewal","verifyMembershipRenewalPayment","activateMembershipRenewal"],
 "./admin-renewal-alerts":["listMembershipRenewalAlerts"],
 "./membership-reminder-outbox":["queueMembershipRenewalReminders"],
 "./reminder-preferences":["getMembershipReminderPreferences","saveMembershipReminderPreferences"]
};
function withMockedModules(run){
 const original=Module._load;
 Module._load=function(request,parent,isMain){
  if(parent?.filename===registryPath && Object.hasOwn(exportsByModule,request)){
   return Object.fromEntries(exportsByModule[request].map(name=>[name,()=>name]));
  }
  return original.apply(this,arguments);
 };
 try{return run();}finally{Module._load=original;}
}
test("staging registry exports precisely 11 callable endpoints",()=>{
 withMockedModules(()=>{
  const target={existingFunction:()=>true};
  assert.equal(registry.registerMembershipExports(target),target);
  assert.deepEqual(Object.keys(target).sort(),["existingFunction",...expected].sort());
  for(const name of expected)assert.equal(typeof target[name],"function");
 });
});
test("staging registry refuses duplicate existing function names",()=>{
 withMockedModules(()=>{
  const target={submitMembershipApplication:()=>true};
  assert.throws(()=>registry.registerMembershipExports(target),/Duplicate Firebase function export/);
 });
});
test("staging registry refuses non-object targets",()=>{
 assert.throws(()=>registry.registerMembershipExports(null),/Invalid exports target/);
});
