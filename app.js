const MANIFEST_URL = './assets/manifest.json'; // مهم: مسار نسبي من index.html

let ASSETS = null;
const IMAGES = {};

async function loadManifest() {
try {
const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
if (!res.ok) throw new Error(`HTTP ${res.status}`);
ASSETS = await res.json();
console.log('✅ manifest loaded:', ASSETS);
} catch (err) {
console.error('❌ Failed to load manifest:', err);
drawError('Failed to load assets/manifest.json');
throw err;
}
}

function loadImage(path) {
return new Promise((resolve, reject) => {
const img = new Image();
img.onload = () => resolve(img);
img.onerror = (e) => reject(new Error('Image load failed: ' + path));
img.src = path;
});
}

async function preloadAssets() {
await loadManifest();

// خلفيات
IMAGES.bg_forest = await loadImage(ASSETS.backgrounds.bg_forest_path);
IMAGES.bg_city = await loadImage(ASSETS.backgrounds.bg_city_street);
IMAGES.bg_beach = await loadImage(ASSETS.backgrounds.bg_beach_sunny);

// العدة الأساسية للعدّاء
IMAGES.run1 = await loadImage(ASSETS.monkey.monkey_run_1);
IMAGES.run2 = await loadImage(ASSETS.monkey.monkey_run_2);
IMAGES.run3 = await loadImage(ASSETS.monkey.monkey_run_3);
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function drawError(msg) {
ctx.fillStyle = '#7b1b1b';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#fff';
ctx.font = '16px monospace';
ctx.fillText(msg, 20, 40);
}

(async function start() {
try {
await preloadAssets();
// رسم سريع للتأكد إن الصور وصلت
ctx.drawImage(IMAGES.bg_forest, 0, 0, canvas.width, canvas.height);
ctx.drawImage(IMAGES.run1, 40, canvas.height - IMAGES.run1.height - 20);
console.log('✅ first draw done');
} catch (e) {
// drawError ناديناه داخل
}
})();
/* =========================
BlitzRun MVP - app.js (full)
Requires:
- assets/manifest.json (بالأسماء التي وضعناها)
- index.html فيه <canvas id="game"></canvas>
========================= */

const MANIFEST_URL = "assets/manifest.json";

const CANVAS = document.getElementById("game");
const CTX = CANVAS.getContext("2d");

// مقاس افتراضي مرن
function resize() {
const w = window.innerWidth;
const h = window.innerHeight;
const ratio = 16/9;
if (w/h > ratio) {
CANVAS.height = h;
CANVAS.width = Math.floor(h*ratio);
} else {
CANVAS.width = w;
CANVAS.height = Math.floor(w/ratio);
}
}
resize(); window.addEventListener("resize", resize);

// -------- تحميل الملف التعريفي + الصور --------
let ASSETS = null; // محتوى manifest (المسارات)
let IMAGES = {}; // الصور المحمّلة الفعلية

async function loadManifest() {
const res = await fetch(MANIFEST_URL, { cache: "no-store" });
if (!res.ok) throw new Error("Cannot load manifest.json");
ASSETS = await res.json();
}

function loadImage(path) {
return new Promise((resolve, reject) => {
const img = new Image();
img.onload = () => resolve(img);
img.onerror = reject;
img.src = path;
});
}

// يحوّل شجرة المسارات إلى شجرة صور محمّلة
async function loadImagesFromMap(map, baseKey = "") {
const out = {};
for (const [key, val] of Object.entries(map)) {
const k = key;
if (typeof val === "string") {
out[k] = await loadImage(val);
} else if (val && typeof val === "object") {
out[k] = await loadImagesFromMap(val, baseKey + k + ".");
}
}
return out;
}

async function preloadAll() {
await loadManifest();
IMAGES = await loadImagesFromMap(ASSETS);
console.log("Assets ready:", IMAGES);
}

// ---------- Game State ----------
const state = {
running: true,
paused: false,
track: 0, // 0: forest, 1: city, 2: beach
score: 0,
coins: 0,
time: 0,
speed: 6, // سرعة التمرير
gravity: 0.9,
groundY: 0, // يحدد بعد معرفة المقاس
bgScroll: [0,0,0], // parallax layers offsets
obstacles: [],
pickups: [],
};

// ---------- Player ----------
const player = {
x: 0,
y: 0,
w: 120,
h: 150,
vy: 0,
onGround: true,
dir: 1,
state: "run", // run / jump / slide / attack / idle
frame: 0,
frameTime: 0,
frameDur: 90, // ms لكل فريم
};

// إعدادات بعد تحميل الصور
function setupAfterAssets() {
player.x = Math.floor(CANVAS.width * 0.18);
state.groundY = Math.floor(CANVAS.height * 0.78);
player.y = state.groundY - player.h;

// تعليمات أعلى اليمين
showTip("Press 1/2/3 to switch tracks • Space=Jump • S=Slide • K=Attack • P=Pause");
}

let tipTimer = 0;
function showTip(msg, ms=3000) {
tip = msg; tipTimer = Date.now() + ms;
}
let tip = "";

// ---------- Helpers ----------
function now() { return performance.now(); }

function rectsOverlap(ax,ay,aw,ah, bx,by,bw,bh) {
return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function pick(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

// ---------- Input ----------
const keys = {};
window.addEventListener("keydown", (e)=>{
keys[e.key.toLowerCase()] = true;

if (e.key === " " || e.code === "Space") {
e.preventDefault();
if (player.onGround && !state.paused) {
player.vy = -17;
player.onGround = false;
player.state = "jump";
}
}
if (e.key.toLowerCase() === "s") {
if (player.onGround && !state.paused) {
player.state = "slide";
player.h = 110;
player.y = state.groundY - player.h;
setTimeout(()=> {
if (player.state === "slide") {
player.state = "run";
player.h = 150;
player.y = state.groundY - player.h;
}
}, 450);
}
}
if (e.key.toLowerCase() === "k") {
if (!state.paused) {
player.state = "attack";
setTimeout(()=> { if (player.onGround) player.state = "run"; }, 250);
}
}
if (e.key.toLowerCase() === "p") {
state.paused = !state.paused;
}
if (e.key === "1") state.track = 0;
if (e.key === "2") state.track = 1;
if (e.key === "3") state.track = 2;
});
window.addEventListener("keyup", (e)=> keys[e.key.toLowerCase()] = false);

// ---------- Content Pools ----------
function available(keysObj) {
// يرجّع فقط المفاتيح الموجودة فعلاً ضمن IMAGES
return Object.keys(keysObj).filter(k => !!keysObj[k]);
}

// الخلفيات
let BG_KEYS = [];
// القرد
let RUN_FRAMES = [];
let JUMP_UP = null, SLIDE = null, ATTACK = null, IDLE = null;
// العقبات والتجميعات
let OBST_KEYS = [];
let PICK_KEYS = [];

function buildPools() {
BG_KEYS = [
IMAGES.backgrounds.bg_forest_path || null,
IMAGES.backgrounds.bg_city_street || null,
IMAGES.backgrounds.bg_beach_sunny || null,
].filter(Boolean);

RUN_FRAMES = [
IMAGES.monkey?.monkey_run_1,
IMAGES.monkey?.monkey_run_2,
IMAGES.monkey?.monkey_run_3,
].filter(Boolean);

JUMP_UP = IMAGES.monkey?.monkey_jump_up || RUN_FRAMES[0];
SLIDE = IMAGES.monkey?.monkey_slide || RUN_FRAMES[0];
ATTACK = IMAGES.monkey?.monkey_jump_attack || RUN_FRAMES[0];
IDLE = IMAGES.monkey?.monkey_idle_happy || RUN_FRAMES[0];

// مفاتيح العقبات من manifest (تجاهُل أي صورة ناقصة)
const obs = IMAGES.obstacles || {};
const wantedObstacles = [
"obstacle_cone","obstacle_barrier","obstacle_boat","obstacle_bush",
"obstacle_puddle","obstacle_water","obstacle_car","obstacle_tree",
"obstacle_crystal","obstacle_hole","obstacle_box","obstacle_ball",
"obstacle_beach_chair","obstacle_bush_small","obstacle_bench",
"obstacle_sandcastle","obstacle_sign"
];
OBST_KEYS = wantedObstacles.filter(k => !!obs[k]).map(k => ({key:k, img:obs[k]}));

const col = IMAGES.collectable || {};
const wantedPickups = ["collect_banana","collect_coins","collect_jetpack","collect_rollerskates","collect_skateboard"];
PICK_KEYS = wantedPickups.filter(k => !!col[k]).map(k => ({key:k, img:col[k]}));
}

// ---------- Spawners ----------
let lastSpawn = 0;
let lastPickSpawn = 0;

function maybeSpawn(dt) {
lastSpawn += dt;
lastPickSpawn += dt;

const laneY = state.groundY;

// عقبات كل 0.9 - 1.4 ثانية
if (lastSpawn > 900 + Math.random()*500 && OBST_KEYS.length) {
lastSpawn = 0;
const o = pick(OBST_KEYS);
const scale = 0.7 + Math.random()*0.5;
const w = Math.floor(o.img.width*scale);
const h = Math.floor(o.img.height*scale);
state.obstacles.push({
img:o.img,
x: CANVAS.width + 30,
y: laneY - h,
w, h,
vx: state.speed + 2
});
}

// تجميعات كل 1.3 - 2.2 ثانية
if (lastPickSpawn > 1300 + Math.random()*900 && PICK_KEYS.length) {
lastPickSpawn = 0;
const p = pick(PICK_KEYS);
const floatY = laneY - 110 - Math.random()*90;
const s = 0.6 + Math.random()*0.4;
const w = Math.floor(p.img.width*s);
const h = Math.floor(p.img.height*s);
state.pickups.push({
key:p.key,
img:p.img,
x: CANVAS.width + 20,
y: floatY,
w,h,
vx: state.speed + 2.5
});
}
}

// ---------- Update ----------
let last = now();

function update() {
const t = now();
const dt = t - last;
last = t;
if (state.paused) return;

state.time += dt;

// تمرير الخلفية
const sp = state.speed;
state.bgScroll[state.track] = (state.bgScroll[state.track] + sp*0.5) % CANVAS.width;

// فيزياء اللاعب
if (!player.onGround) {
player.vy += state.gravity;
player.y += player.vy;
if (player.y >= state.groundY - player.h) {
player.y = state.groundY - player.h;
player.vy = 0;
player.onGround = true;
player.state = "run";
}
}

// فريمات الحركة
player.frameTime += dt;
if (player.frameTime >= player.frameDur) {
player.frameTime = 0;
player.frame = (player.frame + 1) % Math.max(1, RUN_FRAMES.length);
}

// توليد
maybeSpawn(dt);

// تحريك العقبات/التجميعات + تصادم
for (let i=state.obstacles.length-1;i>=0;i--) {
const o = state.obstacles[i];
o.x -= o.vx;
if (o.x + o.w < 0) state.obstacles.splice(i,1);
else if (rectsOverlap(player.x+15, player.y+10, player.w-30, player.h-20, o.x, o.y, o.w, o.h)) {
// لو اللاعب يهاجم، نحذف العقبة ونكسب نقاط
if (player.state === "attack") {
state.score += 5;
state.obstacles.splice(i,1);
showTip("+5 (destroyed)");
} else {
gameOver();
return;
}
}
}

for (let i=state.pickups.length-1;i>=0;i--) {
const p = state.pickups[i];
p.x -= p.vx;
if (p.x + p.w < 0) state.pickups.splice(i,1);
else if (rectsOverlap(player.x+10, player.y+10, player.w-20, player.h-20, p.x, p.y, p.w, p.h)) {
state.pickups.splice(i,1);
if (p.key === "collect_coins") { state.coins += 5; state.score += 5; showTip("+5 coins"); }
else if (p.key === "collect_banana") { state.coins += 1; state.score += 1; }
else { state.score += 3; showTip("+3"); }
}
}

// نقاط تتزايد مع الوقت
state.score += dt * 0.005; // ~ +1 كل 200ms
}

// ---------- Draw ----------
function drawBackground() {
// خلفية موحدة خضراء كطبقة أساس (في حال صورة ناقصة)
CTX.fillStyle = "#245b2a";
CTX.fillRect(0,0,CANVAS.width,CANVAS.height);

const bg = BG_KEYS[state.track];
if (!bg) return;

const y = 0;
const h = CANVAS.height;
const w = Math.floor(bg.width * (h / bg.height));

// بلاطات متكررة أفقياً
const offset = Math.floor(state.bgScroll[state.track]) % w;
for (let x = -offset; x < CANVAS.width; x += w) {
CTX.drawImage(bg, x, y, w, h);
}

// خط الأرض
CTX.fillStyle = "rgba(0,0,0,0.2)";
CTX.fillRect(0, state.groundY+2, CANVAS.width, 4);
}

function drawPlayer() {
let img;
if (player.state === "run") img = RUN_FRAMES[player.frame] || IDLE;
else if (player.state === "jump") img = JUMP_UP;
else if (player.state === "slide") img = SLIDE;
else if (player.state === "attack") img = ATTACK;
else img = IDLE;

const scale = player.h / img.height;
const w = Math.floor(img.width * scale);
const x = player.x;
const y = player.y;
CTX.drawImage(img, x, y, w, player.h);
player.w = w; // حدّث العرض الحقيقي
}

function drawObjects() {
// عقبات
for (const o of state.obstacles) {
CTX.drawImage(o.img, o.x, o.y, o.w, o.h);
}
// تجميعات
for (const p of state.pickups) {
CTX.drawImage(p.img, p.x, p.y, p.w, p.h);
}
}

function drawUI() {
CTX.font = Math.floor(CANVAS.height*0.035) + "px Arial";
CTX.fillStyle = "#ffd04d";
CTX.textAlign = "left";
CTX.fillText("Score: " + Math.floor(state.score), 14, 34);
CTX.fillText("Coins: " + Math.floor(state.coins), 14, 70);

// نص التعليمات (يختفي بعد زمن)
if (Date.now() < tipTimer) {
CTX.textAlign = "right";
CTX.fillText(tip, CANVAS.width-14, 34);
}

// شاشة الإيقاف المؤقت
if (state.paused) {
CTX.fillStyle = "rgba(0,0,0,0.35)";
CTX.fillRect(0,0,CANVAS.width,CANVAS.height);
const pausedImg = IMAGES.ui?.ui_paused || null;
if (pausedImg) {
const w = Math.min(pausedImg.width, CANVAS.width*0.6);
const h = pausedImg.height * (w/pausedImg.width);
CTX.drawImage(pausedImg, (CANVAS.width-w)/2, (CANVAS.height-h)/2, w, h);
} else {
CTX.fillStyle = "#fff";
CTX.textAlign = "center";
CTX.font = Math.floor(CANVAS.height*0.07) + "px Arial";
CTX.fillText("PAUSED", CANVAS.width/2, CANVAS.height/2);
}
}
}

let loopId = null;
function loop() {
if (!state.running) return;
if (!state.paused) update();
drawBackground();
drawObjects();
drawPlayer();
drawUI();
loopId = requestAnimationFrame(loop);
}

// ---------- Game Over ----------
function gameOver() {
state.running = false;
// طبقة تعتيم
CTX.fillStyle = "rgba(0,0,0,0.45)";
CTX.fillRect(0,0,CANVAS.width,CANVAS.height);

const overImg = IMAGES.ui?.ui_game_over_monkey || IMAGES.ui?.ui_game_over_text || null;
if (overImg) {
const w = Math.min(overImg.width, CANVAS.width*0.7);
const h = overImg.height * (w/overImg.width);
CTX.drawImage(overImg, (CANVAS.width-w)/2, (CANVAS.height-h)/2, w, h);
} else {
CTX.fillStyle = "#fff";
CTX.textAlign = "center";
CTX.font = Math.floor(CANVAS.height*0.08) + "px Arial";
CTX.fillText("GAME OVER", CANVAS.width/2, CANVAS.height/2);
}
CTX.textAlign = "center";
CTX.font = Math.floor(CANVAS.height*0.035) + "px Arial";
CTX.fillStyle = "#ffd04d";
CTX.fillText("Refresh the page to try again", CANVAS.width/2, CANVAS.height*0.72);
}

// ---------- Start ----------
(async function start(){
try {
await preloadAll();
buildPools();
setupAfterAssets();
loop();
} catch (err) {
console.error(err);
CTX.fillStyle = "#300";
CTX.fillRect(0,0,CANVAS.width,CANVAS.height);
CTX.fillStyle = "#fff";
CTX.font = "20px monospace";
CTX.fillText("Failed to load assets/manifest.json", 20, 40);
}
})();
