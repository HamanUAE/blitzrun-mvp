/* =========================
BlitzRun MVP - Clean app.js
========================= */

/* ---- Config / Constants ---- */
const MANIFEST_URL = "assets/manifest.json"; // مسار المانيفست
const GAME_RATIO = 16 / 9;
const GRAVITY = 2100; // قوة الجاذبية px/s^2
const JUMP_VELOCITY = -900;
const SLIDE_TIME = 420; // ms
const BASE_SPEED = 360; // سرعة تقدم العالم px/s
const SPAWN_OBS_EVERY = 1000; // ms
const SPAWN_COINS_EVERY = 900; // ms

/* ---- Globals ---- */
let ASSETS = null; // محتوى manifest كمسارات
const IMAGES = {}; // صور محمّلة
let lastStamp = 0;
let running = true;

/* ---- Canvas ---- */
const CANVAS = document.getElementById("game");
const CTX = CANVAS.getContext("2d");
function resize() {
const w = window.innerWidth;
const h = window.innerHeight;
if (w / h > GAME_RATIO) {
CANVAS.height = h;
CANVAS.width = Math.floor(h * GAME_RATIO);
} else {
CANVAS.width = w;
CANVAS.height = Math.floor(w / GAME_RATIO);
}
}
resize(); window.addEventListener("resize", resize);

/* ---- Utils ---- */
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
async function loadImagesFromObject(obj, prefixKey, keys) {
const promises = keys.map(async (k) => {
const path = obj[k];
if (!path) return;
IMAGES[`${prefixKey}.${k}`] = await loadImage(path);
});
await Promise.all(promises);
}

/* ---- Game State ---- */
const bg = {
// نستخدم 3 طبقات بسيطة للبارالاكس من أصل الخلفيات الموجودة
farKey: "backgrounds.bg_forest_path",
midKey: "backgrounds.bg_city_street",
nearKey: "backgrounds.bg_ground_tiles",
farX: 0, midX: 0, nearX: 0
};

const player = {
x: CANVAS.width * 0.2,
y: 0,
w: 220,
h: 260,
vy: 0,
onGround: false,
sliding: false,
slideUntil: 0,
frameIdx: 0,
frameTime: 0,
frameKeys: [
"monkey.monkey_run_1",
"monkey.monkey_run_2",
"monkey.monkey_run_3",
],
jumpKey: "monkey.monkey_jump_up",
slideKey: "monkey.monkey_side",
attackKey: "monkey.monkey_jump_attack",
idleKey: "monkey.monkey_idle_happy"
};

const world = {
speed: BASE_SPEED,
score: 0,
coins: 0,
obstacles: [],
coinsArr: [],
nextObsAt: 0,
nextCoinAt: 0,
};

/* ---- Input ---- */
const keys = { space: false, s: false, k: false, p: false };
window.addEventListener("keydown", (e) => {
if (e.code === "Space") { keys.space = true; e.preventDefault(); }
if (e.key === "s" || e.key === "S") keys.s = true;
if (e.key === "k" || e.key === "K") keys.k = true;
if (e.key === "p" || e.key === "P") { keys.p = true; running = !running; }
});
window.addEventListener("keyup", (e) => {
if (e.code === "Space") keys.space = false;
if (e.key === "s" || e.key === "S") keys.s = false;
if (e.key === "k" || e.key === "K") keys.k = false;
});

/* ---- Entities ---- */
function spawnObstacle() {
const choices = [
"obstacles.obstacle_cone",
"obstacles.obstacle_barrier",
"obstacles.obstacle_box",
"obstacles.obstacle_bench",
"obstacles.obstacle_puddle",
].filter(k => IMAGES[k]); // تأكيد أنها موجودة
if (!choices.length) return;
const key = choices[Math.floor(Math.random() * choices.length)];
const img = IMAGES[key];
const scale = 0.7 + Math.random() * 0.25;
world.obstacles.push({
key,
img,
x: CANVAS.width + 40,
y: groundY() - img.height * scale,
w: img.width * scale,
h: img.height * scale
});
}
function spawnCoins() {
const key = "collectable.collect_coins";
const img = IMAGES[key];
if (!img) return;
const baseY = groundY() - 160 - Math.random() * 80;
for (let i = 0; i < 4; i++) {
world.coinsArr.push({
key,
img,
x: CANVAS.width + i * 60,
y: baseY,
w: img.width * 0.9,
h: img.height * 0.9
});
}
}

/* ---- Helpers ---- */
function groundY() {
// أرض افتراضية: أسفل اللوحة ناقص هامش
return CANVAS.height - 90;
}
function aabb(a, b) {
return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/* ---- Draw ---- */
function drawTextHUD() {
CTX.fillStyle = "#ffd25a";
CTX.font = "20px Arial";
CTX.textBaseline = "top";
CTX.fillText(`Score: ${Math.floor(world.score)}`, 12, 12);
CTX.fillText(`Coins: ${world.coins}`, 120, 12);

const msg = "Press Space = Jump • S = Slide • K = Attack • P = Pause";
CTX.textAlign = "right";
CTX.fillText(msg, CANVAS.width - 12, 12);
CTX.textAlign = "left";
}
function drawBG(dt) {
// تحريك الطبقات بسرعات مختلفة
const far = IMAGES[bg.farKey];
const mid = IMAGES[bg.midKey];
const near = IMAGES[bg.nearKey];

const sp = world.speed;
bg.farX -= sp * 0.1 * dt;
bg.midX -= sp * 0.35 * dt;
bg.nearX -= sp * 0.7 * dt;

// دالة ترسم صورة مكررة أفقياً لملء العرض
function tile(img, x) {
if (!img) return;
const h = CANVAS.height;
const scale = h / img.height;
const w = img.width * scale;
let start = x % w;
if (start > 0) start -= w;
for (let px = start; px < CANVAS.width; px += w) {
CTX.drawImage(img, px, 0, w, h);
}
}
tile(far, bg.farX);
tile(mid, bg.midX);
tile(near, bg.nearX);
}
function drawPlayer(dt) {
// في الهواء
if (!player.onGround) {
const key = keys.k ? player.attackKey : player.jumpKey;
const img = IMAGES[key] || IMAGES[player.idleKey];
blit(img, player.x, player.y, player.w, player.h);
return;
}
// انزلاق
if (player.sliding) {
const img = IMAGES[player.slideKey] || IMAGES[player.idleKey];
blit(img, player.x, player.y + 48, player.w, player.h - 48);
return;
}
// جري بإطارات
player.frameTime += dt;
if (player.frameTime > 0.09) {
player.frameTime = 0;
player.frameIdx = (player.frameIdx + 1) % player.frameKeys.length;
}
const runImg = IMAGES[player.frameKeys[player.frameIdx]] || IMAGES[player.idleKey];
blit(runImg, player.x, player.y, player.w, player.h);
}
function blit(img, x, y, w, h) {
if (!img) return;
CTX.drawImage(img, x, y, w, h);
}

/* ---- Update ---- */
function update(dt) {
if (!running) return;
// فيزياء اللاعب
player.vy += GRAVITY * dt;
player.y += player.vy * dt;

// أرض
const gy = groundY() - player.h;
if (player.y >= gy) {
player.y = gy;
player.vy = 0;
player.onGround = true;
} else {
player.onGround = false;
}

// قفز
if (keys.space && player.onGround) {
player.vy = JUMP_VELOCITY;
player.onGround = false;
keys.space = false; // لمنع القفز المستمر
}
// سلايد
if (keys.s && player.onGround && !player.sliding) {
player.sliding = true;
player.slideUntil = performance.now() + SLIDE_TIME;
}
if (player.sliding && performance.now() > player.slideUntil) {
player.sliding = false;
}

// تقدم العالم
const sp = world.speed * dt;
world.score += dt * 10;

// حرّك العقبات والعملات
world.obstacles.forEach(o => o.x -= sp);
world.coinsArr.forEach(c => c.x -= sp);
world.obstacles = world.obstacles.filter(o => o.x + o.w > -30);
world.coinsArr = world.coinsArr.filter(c => c.x + c.w > -30);

// توليد
const now = performance.now();
if (now > world.nextObsAt) {
spawnObstacle();
world.nextObsAt = now + SPAWN_OBS_EVERY * (0.8 + Math.random() * 0.5);
}
if (now > world.nextCoinAt) {
spawnCoins();
world.nextCoinAt = now + SPAWN_COINS_EVERY * (0.8 + Math.random() * 0.5);
}

// تصادمات
const pRect = { x: player.x + 20, y: player.y + 15, w: player.w - 40, h: player.h - 30 };
for (const o of world.obstacles) {
if (aabb(pRect, o)) {
// اصطدام -> أعد الضبط البسيط
world.score = 0;
world.coins = 0;
world.obstacles.length = 0;
world.coinsArr.length = 0;
world.speed = BASE_SPEED;
break;
}
}
for (let i = world.coinsArr.length - 1; i >= 0; i--) {
if (aabb(pRect, world.coinsArr[i])) {
world.coins++;
world.coinsArr.splice(i, 1);
}
}
}

/* ---- Render ---- */
function render(dt) {
CTX.clearRect(0, 0, CANVAS.width, CANVAS.height);
drawBG(dt);

// خط أرضي بسيط
CTX.fillStyle = "rgba(0,0,0,0.15)";
CTX.fillRect(0, groundY() + 70, CANVAS.width, 6);

// عملات
world.coinsArr.forEach(c => blit(c.img, c.x, c.y, c.w, c.h));

// عقبات
world.obstacles.forEach(o => blit(o.img, o.x, o.y, o.w, o.h));

// لاعب
drawPlayer(dt);

// HUD
drawTextHUD();
}

/* ---- Game Loop ---- */
function loop(ts) {
const dt = Math.min(0.033, (ts - lastStamp) / 1000 || 0);
lastStamp = ts;
if (ASSETS) { update(dt); render(dt); }
requestAnimationFrame(loop);
}

/* ---- Boot ---- */
(async function start() {
try {
await loadManifest();

// تحميل الصور المطلوبة (نحدد مفاتيح نحتاجها فقط لتسريع التحميل)
await loadImagesFromObject(ASSETS.backgrounds, "backgrounds", [
"bg_forest_path", "bg_city_street", "bg_ground_tiles", "bg_beach_sunny", "bg_cave_crystals"
]);
await loadImagesFromObject(ASSETS.monkey, "monkey", [
"monkey_run_1","monkey_run_2","monkey_run_3",
"monkey_jump_up","monkey_jump_attack","monkey_side","monkey_idle_happy"
]);
await loadImagesFromObject(ASSETS.obstacles, "obstacles", [
"obstacle_cone","obstacle_barrier","obstacle_box","obstacle_bench",
"obstacle_puddle","obstacle_tree","obstacle_crystal","obstacle_sign"
]);
await loadImagesFromObject(ASSETS.collectable, "collectable", [
"collect_coins"
]);

// اضبط ارتفاع اللاعب فوق الأرض
player.y = groundY() - player.h;

requestAnimationFrame(loop);
} catch (err) {
console.error("❌ Failed to boot:", err);
CTX.fillStyle = "#fff";
CTX.font = "20px monospace";
CTX.fillText("Failed to load assets/manifest.json", 24, 48);
}
})();
