"use strict";

/**
 * Renewal/expiry policy. Pure functions only: no database writes, payment
 * collection, automatic charging, or badge/profile deletion.
 *
 * A renewal is a NEW manually verified payment and admin approval. Keep
 * historical applications rather than overwriting an existing approval.
 */
const {PACKAGES,calculateExpiry}=require("./membership-policy");
const {isActive}=require("./membership-entitlements");
const DAY_MS=86400000;
const REMINDER_DAYS=Object.freeze([30,14,7]);

function validateEntitlement(entitlement){
  if(!entitlement || !Object.prototype.hasOwnProperty.call(PACKAGES,entitlement.type) ||
     !Object.prototype.hasOwnProperty.call(PACKAGES[entitlement.type],entitlement.tier) ||
     entitlement.pricePence!==PACKAGES[entitlement.type][entitlement.tier] ||
     !Number.isSafeInteger(entitlement.approvedAt) ||
     !Number.isSafeInteger(entitlement.expiresAt) ||
     entitlement.expiresAt<=entitlement.approvedAt){
    throw new Error("Invalid membership entitlement");
  }
  return entitlement;
}
function membershipState(entitlement,now=Date.now()){
  if(!Number.isSafeInteger(now)||now<0)throw new Error("Invalid time");
  if(!entitlement)return {status:"free",paid:false,daysRemaining:null};
  const record=validateEntitlement(entitlement);
  if(record.type==="personal"&&record.tier==="free"){
    return {status:"free",paid:false,daysRemaining:null};
  }
  if(isActive(record,now)){
    return {status:"active",paid:record.pricePence>0,
      daysRemaining:Math.ceil((record.expiresAt-now)/DAY_MS)};
  }
  return {status:now>=record.expiresAt?"expired":"scheduled",
    paid:false,daysRemaining:now>=record.expiresAt?0:null};
}
function renewalStart(previous,approvedAt){
  if(!Number.isSafeInteger(approvedAt)||approvedAt<0)throw new Error("Invalid approval time");
  if(!previous)return approvedAt;
  validateEntitlement(previous);
  // Extend from the current paid expiry for early renewals; otherwise from
  // the new approval date. This prevents early renewal from losing days.
  return Math.max(previous.expiresAt,approvedAt);
}
function buildRenewal(previous,newApproval){
  if(!newApproval || !newApproval.applicantUid ||
     newApproval.status!=="active" ||
     !newApproval.approvedBy ||
     !Number.isSafeInteger(newApproval.approvedAt)){
    throw new Error("Renewal requires a server-approved application");
  }
  const type=newApproval.type,tier=newApproval.tier;
  if(!Object.prototype.hasOwnProperty.call(PACKAGES,type) ||
     !Object.prototype.hasOwnProperty.call(PACKAGES[type],tier) ||
     newApproval.pricePence!==PACKAGES[type][tier]){
    throw new Error("Invalid renewal package");
  }
  if(previous){
    validateEntitlement(previous);
    if(previous.type!==type)throw new Error("Membership type cannot change during renewal");
  }
  if(newApproval.pricePence>0 && (newApproval.paymentStatus!=="verified" ||
     !newApproval.paymentVerifiedBy ||
     !Number.isSafeInteger(newApproval.paymentVerifiedAt))){
    throw new Error("Manual payment must be verified");
  }
  const startsAt=renewalStart(previous,newApproval.approvedAt);
  return {
    type,tier,pricePence:newApproval.pricePence,currency:"GBP",
    approvedAt:newApproval.approvedAt,startsAt,expiresAt:calculateExpiry(startsAt),
    approvedBy:newApproval.approvedBy,
    paymentVerifiedAt:newApproval.paymentVerifiedAt||null,
    source:"membershipRenewal"
  };
}
function dueReminders(entitlement,now=Date.now()){
  const state=membershipState(entitlement,now);
  if(state.status!=="active"||!state.paid)return [];
  return REMINDER_DAYS.filter(days=>state.daysRemaining===days);
}
module.exports={DAY_MS,REMINDER_DAYS,membershipState,renewalStart,buildRenewal,dueReminders};
