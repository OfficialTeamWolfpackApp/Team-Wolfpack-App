"use strict";
const {PACKAGES,calculateExpiry}=require("./membership-policy");
function transition(record,action,adminUid,now){
  if(!record || typeof record!=="object")throw new Error("Application not found");
  if(!["personal","business"].includes(record.type) ||
    !Object.prototype.hasOwnProperty.call(PACKAGES[record.type],record.tier) ||
    record.pricePence!==PACKAGES[record.type][record.tier]){
    throw new Error("Application package data failed validation");
  }
  const current=record.status;
  // Retry projection if a prior activation succeeded but projection failed.
  if(action==="activate" && current==="active")return record;
  if(action==="mark_awaiting_payment" && current==="new"){
    return {...record,status:"awaiting_payment",reviewedBy:adminUid,reviewedAt:now};
  }
  if(action==="verify_payment" && current==="awaiting_payment" &&
     record.pricePence>0 && record.paymentStatus==="unverified"){
    return {...record,status:"payment_verified",paymentStatus:"verified",
      paymentVerifiedBy:adminUid,paymentVerifiedAt:now};
  }
  if(action==="decline" && ["new","awaiting_payment"].includes(current)){
    return {...record,status:"declined",reviewedBy:adminUid,reviewedAt:now};
  }
  if(action==="activate" && (
    (current==="payment_verified" && record.paymentStatus==="verified") ||
    (current==="new" && record.type==="personal" && record.tier==="free" && record.pricePence===0)
  )){
    return {...record,status:"active",approvedBy:adminUid,approvedAt:now,
      expiresAt:calculateExpiry(now)};
  }
  throw new Error("Action is not allowed from this application state");
}

module.exports={transition};
