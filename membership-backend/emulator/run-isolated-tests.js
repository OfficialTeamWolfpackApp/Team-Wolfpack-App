"use strict";
// STEP 47: fail-closed isolated emulator test runner.
// Execute from repository root after preparing the reviewed full rules fixture.
const {spawnSync}=require("node:child_process");
const net=require("node:net");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"../..");
const dir=__dirname;
const project="demo-team-wolfpack-membership-isolated";
const config=path.join(dir,"firebase.membership-isolated.json");
const fixture=path.join(dir,"database-rules.full-merged.json");
const snapshot=path.join(dir,"database-rules.original.snapshot.json");
if(!fs.existsSync(fixture)||!fs.existsSync(snapshot))
 throw new Error("Full merged and original rules fixtures required. Run prepare-full-rules.js first.");
const cfg=JSON.parse(fs.readFileSync(config,"utf8"));
if(cfg.database?.rules!=="membership-backend/emulator/database-rules.full-merged.json")
 throw new Error("Emulator must use the complete merged rules fixture.");
if(cfg.emulators?.database?.host!=="127.0.0.1"||cfg.emulators?.database?.port!==19012)
 throw new Error("Unexpected database emulator host or port.");
if(cfg.emulators?.auth?.host!=="127.0.0.1"||cfg.emulators?.auth?.port!==19109)
 throw new Error("Unexpected Auth emulator host or port.");
if(cfg.emulators?.ui?.enabled!==false)
 throw new Error("Emulator UI must remain disabled.");
if(process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT!==project)
 throw new Error("Refusing non-demo project.");
const env={...process.env,GCLOUD_PROJECT:project,FIREBASE_DATABASE_EMULATOR_HOST:"127.0.0.1:19012"};
if(process.env.FIREBASE_CONFIG||process.env.FIREBASE_AUTH_EMULATOR_HOST||process.env.FIREBASE_DATABASE_EMULATOR_HOST||process.env.FIREBASE_EMULATOR_HUB){
 throw new Error("Refusing inherited Firebase runtime configuration. Use a clean isolated shell.");
}
if(!fs.existsSync(path.join(dir,"node_modules","@firebase","rules-unit-testing","package.json")))
 throw new Error("Missing isolated rules test dependency. Install in membership-backend/emulator.");
const args=["emulators:exec","--project",project,"--config","membership-backend/emulator/firebase.membership-isolated.json","--only","auth,database","node --test membership-backend/emulator/full-rules-preservation.test.js membership-backend/emulator/private-database-rules.emulator.test.js"];
async function portFree(port){return new Promise(resolve=>{
 const server=net.createServer();
 server.once("error",()=>resolve(false));
 server.listen({host:"127.0.0.1",port,exclusive:true},()=>server.close(()=>resolve(true)));
});}
(async()=>{
 for(const port of [19109,19012,15001]){
  if(!await portFree(port))throw new Error("Refusing to start: emulator port "+port+" is occupied. Existing sessions were not touched.");
 }
 const run=spawnSync("firebase",args,{cwd:root,env,stdio:"inherit",shell:process.platform==="win32"});
 if(run.error)throw run.error;
 process.exitCode=run.status===null?1:run.status;
})().catch(error=>{console.error(error);process.exitCode=1;});
