/*******************************
* BlitzRun MVP – app.js
* v1.0
*******************************/

/** 1) Supabase Config (عامّة) **/
const SUPABASE_URL = "https://jijtryjvptrkbearkhsl.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppanRyeWp2cHRya2JlYXJraHNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NTM4MTksImV4cCI6MjA3MDMyOTgxOX0.MjwUf-9DOdWr4epLrKF7EksSip4cj9QLbA0d44VWU90";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/** 2) إعدادات اللعبة **/
const DAILY_LIMIT = 5000; // الحد اليومي
const AIRDROP_PER_1000 = 20; // كل 1000 كوين = 20 أيردروب
const REFERRAL_BONUS = 100; // كل إحالة = 100 أيردروب (تراكمي لاحقاً)
const TELEGRAM_BONUS = 200; // إنضمام تيليجرام لمرة واحدة

/** 3) عناصر الواجهة (تأكد من تطابق IDs) **/
const elCoins = document.getElementById("coins");
const elAirdrop = document.getElementById("airdrop");
const elToday = document.getElementById("today");
const btnRun = document.getElementById("run"); // زر Run +10
const btnJump = document.getElementById("jump"); // زر Jump +25
const btnSync = document.getElementById("sync"); // زر Sync to DB
const inWallet = document.getElementById("wallet"); // حقل المحفظة
const btnSaveWal = document.getElementById("saveWallet");
const inRefLink = document.getElementById("refLink"); // رابط الإحالة للنسخ
const btnCopyRef = document.getElementById("copyRef"); // زر Copy

/** 4) هوية المستخدم (محلياً) **/
let userId = localStorage.getItem("blitz_user");
if (!userId) {
userId = crypto.randomUUID();
localStorage.setItem("blitz_user", userId);
}

/** 5) التقاط كود الإحالة إن وُجد (زيارة أولى فقط) **/
const urlParams = new URLSearchParams(window.location.search);
const refFrom = urlParams.get("r");
if (refFrom && !localStorage.getItem("blitz_ref_captured")) {
localStorage.setItem("blitz_ref_from", refFrom);
localStorage.setItem("blitz_ref_captured", "1");
}

/** 6) حالة الجلسة المحلية (لا تؤثر على الحد اليومي بالسيرفر) **/
let sessionCoins = 0;
let todayCount = 0;

function calcAirdropEstimate(totalCoins) {
return Math.floor(totalCoins / 1000) * AIRDROP_PER_1000;
}

function renderState(row) {
const totalCoins = row?.coins ?? 0;
const totalAird = row?.airdrop ?? calcAirdropEstimate(totalCoins);
elCoins.textContent = totalCoins;
elAirdrop.textContent = totalAird;
elToday.textContent = `${todayCount}/${DAILY_LIMIT}`;
if (inWallet && typeof row?.wallet === "string") inWallet.value = row.wallet || "";
// تحديث رابط الإحالة الظاهر
if (inRefLink) {
const myLink = `${location.origin}${location.pathname}?r=${encodeURIComponent(userId)}`;
inRefLink.value = myLink;
}
}

/** 7) تأكد من وجود صف المستخدم والبيلانس في Supabase **/
async function ensureUser() {
// users
await sb.from("users").upsert([{ id: userId }], { onConflict: "id" });

// balances
const { data } = await sb
.from("balances")
.select("*")
.eq("user_id", userId)
.single();

if (!data) {
// رصيد جديد
const payload = {
user_id : userId,
coins : 0,
airdrop : 0,
referrals: 0,
updated_at: new Date().toISOString()
};

// لو عنده إحالة محفوظة على أول مزامنة، نسجل المصدر مبدئياً (اختياري)
const refSource = localStorage.getItem("blitz_ref_from");
if (refSource) payload.ref_source = refSource;

await sb.from("balances").insert(payload);
return payload;
}
return data;
}

/** 8) تحميل الحالة من قاعدة البيانات **/
async function loadState() {
const row = await ensureUser();

// جلب الرصيد الفعلي بعد الإنشاء
const { data } = await sb
.from("balances")
.select("*")
.eq("user_id", userId)
.single();

renderState(data || row);
}

/** 9) إضافة نقاط محلياً مع احترام الحد اليومي **/
function addCoinsLocal(amount) {
if (todayCount >= DAILY_LIMIT) return;
const canAdd = Math.min(amount, DAILY_LIMIT - todayCount);
todayCount += canAdd;
// عرض فوري فقط. الرصيد الحقيقي يحدث عند الـ Sync
elToday.textContent = `${todayCount}/${DAILY_LIMIT}`;
}

/** 10) مزامنة الرصيد مع قاعدة البيانات (تطبيق الزيادة اليوميّة) **/
async function syncToDB() {
if (todayCount <= 0) return;

// زيادة coins في balances + سجل run
// نقرأ السجل الحالي
const { data: bal } = await sb
.from("balances")
.select("*")
.eq("user_id", userId)
.single();

const newCoins = (bal?.coins || 0) + todayCount;
const newAird = calcAirdropEstimate(newCoins); // تقدير/أو خزّنه

await sb.from("balances").upsert({
user_id: userId,
coins: newCoins,
airdrop: newAird,
updated_at: new Date().toISOString()
});

await sb.from("runs").insert({
user_id: userId,
coins_delta: todayCount,
kind: "play",
created_at: new Date().toISOString()
});

// مكافأة أول زيارة تيليجرام (مثال) – مرة واحدة فقط
if (localStorage.getItem("blitz_tg_join") === "1" && !bal?.telegram_bonus_claimed) {
await sb.from("balances").update({
airdrop: (newAird + TELEGRAM_BONUS),
telegram_bonus_claimed: true,
updated_at: new Date().toISOString()
}).eq("user_id", userId);
}

// احتساب الإحالة إن كنت قادماً من ref ولم تُحتسب بعد
if (bal && !bal.ref_counted && localStorage.getItem("blitz_ref_from")) {
const ref = localStorage.getItem("blitz_ref_from");
// زد رصيد المُحيل
const { data: refBal } = await sb
.from("balances").select("*").eq("user_id", ref).single();

if (refBal) {
await sb.from("balances").update({
airdrop: (refBal.airdrop || 0) + REFERRAL_BONUS,
referrals: (refBal.referrals || 0) + 1,
updated_at: new Date().toISOString()
}).eq("user_id", ref);
}
// علّم أنه تم احتساب هذه الإحالة
await sb.from("balances").update({ ref_counted: true })
.eq("user_id", userId);
}

todayCount = 0;
await loadState();
}

/** 11) حفظ عنوان المحفظة **/
async function saveWallet() {
const wal = (inWallet?.value || "").trim();
if (!wal) return;
await ensureUser();
await sb.from("balances").update({
wallet: wal,
updated_at: new Date().toISOString()
}).eq("user_id", userId);
await loadState();
}

/** 12) نسخ رابط الإحالة **/
function copyReferral() {
if (!inRefLink) return;
inRefLink.select?.();
navigator.clipboard.writeText(inRefLink.value);
}

/** 13) ربط الأزرار **/
btnRun?.addEventListener("click", () => addCoinsLocal(10));
btnJump?.addEventListener("click", () => addCoinsLocal(25));
btnSync?.addEventListener("click", syncToDB);
btnSaveWal?.addEventListener("click", saveWallet);
btnCopyRef?.addEventListener("click", copyReferral);

/** 14) تشغيل أولي **/
loadState().catch(console.error);
