/* ========= الإعدادات العامة ========= */
const MANIFEST_URL = "assets/manifest.json"; // مهم: نفس المسار الموجود في الريبو
const GAME_RATIO = 16 / 9; // نسبة العرض:الارتفاع
const WORLD_W = 900; // أبعاد منطقية للرسم (وحدة افتراضية)
const WORLD_H = Math.round(WORLD_W / GAME_RATIO);

const GRAVITY = 2200; // تسارع الجاذبية (px/s^2) بالنسبة للعالم المنطقي
const JUMP_VY = -900; // سرعة القفز الابتدائية
const RUN_SPEED = 300; // سرعة تقدم الخلفية (محاكاة الجري)
const ANIM_FPS = 10; // سرعة تبديل إطارات الركض

/* ========= متغيرات عامة ========= */
let ASSETS = null; // محتوى manifest
const IMAGES = {}; // الصور المحمّلة
let lastTime = 0;
let paused = false;

/* ========= Canvas & Resize ========= */
const CANVAS = document.getElementById("game");
const CTX = CANVAS.getContext("2d");

let viewW = 0, viewH = 0, dpr = 1;
let scaleX = 1, scaleY = 1; // تحويل من نظام العالم → البكسل

function resize() {
const w = window.innerWidth;
const h = window.innerHeight;

// نحافظ على 16:9 داخل الشاشة مع تمركز الكانفس
let drawW, drawH;
if (w / h > GAME_RATIO) {
// الشاشة أعرض من 16:9
drawH = h;
drawW = Math.floor(h * GAME_RATIO);
} else {
// الشاشة أطول من 16:9
drawW = w;
drawH = Math.floor(w / GAME_RATIO);
}

dpr = Math.min(window.devicePixelRatio || 1, 2);
CANVAS.style.width = drawW + "px";
CANVAS.style.height = drawH + "px";
CANVAS.width = Math.floor(drawW * dpr);
CANVAS.height = Math.floor(drawH * dpr);
CTX.setTransform(dpr, 0, 0, dpr, 0, 0);

viewW = drawW;
viewH = drawH;

scaleX = viewW / WORLD_W;
scaleY = viewH / WORLD_H;
}
resize();
window.addEventListener("resize", resize);

/* ========= تحميل الـ manifest و الصور ========= */
function loadImage(path) {
return new Promise((resolve, reject) => {
const img = new Image();
img.onload = () => resolve(img);
img.onerror = () => reject(new Error(`Failed to load ${path}`));
img.src = path;
});
}

async function loadManifest() {
const res = await fetch(MANIFEST_URL, { cache: "no-store" });
if (!res.ok) throw new Error(`HTTP ${res.status}`);
ASSETS = await res.json();
console.log("✅ manifest loaded", ASSETS);
}

async function preload() {
await loadManifest();

// خلفيات (استعمل أي واحد تبغيه في الرسم)
const BG = ASSETS.backgrounds;
IMAGES.bgForest = await loadImage(BG.bg_forest_path);
IMAGES.bgCity = await loadImage(BG.bg_city_street);
IMAGES.bgBeach = await loadImage(BG.bg_beach_sunny);

// اللاعب – نحمّل أهم الإطارات فقط (ركض/قفز/انزلاق/هجوم)
const MK = ASSETS.monkey;
IMAGES.run1 = await loadImage(MK.monkey_run_1);
IMAGES.run2 = await loadImage(MK.monkey_run_2);
IMAGES.run3 = await loadImage(MK.monkey_run_3);
IMAGES.jump = await loadImage(MK.monkey_jump_up);
IMAGES.slide = await loadImage(MK.monkey_slide);
// للهجوم سنستخدم إطار الهجوم المتاح
IMAGES.attack = await loadImage(MK.monkey_jump_attack ?? MK.monkey_attack_mask1);

// عناصر HUD (اختياري حالياً)
}

/* ========= كيان اللاعب البسيط ========= */
const player = {
x: WORLD_W * 0.35,
y: WORLD_H * 0.72,
w: 220,
h: 300,
vy: 0,
onGround: true,
state: "run", // run | jump | slide | attack
animTime: 0
};

/* ========= إدخال المستخدم ========= */
const keys = {};
window.addEventListener("keydown", (e) => {
keys[e.key.toLowerCase()] = true;

if (e.code === "Space") {
doJump();
e.preventDefault();
} else if (e.key.toLowerCase() === "s") {
doSlide();
} else if (e.key.toLowerCase() === "k") {
doAttack();
} else if (e.key.toLowerCase() === "p") {
paused = !paused;
}
});
window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });

function doJump() {
if (player.onGround) {
player.vy = JUMP_VY;
player.onGround = false;
player.state = "jump";
}
}
function doSlide() {
if (player.onGround) {
player.state = "slide";
// رجّعه للركض بعد فترة قصيرة
setTimeout(() => { if (player.onGround && player.state === "slide") player.state = "run"; }, 350);
}
}
function doAttack() {
player.state = "attack";
setTimeout(() => {
if (player.onGround) player.state = "run";
else player.state = "jump";
}, 250);
}

/* ========= الرسم والمشّهد ========= */
let bgScroll = 0;

function drawImageFit(img, dx, dy, dw, dh) {
CTX.drawImage(img, dx, dy, dw, dh);
}

function drawBackground(dt) {
// تمرير بسيط للخلفية لتوحي بالجري
bgScroll += RUN_SPEED * dt;
const img = IMAGES.bgForest; // اختر الخلفية الأساسية (تقدر تبدّل لاحقاً)

// نفترض الخلفية عمودية؛ نرسمها مرتين فوق بعض مع إزاحة
const drawW = viewW, drawH = viewH;
const offset = -(bgScroll % drawH);

drawImageFit(img, 0, offset, drawW, drawH);
drawImageFit(img, 0, offset + drawH, drawW, drawH);
}

function drawPlayer(dt) {
// فيزياء بسيطة
if (!player.onGround) {
player.vy += GRAVITY * dt;
player.y += player.vy * dt;
if (player.y >= WORLD_H * 0.72) {
player.y = WORLD_H * 0.72;
player.vy = 0;
player.onGround = true;
if (player.state !== "attack") player.state = "run";
}
}

// اختيار الإطار
let img = IMAGES.run1;
if (player.state === "run") {
player.animTime += dt;
const f = Math.floor(player.animTime * ANIM_FPS) % 3;
img = f === 0 ? IMAGES.run1 : (f === 1 ? IMAGES.run2 : IMAGES.run3);
} else if (player.state === "jump") {
img = IMAGES.jump;
} else if (player.state === "slide") {
img = IMAGES.slide;
} else if (player.state === "attack") {
img = IMAGES.attack;
}

// تحويل الإحداثيات من العالم → الشاشة
const px = player.x * scaleX - (player.w * scaleX) / 2;
const py = player.y * scaleY - (player.h * scaleY);

CTX.drawImage(img, px, py, player.w * scaleX, player.h * scaleY);
}

/* ========= اللوب الرئيسي ========= */
function frame(ts) {
if (!lastTime) lastTime = ts;
const dt = Math.min(0.033, (ts - lastTime) / 1000);
lastTime = ts;

if (!paused) {
// مسح الشاشة
CTX.clearRect(0, 0, viewW, viewH);
drawBackground(dt);
drawPlayer(dt);
}

requestAnimationFrame(frame);
}

/* ========= تشغيل اللعبة ========= */
(async function start() {
try {
await preload();
console.log("✅ assets ready");
requestAnimationFrame(frame);
} catch (err) {
console.error("❌ Failed to boot:", err);
// رسالة ودّية على الشاشة إذا صار خطأ تحميل
CTX.fillStyle = "#fff";
CTX.font = "16px monospace";
CTX.fillText("Failed to load assets/manifest.json or images.", 20, 32);
}
})();
