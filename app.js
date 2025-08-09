// ------- الإعدادات -------
const SUPABASE_URL = "https://jijtryjvptrkbearkhsl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppanRyeWp2cHRya2JlYXJraHNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NTM4MTksImV4cCI6MjA3MDMyOTgxOX0.MjwUf-9DOdWr4epLrKF7EksSip4cj9QLbA0d44VWU90";

let supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DAILY_CAP = 5000;

// ------- تخزين UID محلي -------
let uid = localStorage.getItem('br_uid') || crypto.randomUUID();
localStorage.setItem('br_uid', uid);

// ------- ربط العناصر -------
const $ = id => document.getElementById(id);
const coinsEl = $('coins');
const airdropEl = $('airdrop');
const todayCountEl = $('todayCount');
const walletInput = $('walletInput');
const refLinkInput = $('refLink');

// ------- بيانات محلية -------
let coins = parseInt(localStorage.getItem('br_coins') || '0', 10);
let today = parseInt(localStorage.getItem('br_today') || '0', 10);

// ------- توليد رابط الإحالة -------
function updateRefLink() {
if (refLinkInput) {
const base = location.origin + location.pathname.replace(/\/+$/, '');
refLinkInput.value = `${base}/?r=${encodeURIComponent(uid)}`;
}
}

// ------- حساب قيمة Airdrop -------
function estAirdrop(c) {
return Math.floor(c / 1000) * 20;
}

// ------- تحديث الواجهة -------
function render() {
if (coinsEl) coinsEl.textContent = coins;
if (airdropEl) airdropEl.textContent = estAirdrop(coins);
if (todayCountEl) todayCountEl.textContent = `${today}/${DAILY_CAP}`;
}

// ------- إضافة نقاط -------
function add(amount) {
const canAdd = Math.min(amount, Math.max(0, DAILY_CAP - today));
coins += canAdd;
today += canAdd;
localStorage.setItem('br_coins', coins);
localStorage.setItem('br_today', today);
render();
}

// ------- حفظ المحفظة -------
async function saveWallet() {
const wallet = walletInput.value.trim();
if (!wallet) return alert('Wallet is empty');
const { error } = await supabaseClient
.from('users')
.upsert({ user_id: uid, wallet: wallet }, { onConflict: ['user_id'] });
if (error) {
console.error(error);
alert('Error saving wallet ❌');
} else {
alert('Wallet saved ✅');
}
}

// ------- مزامنة مع قاعدة البيانات -------
async function syncToDB() {
const { error } = await supabaseClient
.from('balances')
.upsert({ user_id: uid, coins: coins }, { onConflict: ['user_id'] });
if (error) {
console.error(error);
alert('Sync error ❌');
} else {
alert('Synced with Supabase ✅');
}
}

// ------- زر النسخ -------
function copyRef() {
navigator.clipboard.writeText(refLinkInput.value)
.then(() => alert('Copied ✅'))
.catch(() => {
refLinkInput.select();
document.execCommand('copy');
alert('Copied ✅');
});
}

// ------- تشغيل عند تحميل الصفحة -------
document.addEventListener('DOMContentLoaded', () => {
updateRefLink();
render();

$('btn-run')?.addEventListener('click', () => add(10));
$('btn-jump')?.addEventListener('click', () => add(25));
$('btn-sync')?.addEventListener('click', syncToDB);
$('btn-save-wallet')?.addEventListener('click', saveWallet);
$('btn-copy')?.addEventListener('click', copyRef);
});
window.addCoins = add;

