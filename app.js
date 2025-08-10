const MANIFEST_URL = 'assets/manifest.json';
let ASSETS = null;
async function loadManifest() {
const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
ASSETS = await res.json();
console.log('manifest loaded:', ASSETS); // للتأكد
}
function loadImage(path) {
return new Promise((resolve, reject) => {
const img = new Image();
img.onload = () => resolve(img);
img.onerror = reject;
img.src = path;
});
}
async function preloadAssets() {
await loadManifest();

// أمثلة: خلفيات
const bgForest = await loadImage(ASSETS.backgrounds.bg_forest_path);
const bgCity = await loadImage(ASSETS.backgrounds.bg_city_street);
const bgBeach = await loadImage(ASSETS.backgrounds.bg_beach_sunny);

// اللاعب (ركض/قفز/انزلاق)
const run1 = await loadImage(ASSETS.monkey.monkey_run_1);
const run2 = await loadImage(ASSETS.monkey.monkey_run_2);
const run3 = await loadImage(ASSETS.monkey.monkey_run_3);
const jump = await loadImage(ASSETS.monkey.monkey_jump_up);
const slide= await loadImage(ASSETS.monkey.monkey_slide);

// عقبات المدينة/الشاطئ/الكهف (أمثلة)
const cone = await loadImage(ASSETS.obstacles.obstacle_cone);
const bench = await loadImage(ASSETS.obstacles.obstacle_bench);
const ball = await loadImage(ASSETS.obstacles.obstacle_ball);
const crystal= await loadImage(ASSETS.obstacles.obstacle_crystal);

// UI
const uiPaused = await loadImage(ASSETS.ui.ui_paused);
const uiScore = await loadImage(ASSETS.ui.ui_scoreboard);

// خزّن اللي تحتاجه في كائن global أو state اللعبة
window.GFX = { bgForest, bgCity, bgBeach, run1, run2, run3, jump, slide, cone, bench, ball, crystal, uiPaused, uiScore };
}
preloadAssets().then(startGame).catch(console.error);
async function preloadAssets() {
await loadManifest();

// خلفيات
const bgForest = await loadImage(ASSETS.backgrounds.bg_forest_path);
const bgCity = await loadImage(ASSETS.backgrounds.bg_city_street);
const bgBeach = await loadImage(ASSETS.backgrounds.bg_beach_sunny);

// اللاعب
const run1 = await loadImage(ASSETS.monkey.monkey_run_1);
const run2 = await loadImage(ASSETS.monkey.monkey_run_2);
const run3 = await loadImage(ASSETS.monkey.monkey_run_3);
const jump = await loadImage(ASSETS.monkey.monkey_jump_up);
const slide = await loadImage(ASSETS.monkey.monkey_slide);

// UI (أمثلة)
const uiPaused = await loadImage(ASSETS.ui.ui_paused);
const uiScore = await loadImage(ASSETS.ui.ui_scoreboard);

// خزّنها لاستخدامها لاحقًا
window.GFX = {
bgForest, bgCity, bgBeach,
run1, run2, run3, jump, slide,
uiPaused, uiScore
};
}
function startGame() {
// هنا تستخدم window.GFX في الرسم/التحديث…
console.log('game start, assets ready:', window.GFX);
}

preloadAssets()
.then(startGame)
.catch(err => {
console.error('Asset preload failed:', err);
alert('Failed to load assets. Check console.');
});
// -------- Asset manifest loader --------
const MANIFEST_URL = "assets/manifest.json";
let PATHS = null; // raw paths from manifest
let IMAGES = null; // HTMLImageElements mirroring manifest structure

async function loadManifest() {
const res = await fetch(MANIFEST_URL, { cache: "no-store" });
PATHS = await res.json();
}

// Walk nested object and replace each path with loaded Image()
async function loadImagesFromManifest() {
function walk(obj, baseKey = "") {
const out = Array.isArray(obj) ? [] : {};
for (const k in obj) {
const v = obj[k];
if (typeof v === "string") {
out[k] = loadImage(v);
} else {
out[k] = walk(v, baseKey ? `${baseKey}.${k}` : k);
}
}
return out;
}
function loadImage(src) {
return new Promise((resolve, reject) => {
const img = new Image();
img.onload = () => resolve(img);
img.onerror = reject;
img.src = src;
});
}
const tree = walk(PATHS);
// await all leaves:
async function resolveLeaves(node) {
if (node instanceof Promise) return await node;
if (typeof node !== "object") return node;
const out = Array.isArray(node) ? [] : {};
for (const k in node) out[k] = await resolveLeaves(node[k]);
return out;
}
IMAGES = await resolveLeaves(tree);
}

// Helpers to access images safely
const A = {
bg: (key) => IMAGES.backgrounds[key],
mk: (key) => IMAGES.monkey[key],
ui: (key) => IMAGES.ui[key],
ic: (key) => IMAGES.icons[key],
col: (key) => IMAGES.collectable[key],
obs: (key) => IMAGES.obstacles[key], // انتبه: اسم المجلد obstacles
};

// -------- Canvas / world setup --------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
function resize() {
canvas.width = Math.floor(window.innerWidth * devicePixelRatio);
canvas.height = Math.floor(window.innerHeight * devicePixelRatio);
ctx.setTransform(1,0,0,1,0,0);
ctx.scale(devicePixelRatio, devicePixelRatio);
}
resize();
window.addEventListener("resize", resize);

// -------- Game state --------
const state = {
running: true,
gameOver: false,
score: 0,
coins: 0,
speed: 6,
gravity: 0.9,
groundY: () => canvas.height / devicePixelRatio - 120,
};

// Background layers (parallax)
const BG_KEYS = ["bg_forest_path","bg_city_street","bg_beach_sunny"];
let bgIndex = 0;
let bgX = 0;

function drawBackground(dt) {
const img = A.bg(BG_KEYS[bgIndex]);
if (!img) return;
const viewW = canvas.width / devicePixelRatio;
const viewH = canvas.height / devicePixelRatio;

// cover screen
const s = Math.max(viewW / img.width, viewH / img.height);
const w = img.width * s, h = img.height * s;

bgX -= state.speed * 0.5;
if (bgX <= -w) bgX += w;

// tile twice for seamless scroll
ctx.drawImage(img, bgX, 0, w, h);
ctx.drawImage(img, bgX + w, 0, w, h);
}

// -------- Player (monkey) --------
const player = {
x: 120,
y: 0,
vy: 0,
w: 120,
h: 150,
onGround: true,
action: "run", // run | jump | slide | attack
frame: 0,
frameTime: 0,
};

function setAction(a) {
if (player.action === a) return;
player.action = a;
player.frame = 0;
player.frameTime = 0;
}

function getRunFrames() { return [A.mk("monkey_run_1"), A.mk("monkey_run_2"), A.mk("monkey_run_3")]; }
function getJumpImg() { return A.mk("monkey_jump_up"); }
function getSlideImg(){ return A.mk("monkey_slide"); }
function getAttackImg(){ return A.mk("monkey_attack_mask"); }
function getIdleHappy(){ return A.mk("monkey_idle_happy"); }

function updatePlayer(dt) {
const ground = state.groundY();

// gravity
player.vy += state.gravity;
player.y += player.vy;
if (player.y > ground - player.h) {
player.y = ground - player.h;
player.vy = 0;
player.onGround = true;
if (player.action === "jump") setAction("run");
}

// animation frame step
player.frameTime += dt;
if (player.action === "run") {
const runFrames = getRunFrames();
if (player.frameTime > 100) { // ms
player.frame = (player.frame + 1) % runFrames.length;
player.frameTime = 0;
}
}
}

function drawPlayer() {
let img;
if (player.action === "run") img = getRunFrames()[player.frame];
else if (player.action === "jump") img = getJumpImg();
else if (player.action === "slide") img = getSlideImg();
else if (player.action === "attack") img = getAttackImg();
else img = getIdleHappy();

if (!img) return;
ctx.drawImage(img, player.x, player.y, player.w, player.h);
}

// -------- Obstacles & Collectables --------
const obstacles = [];
const pickups = [];

const OBSTACLE_KEYS = [
"obstacle_cone", "obstacle_box", "obstacle_bench",
"obstacle_tree", "obstacle_car", "obstacle_bush",
"obstacle_crystal", "obstacle_hole",
"obstacle_beach_ball", "obstacle_beach_chair"
].filter(k => PATHS?.obstacles?.[k]); // يحذف المفاتيح غير الموجودة لو تغيّر manifest

const PICKUP_KEYS = ["collect_coins","collect_banana","collect_rollerskates","collect_skateboard","collect_jetpack"]
.filter(k => PATHS?.collectable?.[k]);

function spawnObstacle() {
if (OBSTACLE_KEYS.length === 0) return;
const key = OBSTACLE_KEYS[Math.floor(Math.random()*OBSTACLE_KEYS.length)];
const img = A.obs(key);
if (!img) return;
const scale = 0.6 + Math.random()*0.5;
const w = img.width*scale, h = img.height*scale;
obstacles.push({
key, img,
x: canvas.width/devicePixelRatio + 40,
y: state.groundY() - h + (key.includes("hole") ? 30 : 0),
w, h, passed:false
});
}
function spawnPickup() {
if (PICKUP_KEYS.length === 0) return;
const key = PICKUP_KEYS[Math.floor(Math.random()*PICKUP_KEYS.length)];
const img = A.col(key);
if (!img) return;
const scale = 0.9;
const w = img.width*scale, h = img.height*scale;
const baseY = state.groundY() - h - (Math.random()<0.5 ? 80 : 0);
pickups.push({ key, img, x: canvas.width/devicePixelRatio + 40, y: baseY, w, h });
}

let spawnTimerObs = 0;
let spawnTimerPick = 0;

function updateEntities(dt) {
const dx = state.speed;

// spawn
spawnTimerObs -= dt;
spawnTimerPick -= dt;
if (spawnTimerObs <= 0) { spawnObstacle(); spawnTimerObs = 1200 + Math.random()*800; }
if (spawnTimerPick <= 0) { spawnPickup(); spawnTimerPick = 900 + Math.random()*900; }

// move & cull
for (const o of obstacles) o.x -= dx;
for (const p of pickups) p.x -= dx;
while (obstacles.length && obstacles[0].x + obstacles[0].w < -100) obstacles.shift();
while (pickups.length && pickups[0].x + pickups[0].w < -100) pickups.shift();

// scoring when passed
for (const o of obstacles) {
if (!o.passed && o.x + o.w < player.x) { state.score += 5; o.passed = true; }
}

// collisions
const pr = {x:player.x+20, y:player.y+15, w:player.w-40, h:player.h-25};

// pick coins
for (let i=pickups.length-1; i>=0; i--){
const it = pickups[i];
if (rectsOverlap(pr, it)) {
state.coins += 1;
state.score += 10;
pickups.splice(i,1);
}
}
// hit obstacle
for (const o of obstacles) {
if (rectsOverlap(pr, o)) {
// إذا اللاعب يهاجم (القناع) نعطيه “سحق” بسيط
if (player.action === "attack" && o.key !== "obstacle_hole") {
o.x -= 12; // knock
continue;
}
gameOver();
break;
}
}
}

function drawEntities() {
for (const o of obstacles) ctx.drawImage(o.img, o.x, o.y, o.w, o.h);
for (const p of pickups) ctx.drawImage(p.img, p.x, p.y, p.w, p.h);
}

function rectsOverlap(a,b){
return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// -------- Input --------
window.addEventListener("keydown", (e) => {
if (e.repeat) return;
if (e.key === "p" || e.key === "P") togglePause();
if (!state.running || state.gameOver) return;

if ((e.code === "Space" || e.key === " ") && player.onGround) {
player.vy = -18;
player.onGround = false;
setAction("jump");
} else if (e.key === "s" || e.key === "S") {
setAction("slide");
setTimeout(()=> setAction("run"), 400);
} else if (e.key === "k" || e.key === "K") {
setAction("attack");
setTimeout(()=> setAction("run"), 350);
}
});

// -------- Pause / GameOver overlays --------
const $score = document.getElementById("score");
const $coins = document.getElementById("coins");
const $overlay = document.getElementById("overlay");
const $overlayImg = document.getElementById("overlay-img");
const $restart = document.getElementById("btn-restart");
$restart.addEventListener("click", resetGame);

function togglePause(){
if (state.gameOver) return;
state.running = !state.running;
$overlay.classList.toggle("hidden", state.running);
$restart.classList.add("hidden");
$overlayImg.src = A.ui("ui_paused")?.src ?? "";
}

function gameOver(){
state.gameOver = true;
state.running = false;
$overlay.classList.remove("hidden");
$restart.classList.remove("hidden");
// حاول نعرض صورة “game over” بالنص
$overlayImg.src = (A.ui("ui_game_over_monkey") || A.ui("ui_game_over_text") || A.ui("ui_scoreboard"))?.src ?? "";
}

function resetGame(){
state.running = true;
state.gameOver = false;
state.score = 0; state.coins = 0;
obstacles.length = 0; pickups.length = 0;
bgX = 0;
setAction("run");
player.x = 120; player.y = state.groundY() - player.h; player.vy = 0; player.onGround = true;
$overlay.classList.add("hidden");
}

// -------- Main loop --------
let last = 0;
function loop(ts){
const dt = Math.min(50, ts - last || 16);
last = ts;
ctx.clearRect(0,0, canvas.width, canvas.height);

drawBackground(dt);
if (state.running){
updatePlayer(dt);
updateEntities(dt);
state.score += 0.05 * (dt); // passive score
}
drawEntities();
drawPlayer();

// HUD
$score.textContent = Math.floor(state.score);
$coins.textContent = state.coins;

requestAnimationFrame(loop);
}

// -------- Boot --------
(async function boot(){
try{
await loadManifest();
await loadImagesFromManifest();
// ضع اللاعب على الأرض من البداية
player.y = state.groundY() - player.h;
// لو عندك شاشة “main menu” في manifest حاب تبدأ بها، ممكن تعرضها هنا
requestAnimationFrame(loop);
}catch(err){
console.error("Failed to boot:", err);
alert("Failed to load assets. Check manifest paths in assets/manifest.json");
}
})();
