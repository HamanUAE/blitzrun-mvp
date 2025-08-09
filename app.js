
// --- Config ---
const SUPABASE_URL = "https://jijtryjvptrkbearkhsl.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppanRyeWp2cHRya2JlYXJraHNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NTM4MTksImV4cCI6MjA3MDMyOTgxOX0.MjwUf-9DOdWr4epLrKF7EksSip4cj9QLbA0d44VWU90";
// ----------------

let supabaseClient;
let uid = localStorage.getItem("br_uid");
let coinsLocal = 0;
const DAILY_CAP = 5000;

// simple per-day cap stored locally
function getTodayKey() { 
  const d = new Date(); 
  return `br_day_${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}
function getTodaySpent(){
  return parseInt(localStorage.getItem(getTodayKey())||"0",10);
}
function addTodaySpent(v){
  const k=getTodayKey();
  const current=getTodaySpent();
  localStorage.setItem(k, String(current+v));
}

function estAirdropFromCoins(c){ return Math.floor(c/1000)*20; }

function updateUI(){
  document.getElementById("coins").textContent = coinsLocal;
  document.getElementById("airdrop").textContent = estAirdropFromCoins(coinsLocal);
  document.getElementById("today").textContent = `${getTodaySpent()} / ${DAILY_CAP}`;
  const base = `${location.origin}${location.pathname}?ref=${uid}`;
  document.getElementById("refLink").value = base;
}

async function init(){
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

  // set or get anon user id
  if(!uid){
    uid = crypto.randomUUID();
    localStorage.setItem("br_uid", uid);
  }

  // process referral (?ref=...)
  try {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref");
    if(ref && ref !== uid){
      await supabaseClient.from("referrals").insert({ referrer_id: ref, referred_id: uid }).select().single().catch(()=>{});
    }
  } catch(e){}

  // ensure user exists
  await supabaseClient.from("users").upsert({ user_id: uid }, { onConflict: "user_id" });

  // get balance
  const { data } = await supabaseClient.from("balances").select("coins").eq("user_id", uid).single();
  coinsLocal = data?.coins ?? 0;
  updateUI();

  // events
  document.getElementById("btnRun").addEventListener("click", ()=>earnLocal(10));
  document.getElementById("btnJump").addEventListener("click", ()=>earnLocal(25));
  document.getElementById("btnSync").addEventListener("click", syncToDB);
  document.getElementById("btnSaveWallet").addEventListener("click", saveWallet);
  document.getElementById("btnCopy").addEventListener("click", ()=>{
    navigator.clipboard.writeText(document.getElementById("refLink").value);
    toast("Copied!");
  });
}

function toast(msg){
  alert(msg); // simple MVP
}

function earnLocal(amount){
  const remaining = DAILY_CAP - getTodaySpent();
  if(remaining <= 0){ toast("Daily cap reached!"); return; }
  const delta = Math.min(amount, remaining);
  coinsLocal += delta;
  addTodaySpent(delta);
  updateUI();
}

async function syncToDB(){
  // read server coins first
  const { data: bal } = await supabaseClient.from("balances").select("coins").eq("user_id", uid).single();
  const serverCoins = bal?.coins ?? 0;
  const delta = coinsLocal - serverCoins;
  if(delta <= 0){ toast("Already synced"); return; }

  const { error } = await supabaseClient.rpc("earn_coins", { p_amount: delta });
  if(error){ console.error(error); toast("Sync failed"); return; }
  toast("Synced!");
}

async function saveWallet(){
  const addr = document.getElementById("wallet").value.trim();
  if(!addr) return;
  await supabaseClient.from("users").update({ wallet: addr }).eq("user_id", uid);
  toast("Wallet saved");
}

// kick off
window.addEventListener("DOMContentLoaded", init);
