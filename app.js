/* =========================
BlitzRun MVP — clean core
========================= */

/* --------- ثوابت عامة --------- */
const MANIFEST_URL = "assets/manifest.json";
const GAME_RATIO = 9 / 16; // 9:16
const GRAVITY = 2600; // جاذبية PX/s^2
const JUMP_VELOCITY = -1050; // قفزة
const BG_SPEED = 160; // سرعة الخلفية PX/s
const RUN_FRAME_TIME = 0.12; // زمن إطار الركض
const OTHER_FRAME_TIME = 0.18; // زمن الإطارات للحالات الأخرى

/* --------- متغيرات عالمية --------- */
let ASSETS = null;
let IMAGES = {};
let lastStamp = 0;
let running = true;

/* --------- Canvas --------- */
const CANVAS = document.getElementById("game");
const CTX = CANVAS.getContext("2d");

function resize() {
const w = window.innerWidth;
const h = window.innerHeight;
if (w / h > GAME_RATIO) {
// الشاشة أعرض من 9:16 → ثبّت الارتفاع
CANVAS.height = h;
CANVAS.width = Math.floor(h * GAME_RATIO);
} else {
// الشاشة أطول من 9:16 → ثبّت العرض
CANVAS.width = w;
CANVAS.height = Math.floor(w / GAME_RATIO);
}
}
resize();
window.addEventListener("resize", resize);

/* --------- Utils --------- */
function loadImage(path) {
return new Promise((resolve, reject) => {
const img = new Image();
img.onload = () => resolve(img);
img.onerror = reject;
img.src = path;
});
}

async function loadManifest() {
const res = await fetch(MANIFEST_URL, { cache: "no-store" });
if (!res.ok) throw new Error(`HTTP ${res.status}`);
ASSETS = await res.json();
console.log("manifest loaded", ASSETS);
}

/* رسم صورة تغطي الكانفاس أفقيًا، ونكرّرها بالـ X للتمرير */
function drawBGCoverTiledX(img, offsetX) {
const cw = CANVAS.width, ch = CANVAS.height;
const scale = Math.max(cw / img.width, ch / img.height);
const drawW = img.width * scale;
const drawH = img.height * scale;

let startX = - (offsetX % drawW);
if (startX > 0) startX -= drawW;

for (let x = startX; x < cw; x += drawW) {
CTX.drawImage(img, 0, 0, img.width, img.height, Math.floor(x), 0, Math.ceil(drawW), Math.ceil(drawH));
}
}

/* رسم السبرايت بتمركز */
function drawCentered(img, x, y, scale = 1) {
const w = img.width * scale;
const h = img.height * scale;
CTX.drawImage(img, Math.floor(x - w / 2), Math.floor(y - h), Math.floor(w), Math.floor(h));
}

/* --------- تحميل الصور المطلوبة فقط --------- */
async function loadImages() {
// خلفية — اختَر واحدة واضحة
IMAGES.bg = await loadImage(ASSETS.backgrounds.bg_forest_path);

// سبرايت القرد (اعتمد أسماء موجودة في manifest)
IMAGES.monkey = {
idle: [await loadImage(ASSETS.monkey.monkey_idle_happy)],
run: [
await loadImage(ASSETS.monkey.monkey_run_1),
await loadImage(ASSETS.monkey.monkey_run_2),
await loadImage(ASSETS.monkey.monkey_run_3),
],
jump: [
await loadImage(ASSETS.monkey.monkey_jump_up),
await loadImage(ASSETS.monkey.monkey_jump_happy),
],
slide: [await loadImage(ASSETS.monkey.monkey_slide)], // لو شكلها غير مناسب نبدّل لاحقًا
attack: [await loadImage(ASSETS.monkey.monkey_jump_attack)],
};
}

/* --------- لاعب (آلة حالات) --------- */
const player = {
x: 0,
y: 0,
vy: 0,
onGround: true,
state: "run",
frame: 0,
ft: 0, // frame timer
scale: 0.55 // تحجيم السبرايت على الكانفاس
};

let groundY = 0;
let bgOffset = 0;

/* --------- إدخال --------- */
const keys = { Jump: false, Slide: false, Attack: false };

window.addEventListener("keydown", (e) => {
if (e.code === "Space") {
if (player.onGround) {
keys.Jump = true;
player.vy = JUMP_VELOCITY;
player.onGround = false;
player.state = "jump";
player.frame = 0; player.ft = 0;
}
e.preventDefault();
} else if (e.code === "KeyS") {
keys.Slide = true;
if (player.onGround) {
player.state = "slide";
player.frame = 0; player.ft = 0;
// رجوع تلقائي للركض بعد نصف ثانية
setTimeout(() => { if (player.onGround && player.state === "slide") player.state = "run"; }, 500);
}
} else if (e.code === "KeyK") {
keys.Attack = true;
player.state = "attack";
player.frame = 0; player.ft = 0;
setTimeout(() => { if (player.onGround && player.state === "attack") player.state = "run"; }, 320);
} else if (e.code === "KeyP") {
running = !running;
}
});

window.addEventListener("keyup", (e) => {
if (e.code === "Space") keys.Jump = false;
if (e.code === "KeyS") keys.Slide = false;
if (e.code === "KeyK") keys.Attack = false;
});

/* --------- تهيئة --------- */
async function boot() {
try {
await loadManifest();
await loadImages();

// تموضع أوّلي
player.x = CANVAS.width * 0.35;
groundY = CANVAS.height * 0.85; // خط الأرض النسبي
player.y = groundY;
lastStamp = performance.now();
requestAnimationFrame(loop);
} catch (err) {
console.error("❌ boot error:", err);
drawError("Failed to load assets/manifest.json");
}
}

function drawError(msg) {
CTX.fillStyle = "#5b0f0f";
CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
CTX.fillStyle = "#fff";
CTX.font = "16px monospace";
CTX.fillText(msg, 20, 40);
}

/* --------- تحديث ورسم --------- */
function update(dt) {
// تمرير الخلفية أفقيًا
bgOffset += BG_SPEED * dt;

// فيزياء اللاعب
if (!player.onGround) {
player.vy += GRAVITY * dt;
player.y += player.vy * dt;
if (player.y >= groundY) {
player.y = groundY;
player.vy = 0;
player.onGround = true;
// رجوع للحالة المناسبة
player.state = (keys.Slide) ? "slide" : "run";
player.frame = 0; player.ft = 0;
}
}

// اختيار سرعة الأنيميشن حسب الحالة
const frames = IMAGES.monkey[player.state];
const frameTime = (player.state === "run") ? RUN_FRAME_TIME : OTHER_FRAME_TIME;
player.ft += dt;
if (player.ft >= frameTime) {
player.ft = 0;
player.frame = (player.frame + 1) % frames.length;
}
}

function render() {
const cw = CANVAS.width, ch = CANVAS.height;

// خلفية مكرّرة أفقيًا
drawBGCoverTiledX(IMAGES.bg, bgOffset);

// خط الأرض (اختياري للتأكيد)
// CTX.fillStyle = "rgba(0,0,0,0.15)";
// CTX.fillRect(0, groundY, cw, 2);

// رسم اللاعب
const img = IMAGES.monkey[player.state][player.frame];
drawCentered(img, player.x, player.y, player.scale);

// HUD بسيط (النص موجود في HTML أيضًا، هنا للتأكد)
CTX.font = "bold 16px Arial";
CTX.fillStyle = "#ffcc66";
CTX.textAlign = "left";
CTX.fillText("Score: 0", 12, 24);
CTX.fillText("Coins: 0", 12, 46);
CTX.textAlign = "right";
CTX.fillText("Press Space to Jump • S Slide • K Attack • P Pause", cw - 12, 24);
}

function loop(ts) {
const dt = Math.min(0.033, (ts - lastStamp) / 1000); // سقف 30fps dt
lastStamp = ts;

if (running) {
update(dt);
}
CTX.clearRect(0, 0, CANVAS.width, CANVAS.height);
render();

requestAnimationFrame(loop);
}

/* ابدأ */
boot();
