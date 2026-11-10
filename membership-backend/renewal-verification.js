"use strict";
const {PACKAGES}=require("./membership-policy");
const ADMIN_UIDS=new Set([
  "PRGa9TsCW0QDn1QtoUXyYjEi7YB3",
  "SlpEQYl94DaH6j42QUyl8Kv2ujJ3"
]);
function validVerifiedRenewal(pending,uid){
  if(!pending || typeof pending.renewalId!=="string" ||
     !/^[0-9a-f-]{36}$/i.test(pending.renewalId) ||
     pending.applicantUid!==uid ||
     !["payment_verified","active"].includes(pending.status) ||
     pending.paymentStatus!=="verified" ||
     typeof pending.paymentVerifiedBy!=="string" ||
     !ADMIN_UIDS.has(pending.paymentVerifiedBy) ||
     !Number.isSafeInteger(pending.paymentVerifiedAt) ||
     pending.paymentVerifiedAt<=0 ||
     !Number.isSafeInteger(pending.requestedAt) ||
     pending.requestedAt<=0 ||
     pending.paymentVerifiedAt<pending.requestedAt ||
     !Object.hasOwn(PACKAGES,pending.type) ||
     !Object.hasOwn(PACKAGES[pending.type],pending.tier) ||
     PACKAGES[pending.type][pending.tier]===0 ||
     pending.pricePence!==PACKAGES[pending.type][pending.tier])return false;
  return true;
}
module.exports={validVerifiedRenewal};
