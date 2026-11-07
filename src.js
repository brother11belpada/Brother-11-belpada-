import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-functions.js";

/* Paste your Firebase web config here after creating a Firebase project. */
const firebaseConfig = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  appId: "PASTE_APP_ID"
};
const configured = !firebaseConfig.apiKey.startsWith("PASTE_");
const $ = id => document.getElementById(id);
$("showReg").onclick=()=>{$("registration").classList.remove("hidden");$("admin").classList.add("hidden")};
$("showAdmin").onclick=()=>{$("admin").classList.remove("hidden");$("registration").classList.add("hidden")};
if(!configured){$("regMsg").textContent="Website setup pending: add Firebase configuration and deploy. The live registration form will activate after setup."; $("loginMsg").textContent="Admin login activates after Firebase setup."; $("regForm").addEventListener("submit",e=>{e.preventDefault();alert("Registration is not live yet. Firebase setup is required.");});$("loginForm").addEventListener("submit",e=>e.preventDefault());}
else {
 const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app), functions=getFunctions(app,"asia-south1");
 const createRegistration=httpsCallable(functions,"createRegistration");
 $("regForm").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const data=Object.fromEntries(f.entries());$("regMsg").textContent="Submitting…";
 try{const result=await createRegistration(data);$("regMsg").textContent=`Registration submitted! Reference: ${result.data.registrationId}. Payment status: Pending admin verification.`;e.currentTarget.reset();}
 catch(err){$("regMsg").textContent=err.message||"Could not submit. Please contact tournament admin.";}});
 $("loginForm").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget);$("loginMsg").textContent="Signing in…";try{await signInWithEmailAndPassword(auth,f.get("email"),f.get("password"));}catch(err){$("loginMsg").textContent="Login failed. Check admin email/password.";}});
 onAuthStateChanged(auth,user=>{if(user){$("dashboard").classList.remove("hidden");$("loginForm").classList.add("hidden");listen();}else{$("dashboard").classList.add("hidden");$("loginForm").classList.remove("hidden");}});
 $("logout").onclick=()=>signOut(auth);
 function listen(){onSnapshot(query(collection(db,"registrations"),orderBy("createdAt","desc")),snap=>{const docs=snap.docs.map(d=>({id:d.id,...d.data()}));$("total").textContent=docs.length;$("received").textContent=docs.filter(x=>x.paymentStatus==="received").length;$("pending").textContent=docs.filter(x=>x.paymentStatus==="pending").length;$("players").innerHTML="";for(const p of docs){const tr=document.createElement("tr");const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));tr.innerHTML=`<td>${safe(p.name)}<br>${safe(p.age)} yrs • ${safe(p.role)}<br>${safe(p.address)}</td><td>${safe(p.phone)}<br>${safe(p.team)}</td><td>${safe(p.utr)}</td><td>${safe(p.paymentStatus)}</td><td><button data-id="${safe(p.id)}" data-status="received">Mark Paid</button><button data-id="${safe(p.id)}" data-status="rejected">Reject</button></td>`;$("players").appendChild(tr);}});}
 $("players").addEventListener("click",async e=>{const b=e.target.closest("button[data-id]");if(!b)return;try{await updateDoc(doc(db,"registrations",b.dataset.id),{paymentStatus:b.dataset.status,reviewedAt:new Date()});}catch(err){alert("Update failed: "+err.message);}});
}