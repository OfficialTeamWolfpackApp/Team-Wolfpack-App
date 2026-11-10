"use strict";

/**
 * Read-only administrator renewal dashboard.
 * No automatic email, notification, payment or entitlement mutation.
 */
const {onCall,HttpsError}=require("firebase-functions/v2/https");
const {getDatabase}=require("firebase-admin/database");
const {membershipState,dueReminders}=require("./membership-renewal");
const ADMIN_UIDS=new Set([
  "PRGa9TsCW0QDn1QtoUXyYjEi7YB3",
  "SlpEQYl94DaH6j42QUyl8Kv2ujJ3"
]);
const listMembershipRenewalAlerts=onCall({
  region:"europe-west1",enforceAppCheck:true,maxInstances:3
},async request=>{
  if(!request.auth||!ADMIN_UIDS.has(request.auth.uid)){
    throw new HttpsError("permission-denied","Administrator access required.");
  }
  const db=getDatabase();
  // Read private entitlement records with Admin SDK only. Do not return
  // payment references, contact details, or full renewal histories.
  const [entitlements,renewals]=await Promise.all([
    db.ref("membershipEntitlements").get(),
    db.ref("membershipRenewalRequests").get()
  ]);
  const now=Date.now();
  const records=entitlements.val()||{};
  const pending=renewals.val()||{};
  const alerts=[];
  for(const [uid,entitlement] of Object.entries(records)){
    if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid))continue;
    let state;
    try{state=membershipState(entitlement,now);}
    catch(_){continue;}
    const reminderDays=dueReminders(entitlement,now);
    const renewalStatus=typeof pending[uid]?.status==="string"?
      pending[uid].status:null;
    // Include only actionable reminders, expirations and pending renewals.
    if(!reminderDays.length && state.status!=="expired" &&
       !["awaiting_payment","payment_verified"].includes(renewalStatus))continue;
    alerts.push({
      uid,type:entitlement.type,tier:entitlement.tier,
      expiresAt:entitlement.expiresAt,
      membershipStatus:state.status,daysRemaining:state.daysRemaining,
      reminderDays,renewalStatus
    });
  }
  alerts.sort((a,b)=>a.expiresAt-b.expiresAt);
  return {generatedAt:now,alerts:alerts.slice(0,500),
    truncated:alerts.length>500,remindersSent:false};
});
module.exports={listMembershipRenewalAlerts};
