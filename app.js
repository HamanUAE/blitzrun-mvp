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

/* ===========================
BlitzRun Mini – Canvas Game
=========================== */

(function () {
const canvas = document.getElementById('gameCanvas');
if (!canvas) return; // لو الصفحة بدون كانفس

const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// تحميل صور
const img = (src) => {
const i = new Image();
i.src = src;
return i;
};

// تأكد من المسارات والأسماء داخل assets/
const sprites = {
bgFar: img('assets/bg_far.png.jpg'),
bgMid: img('assets/bg_mid.png.jpg'),
ape: img('assets/ape.png.jpg'),
banana: img('assets/banana.png.jpg'),
rock: img('assets/rock.png.jpg'),
};

// حالة اللعبة
let speed = 2; // سرعة المشي الأساسية
let boostTimer = 0; // عداد البوست من زر Run
const gravity = 0.6;
const groundY = H - 80; // خط الأرض التقريبي

const player = {
x: 120,
y: groundY,
vy: 0,
w: 64,
h: 64,
onGround: true
};

// خلفيات تتحرك تكراريًا
const layers = [
{ img: sprites.bgFar, x: 0, speed: 0.4 },
{ img: sprites.bgFar, x: W, speed: 0.4 },
{ img: sprites.bgMid, x: 0, speed: 1.0 },
{ img: sprites.bgMid, x: W, speed: 1.0 },
];

// كائنات العالم
const bananas = [];
const rocks = [];

function rand(min, max) { return Math.random() * (max - min) + min; }

// توليد عناصر دورية
let spawnT = 0;
function spawnStuff(dt) {
spawnT += dt;
if (spawnT > 1000) { // كل ~1 ثانية
spawnT = 0;

// 60% موز – 40% صخر
if (Math.random() < 0.6) {
bananas.push({
x: W + 40,
y: groundY - 30 - rand(0, 60),
w: 36, h: 36,
taken: false
});
} else {
rocks.push({
x: W + 40,
y: groundY - 32,
w: 42, h: 42,
hit: false
});
}
}
}

// فيزياء اللاعب
function updatePlayer() {
// جاذبية
if (!player.onGround) {
player.vy += gravity;
player.y += player.vy;
if (player.y >= groundY) {
player.y = groundY;
player.vy = 0;
player.onGround = true;
}
}
}

// تصادم AABB بسيط
function collide(a, b) {
return (
a.x < b.x + b.w &&
a.x + a.w > b.x &&
a.y < b.y + b.h &&
a.y + a.h > b.y
);
}

// تحديث العالم
function update(dt) {
// سرعة مع بوست
const runBoost = boostTimer > 0 ? 2.0 : 1.0;
if (boostTimer > 0) boostTimer -= dt;

// حرّك الخلفيات
for (const L of layers) {
L.x -= L.speed * speed * runBoost;
if (L.x <= -W) L.x += W * 2;
}

// حرّك/تحقق موز
for (const b of bananas) {
b.x -= speed * runBoost;
if (!b.taken && collide(
{ x: player.x, y: player.y - player.h, w: player.w, h: player.h },
b
)) {
b.taken = true;
// أضف 10 عملات عند التجميع
if (typeof window.addCoins === 'function') window.addCoins(10);
}
}

// حرّك/تحقق صخور
for (const r of rocks) {
r.x -= speed * runBoost;
if (!r.hit && collide(
{ x: player.x, y: player.y - player.h, w: player.w, h: player.h },
r
)) {
r.hit = true;
// ارتداد بسيط عند الاصطدام
player.vy = -8;
player.onGround = false;
}
}

// نظّف خارج الشاشة
while (bananas.length && bananas[0].x < -80) bananas.shift();
while (rocks.length && rocks[0].x < -80) rocks.shift();

// توليد جديد
spawnStuff(dt);

// حدّث اللاعب
updatePlayer();
}

// رسم
function draw() {
// خلفية
ctx.fillStyle = '#0c1f17';
ctx.fillRect(0, 0, W, H);

// طبقات
for (const L of layers) {
if (L.img.complete) ctx.drawImage(L.img, L.x, 0, W, H);
}

// موز
for (const b of bananas) {
if (!b.taken && sprites.banana.complete) {
ctx.drawImage(sprites.banana, b.x, b.y - b.h, b.w, b.h);
}
}

// صخور
for (const r of rocks) {
if (sprites.rock.complete) {
ctx.drawImage(sprites.rock, r.x, r.y - r.h, r.w, r.h);
}
}

// اللاعب (القرد)
if (sprites.ape.complete) {
ctx.drawImage(sprites.ape, player.x, player.y - player.h, player.w, player.h);
}

// خط أرض بسيط مرجعي
// ctx.strokeStyle = '#184f3a'; ctx.beginPath(); ctx.moveTo(0, groundY+1); ctx.lineTo(W, groundY+1); ctx.stroke();
}

// لوب
let last = performance.now();
function loop(now) {
const dt = Math.min(32, now - last); // cap
last = now;
update(dt);
draw();
requestAnimationFrame(loop);
}

// تحكم الأزرار داخل قسم اللعبة
const btnRun = document.getElementById('g-run');
const btnJump = document.getElementById('g-jump');

btnRun && btnRun.addEventListener('click', () => {
// بوست سرعة لمدة 2.5 ثانية
boostTimer = 2500;
});

btnJump && btnJump.addEventListener('click', () => {
if (player.onGround) {
player.vy = -12;
player.onGround = false;
}
});

// مفاتيح لوحة المفاتيح
document.addEventListener('keydown', (e) => {
if (e.code === 'Space' || e.code === 'ArrowUp') {
e.preventDefault();
btnJump?.click();
}
if (e.code === 'ArrowRight') {
btnRun?.click();
}
});

// انطلاق
requestAnimationFrame(loop);
})();
