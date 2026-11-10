"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const pages=[
 "sponsorship-application.html",
 "membership-reminder-preferences.html",
 "admin-sponsorship-enquiries.html",
 "supporter-profile.html"
];
const siteKey="6LfYlcItAAAAAGQtEJFKYH6fyERwXiAfVeBqJhOR";
for(const file of pages){
 test(file+" configures App Check before membership callable creation",()=>{
  const html=fs.readFileSync(path.join(root,file),"utf8");
  const appCheckImport=html.indexOf("firebase-app-check.js");
  const init=html.indexOf("initializeAppCheck(app,");
  const provider=html.indexOf("new ReCaptchaEnterpriseProvider(",init);
  const callable=html.indexOf("httpsCallable(",init);
  assert.ok(appCheckImport>=0,"missing Firebase App Check SDK import");
  assert.ok(init>=0,"missing App Check initialisation");
  assert.ok(provider>init,"missing reCAPTCHA Enterprise provider");
  assert.ok(html.includes(siteKey),"site key must match existing Team Wolfpack configuration");
  assert.match(html.slice(init,init+350),/isTokenAutoRefreshEnabled\s*:\s*true/);
  assert.ok(callable>init,"App Check must initialise before membership callable");
  assert.ok(html.includes('getFunctions(app,"europe-west1")'),"incorrect Functions region");
 });
}
