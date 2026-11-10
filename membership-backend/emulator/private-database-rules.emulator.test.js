"use strict";
// Run only against the isolated demo project; never against production.
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {initializeTestEnvironment,assertFails}=require("@firebase/rules-unit-testing");
const PROJECT="demo-team-wolfpack-membership-isolated";
const HOST="127.0.0.1",PORT=19012;
const nodes=[
 "membershipApplicationIntake","membershipEntitlements","membershipAccounts",
 "membershipRenewalRequests","membershipReminderPreferences","membershipReminderOutbox"
];
test("private membership nodes deny client reads and writes for every role",async()=>{
 if(process.env.GCLOUD_PROJECT!==PROJECT || process.env.FIREBASE_DATABASE_EMULATOR_HOST!==HOST+":"+PORT){
  throw new Error("Isolated demo project and database emulator environment are mandatory");
 }
 const fixture=path.join(__dirname,"database-rules.full-merged.json");
 if(!fs.existsSync(fixture))throw new Error("Missing full merged rules fixture. Run prepare-full-rules.js with reviewed original rules before testing.");
 const rules=fs.readFileSync(fixture,"utf8");
 const env=await initializeTestEnvironment({projectId:PROJECT,
   database:{host:HOST,port:PORT,rules}});
 try{
  const contexts=[
   ["anonymous",env.unauthenticatedContext()],
   ["supporter",env.authenticatedContext("supporter-test-uid",{email_verified:true})],
   ["official",env.authenticatedContext("official-test-uid",{officialMember:true,email_verified:true})],
   ["admin",env.authenticatedContext("admin-test-uid",{admin:true,email_verified:true})]
  ];
  for(const [role,ctx] of contexts){
   for(const node of nodes){
    const ref=ctx.database().ref(node+"/"+role+"-test");
    await assertFails(ref.get());
    await assertFails(ref.set({status:"active",pricePence:0}));
   }
  }
  // Admin SDK bypasses client rules. Client admin claims must not bypass private paths.
  assert.equal(contexts.length*nodes.length*2,48);
 }finally{await env.cleanup();}
});
