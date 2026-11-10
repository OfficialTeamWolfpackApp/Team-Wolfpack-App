"use strict";
// STEP 45: Generate an isolated merged rules fixture from a reviewed local original.
// Never writes the original or any production Firebase configuration.
const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const originalPath=process.argv[2];
if(!originalPath)throw new Error("Usage: node prepare-full-rules.js /path/to/reviewed-original.json");
const original=JSON.parse(fs.readFileSync(originalPath,"utf8"));
const additions=JSON.parse(fs.readFileSync(path.join(root,"database-rules-fragment.json"),"utf8"));
assert.ok(original?.rules && typeof original.rules==="object");
assert.equal(original.rules[".read"],false,"Root read must be denied");
assert.equal(original.rules[".write"],false,"Root write must be denied");
const keys=Object.keys(additions.rules);
for(const key of keys)assert.ok(!Object.hasOwn(original.rules,key),"Membership node already exists: "+key);
const merged={...original,rules:{...original.rules,...additions.rules}};
for(const [key,value] of Object.entries(original.rules))
 assert.deepEqual(merged.rules[key],value,"Original rule changed: "+key);
const out=__dirname;
fs.writeFileSync(path.join(out,"database-rules.original.snapshot.json"),JSON.stringify(original,null,2)+"\n",{flag:"w"});
fs.writeFileSync(path.join(out,"database-rules.full-merged.json"),JSON.stringify(merged,null,2)+"\n",{flag:"w"});
console.log("STAGING ONLY: preserved "+Object.keys(original.rules).length+" existing rule entries; added "+keys.length+" private membership nodes.");
console.log("Generated fixture files in "+out+". Do not deploy these files.");
