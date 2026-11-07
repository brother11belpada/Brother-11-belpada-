const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {randomUUID} = require("crypto");
initializeApp();
const db=getFirestore();
exports.createRegistration=onCall({region:"asia-south1",maxInstances:5},async(req)=>{
  const d=req.data||{};
  const name=String(d.name||"").trim(), phone=String(d.phone||"").trim(),
    age=Number(d.age), address=String(d.address||"").trim(),
    role=String(d.role||""), team=String(d.team||""), utr=String(d.utr||"").trim();
  if(name.length<2||!/^[6-9]\d{9}$/.test(phone)||!Number.isInteger(age)||age<12||age>65||
    !address||!["Batsman","Bowler","All-rounder","Wicket-keeper"].includes(role)||
    !/^Team [1-5]$/.test(team)||utr.length<6) throw new HttpsError("invalid-argument","Please enter all valid details and the PhonePe transaction ID.");
  const ref=db.collection("registrations").doc();
  await db.runTransaction(async tx=>{
    const all=await tx.get(db.collection("registrations"));
    const active=all.docs.map(x=>x.data()).filter(x=>x.paymentStatus!=="rejected");
    if(active.length>=65) throw new HttpsError("resource-exhausted","All 65 player slots are full.");
    if(active.filter(x=>x.team===team).length>=13) throw new HttpsError("resource-exhausted",team+" is full. Please choose another team.");
    if(active.some(x=>x.phone===phone)) throw new HttpsError("already-exists","This phone number is already registered.");
    if(active.some(x=>x.utr===utr)) throw new HttpsError("already-exists","This transaction ID has already been submitted.");
    tx.create(ref,{name,phone,age,address,role,team,utr,fee:250,paymentStatus:"pending",createdAt:FieldValue.serverTimestamp(),registrationId:randomUUID()});
  });
  return {registrationId:ref.id};
});