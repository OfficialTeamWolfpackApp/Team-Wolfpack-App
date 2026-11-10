"use strict";

/**
 * Creates private, idempotent reminder outbox entries. Does NOT send email,
 * push notifications or contact supporters. A separate reviewed dispatcher
 * must deliver and acknowledge each queued item.
 */
const {onCall,HttpsError}=require("firebase-functions/v2/https");
const {getDatabase}=require("firebase-admin/database");
const {membershipState,dueReminders}=require("./membership-renewal");
const ADMIN_UIDS=new Set([
  "PRGa9TsCW0QDn1QtoUXyYjEi7YB3",
  "SlpEQYl94DaH6j42QUyl8Kv2ujJ3"
]);
const UID=/^[A-Za-z0-9_-]{1,128}$/;
function reminderKey(expiresAt,days){
  if(!Number.isSafeInteger(expiresAt)||![30,14,7].includes(days)){
    throw new Error("Invalid reminder identity");
  }
  return String(expiresAt)+"_"+days;
}
function buildReminder(entitlement,uid,days,now){
  if(!UID.test(uid)||!dueReminders(entitlement,now).includes(days)||
     membershipState(entitlement,now).status!=="active"){
    throw new Error("Reminder is not due");
  }
  return {
    uid,type:entitlement.type,tier:entitlement.tier,
    expiresAt:entitlement.expiresAt,daysBeforeExpiry:days,
    status:"queued",createdAt:now,channel:"pending_configuration",
    deliveredAt:null
  };
}
const queueMembershipRenewalReminders=onCall({
  region:"europe-west1",enforceAppCheck:true,maxInstances:2
},async request=>{
  if(!request.auth||!ADMIN_UIDS.has(request.auth.uid)){
    throw new HttpsError("permission-denied","Administrator access required.");
  }
  const db=getDatabase();
  const now=Date.now();
  const snapshot=await db.ref("membershipEntitlements").get();
  const entitlements=snapshot.val()||{};
  let queued=0,alreadyQueued=0,skipped=0;
  for(const [uid,entitlement] of Object.entries(entitlements)){
    if(!UID.test(uid)){skipped++;continue;}
    let daysList;
    try{daysList=dueReminders(entitlement,now);}
    catch(_){skipped++;continue;}
    for(const days of daysList){
      let reminder;
      try{reminder=buildReminder(entitlement,uid,days,now);}
      catch(_){skipped++;continue;}
      const key=reminderKey(entitlement.expiresAt,days);
      const outbox=db.ref("membershipReminderOutbox/"+uid+"/"+key);
      const result=await outbox.transaction(current=>{
        // Never requeue an existing reminder, including sent, cancelled,
        // failed or claimed messages.
        if(current!==null)return;
        return reminder;
      },undefined,false);
      if(result.committed)queued++;else alreadyQueued++;
    }
  }
  return {queued,alreadyQueued,skipped,deliveryEnabled:false,
    message:"Reminders are queued privately only; no messages were sent."};
});
module.exports={reminderKey,buildReminder,queueMembershipRenewalReminders};
