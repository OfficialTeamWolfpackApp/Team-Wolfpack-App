"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const PROJECT="demo-team-wolfpack-membership-isolated";

function executeRunner({envOverrides={},fixtures=false,config=true}={}){
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),"wolfpack-emulator-guard-"));
 try{
  const dir=path.join(temporary,"membership-backend","emulator");
  fs.mkdirSync(dir,{recursive:true});
  fs.copyFileSync(path.join(__dirname,"run-isolated-tests.js"),path.join(dir,"run-isolated-tests.js"));
  if(fixtures){
   fs.writeFileSync(path.join(dir,"database-rules.full-merged.json"),JSON.stringify({rules:{".read":false,".write":false}}));
   fs.writeFileSync(path.join(dir,"database-rules.original.snapshot.json"),JSON.stringify({rules:{".read":false,".write":false}}));
  }
  if(config)fs.copyFileSync(path.join(__dirname,"firebase.membership-isolated.json"),path.join(dir,"firebase.membership-isolated.json"));
  const env={...process.env,GCLOUD_PROJECT:PROJECT};
  for(const key of ["FIREBASE_CONFIG","FIREBASE_AUTH_EMULATOR_HOST","FIREBASE_EMULATOR_HUB","FIREBASE_DATABASE_EMULATOR_HOST"])delete env[key];
  Object.assign(env,envOverrides);
  return spawnSync(process.execPath,[path.join(dir,"run-isolated-tests.js")],{
   cwd:temporary,env,encoding:"utf8",timeout:5000
  });
 }finally{fs.rmSync(temporary,{recursive:true,force:true});}
}

test("runner refuses missing reviewed rules fixtures",()=>{
 const run=executeRunner();
 assert.equal(run.status,1);
 assert.match(run.stderr,/Full merged and original rules fixtures required/);
});
test("runner refuses non-demo Firebase project before launching emulators",()=>{
 const run=executeRunner({fixtures:true,envOverrides:{GCLOUD_PROJECT:"team-wolfpack-app"}});
 assert.equal(run.status,1);
 assert.match(run.stderr,/Refusing non-demo project/);
});
test("runner refuses inherited production Firebase runtime configuration",()=>{
 for(const [key,value] of [
  ["FIREBASE_CONFIG",'{"projectId":"team-wolfpack-app"}'],
  ["FIREBASE_AUTH_EMULATOR_HOST","127.0.0.1:9099"],
  ["FIREBASE_EMULATOR_HUB","127.0.0.1:4400"]
 ]){
  const run=executeRunner({fixtures:true,envOverrides:{[key]:value}});
  assert.equal(run.status,1,key);
  assert.match(run.stderr,/Refusing inherited Firebase runtime configuration/,key);
 }
});
