#!/usr/bin/env node
/**
 * STEP 1778P — Firebase Realtime Database emulator authorization tests.
 * Prerequisites: npm install --no-save @firebase/rules-unit-testing firebase
 * Start emulator separately:
 * firebase emulators:start --only database --project demo-team-wolfpack
 *   --config <temporary emulator-only firebase.json>
 * Run: FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 node --test tests/supporter-rules.test.cjs
 *
 * Does not connect to or deploy to production Firebase.
 */
"use strict";
const {test, before, after, beforeEach} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {initializeTestEnvironment, assertSucceeds, assertFails} = require("@firebase/rules-unit-testing");
let env;
const projectId = "demo-team-wolfpack";
const rules = fs.readFileSync(path.resolve(__dirname, "../firebase/database.rules.json"), "utf8");
const alice = "supporterAlice123", bob = "supporterBob123";
const validProfile = (name = "Alice Wolfpack") => ({name, joinedAt:{".sv":"timestamp"}});
const ownerDb = (uid,verified=true) => env.authenticatedContext(uid, {email_verified:verified,email:uid+"@example.test"}).database();
async function seed(pathName,value) {
  await env.withSecurityRulesDisabled(async context => context.database().ref(pathName).set(value));
}
before(async () => {
  assert.ok(process.env.FIREBASE_DATABASE_EMULATOR_HOST,
    "Start the local database emulator and set FIREBASE_DATABASE_EMULATOR_HOST; production access is forbidden.");
  env = await initializeTestEnvironment({projectId,database:{rules}});
});
after(async () => {if(env)await env.cleanup()});
beforeEach(async () => {await env.clearDatabase()});

test("public can read public supporter directory",async () => {
  await seed("publicSupporterProfiles/"+alice,{name:"Alice",joinedAt:1700000000000});
  const snapshot=await assertSucceeds(env.unauthenticatedContext().database().ref("publicSupporterProfiles").get());
  assert.equal(snapshot.child(alice).child("name").val(),"Alice");
});
test("anonymous and unverified visitors cannot create profiles",async () => {
  await assertFails(env.unauthenticatedContext().database().ref("publicSupporterProfiles/"+alice).set(validProfile()));
  await assertFails(ownerDb(alice,false).ref("publicSupporterProfiles/"+alice).set(validProfile()));
});
test("verified owner can create profile and edit permitted fields",async () => {
  const db=ownerDb(alice);
  await assertSucceeds(db.ref("publicSupporterProfiles/"+alice).set(validProfile()));
  await assertSucceeds(db.ref("publicSupporterProfiles/"+alice).update({
    name:"Alice Updated",location:"Birmingham, UK",bio:"Proud supporter",
    facebook:"https://www.facebook.com/alice",
    instagram:"https://www.instagram.com/alice",
    tiktok:"https://www.tiktok.com/@alice",
    youtube:"https://www.youtube.com/@alice",
    website:"https://example.com/alice"
  }));
  const snapshot=await assertSucceeds(db.ref("publicSupporterProfiles/"+alice).get());
  assert.equal(snapshot.child("location").val(),"Birmingham, UK");
});
test("verified owner can remove optional details",async () => {
  const db=ownerDb(alice),ref=db.ref("publicSupporterProfiles/"+alice);
  await assertSucceeds(ref.set(validProfile()));
  await assertSucceeds(ref.update({location:"London",bio:"Hi",website:"https://example.com"}));
  await assertSucceeds(ref.update({location:null,bio:null,website:null}));
});
test("owner cannot change joinedAt or delete the public profile",async () => {
  const db=ownerDb(alice),ref=db.ref("publicSupporterProfiles/"+alice);
  await assertSucceeds(ref.set(validProfile()));
  await assertFails(ref.update({joinedAt:123}));
  await assertFails(ref.remove());
});
test("owner cannot modify another user's public profile",async () => {
  await seed("publicSupporterProfiles/"+bob,{name:"Bob",joinedAt:1700000000000});
  await assertFails(ownerDb(alice).ref("publicSupporterProfiles/"+bob).update({name:"Hacked"}));
});
test("unknown fields and forged roles are rejected",async () => {
  const db=ownerDb(alice),ref=db.ref("publicSupporterProfiles/"+alice);
  await assertSucceeds(ref.set(validProfile()));
  for(const field of ["role","admin","email","badge"])await assertFails(ref.update({[field]:"forged"}));
});
test("field lengths and non-HTTPS / wrong social domains are rejected",async () => {
  const db=ownerDb(alice),ref=db.ref("publicSupporterProfiles/"+alice);
  await assertSucceeds(ref.set(validProfile()));
  for(const patch of [
    {name:"X"},{location:"L".repeat(81)},{bio:"B".repeat(601)},
    {facebook:"http://facebook.com/alice"},
    {instagram:"https://not-instagram.com/alice"},
    {tiktok:"https://example.com/@alice"},
    {youtube:"javascript:alert(1)"},
    {website:"http://example.com"},
    {website:"https://example.com/"+"x".repeat(310)}
  ])await assertFails(ref.update(patch));
});
test("private supporter accounts are not publicly readable",async () => {
  await seed("supporterProfiles/"+alice,{uid:alice,name:"Alice",email:"private@example.test",emailVerified:true,registeredAt:1700000000000,accountStatus:"active"});
  await assertFails(env.unauthenticatedContext().database().ref("supporterProfiles/"+alice).get());
  await assertFails(ownerDb(bob).ref("supporterProfiles/"+alice).get());
});
test("supporters cannot self-award badges or modify official records",async () => {
  const db=ownerDb(alice);
  await assertFails(db.ref("memberBadges/"+alice).set({awarded:{manager:true}}));
  await assertFails(db.ref("officialTeamBadges/mr-wolfie").set({awarded:{manager:true}}));
  await assertFails(db.ref("officialTeamAccountLinks/mr-wolfie").set(alice));
  await assertFails(db.ref("teamMembers/mr-wolfie").update({name:"Imposter"}));
});
