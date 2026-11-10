"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const base=path.join(__dirname,"database-rules.original.snapshot.json");
const merged=path.join(__dirname,"database-rules.full-merged.json");
const fixturesAvailable=fs.existsSync(base)&&fs.existsSync(merged);
const nodes=["membershipApplicationIntake","membershipEntitlements","membershipAccounts","membershipRenewalRequests","membershipReminderPreferences","membershipReminderOutbox"];
test("complete rules retain every existing rule subtree without modification",()=>{
 assert.ok(fixturesAvailable,"Reviewed original and merged rules fixtures are required");
 const old=JSON.parse(fs.readFileSync(base,"utf8")).rules;
 const next=JSON.parse(fs.readFileSync(merged,"utf8")).rules;
 assert.equal(old[".read"],false);
 assert.equal(old[".write"],false);
 for(const [key,value] of Object.entries(old))assert.deepEqual(next[key],value,"Existing rules changed: "+key);
 assert.deepEqual(Object.keys(next).filter(k=>!Object.hasOwn(old,k)).sort(),nodes.slice().sort());
});
test("all new membership paths deny client read and write",()=>{
 assert.ok(fixturesAvailable,"Reviewed original and merged rules fixtures are required");
 const next=JSON.parse(fs.readFileSync(merged,"utf8")).rules;
 for(const name of nodes){
  assert.equal(next[name][".read"],false,name+" read");
  assert.equal(next[name][".write"],false,name+" write");
 }
 assert.deepEqual(next.membershipApplicationIntake[".indexOn"],["submittedAt"]);
});
