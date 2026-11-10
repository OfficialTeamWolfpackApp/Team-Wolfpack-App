"use strict";

/**
 * Pure reminder delivery policy. Delivery is disabled until an approved
 * provider, consent source, verified recipient and dispatcher are integrated.
 * Never infer consent from having a membership or public profile.
 */
const DELIVERY_STATES=Object.freeze(["queued","claimed","sent","failed","cancelled"]);
function consentAllows(preferences,channel){
  return !!preferences && preferences.membershipRenewalReminders===true &&
    preferences[channel]===true && preferences.updatedAt>0;
}
function canDispatch({reminder,entitlement,preferences,channel,now=Date.now()}){
  if(!reminder||reminder.status!=="queued")return {allowed:false,reason:"not_queued"};
  if(!["email","push"].includes(channel))return {allowed:false,reason:"unsupported_channel"};
  if(!consentAllows(preferences,channel))return {allowed:false,reason:"no_opt_in"};
  if(!entitlement||reminder.expiresAt!==entitlement.expiresAt||
     entitlement.expiresAt<=now)return {allowed:false,reason:"expired_or_changed"};
  if(![30,14,7].includes(reminder.daysBeforeExpiry))return {allowed:false,reason:"invalid_interval"};
  if(!Number.isSafeInteger(reminder.createdAt)||reminder.createdAt>now)return {allowed:false,reason:"invalid_record"};
  return {allowed:true,reason:"eligible"};
}
function deliverySummary(record){
  if(!record)return {status:"unknown",attempts:0};
  const status=DELIVERY_STATES.includes(record.status)?record.status:"unknown";
  return {status,attempts:Number.isSafeInteger(record.attempts)?record.attempts:0,
    sentAt:Number.isSafeInteger(record.sentAt)?record.sentAt:null};
}
module.exports={DELIVERY_STATES,consentAllows,canDispatch,deliverySummary};
