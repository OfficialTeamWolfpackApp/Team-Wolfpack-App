"use strict";

/**
 * Trusted entitlement projection. Call only from privileged Firebase Admin SDK
 * code after verifying an approved application. Never expose this as a public
 * database write path.
 */
const {PACKAGES}=require("./membership-policy");
function entitlementFromApplication(record,uid){
  if(!record || record.status!=="active" || record.applicantUid!==uid){
    throw new Error("Only approved applications can create entitlements");
  }
  if(!Object.prototype.hasOwnProperty.call(PACKAGES,record.type) ||
     !Object.prototype.hasOwnProperty.call(PACKAGES[record.type],record.tier) ||
     record.pricePence!==PACKAGES[record.type][record.tier]){
    throw new Error("Invalid approved package");
  }
  if(!Number.isSafeInteger(record.approvedAt) || !Number.isSafeInteger(record.expiresAt) ||
     record.expiresAt<=record.approvedAt){
    throw new Error("Invalid membership dates");
  }
  if(typeof record.approvedBy!=="string" || !record.approvedBy){
    throw new Error("Missing administrator approval");
  }
  if(record.pricePence>0 && (record.paymentStatus!=="verified" ||
     !Number.isSafeInteger(record.paymentVerifiedAt) ||
     typeof record.paymentVerifiedBy!=="string" || !record.paymentVerifiedBy)){
    throw new Error("Paid membership lacks verified payment");
  }
  return {
    type:record.type,tier:record.tier,pricePence:record.pricePence,currency:"GBP",
    approvedAt:record.approvedAt,expiresAt:record.expiresAt,
    approvedBy:record.approvedBy,
    paymentVerifiedAt:record.paymentVerifiedAt||null,
    source:"membershipApplicationIntake"
  };
}
function isActive(entitlement,now=Date.now()){
  return !!entitlement && Number.isSafeInteger(entitlement.approvedAt) &&
    Number.isSafeInteger(entitlement.expiresAt) &&
    now>=entitlement.approvedAt && now<entitlement.expiresAt;
}
async function projectEntitlement(database,uid,record){
  if(typeof uid!=="string"||!/^[A-Za-z0-9_-]{1,128}$/.test(uid))throw new Error("Invalid UID");
  const entitlement=entitlementFromApplication(record,uid);
  const target=database.ref("membershipEntitlements/"+uid);
  const result=await target.transaction(current=>{
    // Existing entitlements are immutable for the same or a newer approval.
    // In particular, a retry must never reset expiry or replace renewal data.
    if(current){
      if(!Number.isSafeInteger(current.approvedAt))return;
      if(current.approvedAt>=entitlement.approvedAt)return;
    }
    return entitlement;
  },undefined,false);
  return {committed:result.committed,entitlement:result.snapshot.val()};
}
module.exports={entitlementFromApplication,isActive,projectEntitlement};
