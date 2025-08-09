// ----- BlitzRun MVP - Button Wiring & Local State -----
console.log('BlitzRun app.js loaded');

const $ = (id) => document.getElementById(id);

// توقعات الـIDs في HTML:
// Coins: <span id="coins">0</span>
// Airdrop: <span id="airdrop">0</span>
// Today: <span id="todayCount">0</span>
// Buttons: <button id="btn-run">Run +10</button>, <button id="btn-jump">Jump +25</button>, <button id="btn-sync">Sync to DB</button>
// Wallet: <input id="walletInput"> + <button id="btn-save-wallet">Save</button>

// قيَم محلية
const DAILY_CAP = 5000;
let coins = parseInt(localStorage.getItem('br_coins') || '0', 10);
let today = parseInt(localStorage.getItem('br_today') || '0', 10);

// helpers
function render() {
if ($('coins')) $('coins').textContent = coins;
if ($('airdrop')) $('airdrop').textContent = Math.floor(coins / 50); // مثال: كل 50=1 airdrop (نعدّل لاحقًا)
if ($('todayCount')) $('todayCount').textContent = `${today}/${DAILY_CAP}`;
}

function add(amount) {
const canAdd = Math.min(amount, Math.max(0, DAILY_CAP - today));
today += canAdd;
coins += canAdd;
localStorage.setItem('br_coins', String(coins));
localStorage.setItem('br_today', String(today));
render();
console.log(`Added ${canAdd}. today=${today}, coins=${coins}`);
}

// ربط الأزرار بأمان حتى لو IDs ناقصة
document.addEventListener('DOMContentLoaded', () => {
if ($('btn-run')) $('btn-run').addEventListener('click', () => add(10));
if ($('btn-jump')) $('btn-jump').addEventListener('click', () => add(25));
if ($('btn-sync')) $('btn-sync').addEventListener('click', syncToDB);
if ($('btn-save-wallet')) $('btn-save-wallet').addEventListener('click', saveWallet);
render();
});

// Placeholder: حفظ المحفظة محليًا الآن
function saveWallet() {
const v = ($('walletInput')?.value || '').trim();
if (!v) return alert('Enter your Phantom address');
localStorage.setItem('br_wallet', v);
alert('Wallet saved (local).');
}

// ---------- Supabase (نفعّل لاحقًا بعد التأكد من الأزرار) ----------
const SUPABASE_URL = 'https://jijtryjvptrkbearkhsl.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppanRyeWp2cHRya2JlYXJraHNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NTM4MTksImV4cCI6MjA3MDMyOTgxOX0.MjwUf-9DOdWr4epLrKF7EksSip4cj9QLbA0d44VWU90';

// مبدئيًا نخلي sync مجرد طباعة، وبعد التأكد نشغّل الاتصال الحقيقي
async function syncToDB() {
console.log('Sync clicked. (wire test) coins=', coins, 'today=', today);
alert('Sync clicked ✅ (test). إذا الأزرار تعمل، أفعّل تخزين Supabase لك مباشرة.');
}
