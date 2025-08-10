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
