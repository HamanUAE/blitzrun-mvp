// TODO: ضع روابطك هنا
const LINKS = {
  X:       "https://x.com/lazyapereboot?s=21",
  TG:      "https://t.me/lazyaperreboot",
  NOTION:  "https://www.notion.so/LazyApe-Reboot-Official-Project-Page-247c600c319c80c4a18bf4460cea5f23?source=copy_link",
  AIRDROP: "https://docs.google.com/forms/d/1PbTHXkMTFTQSzOj4ch9owbMOVbqd_bvXfD5GeNeuwFI/viewform?edit_requested=true"
};

// أزرار
document.getElementById('btnX')?.addEventListener('click', () => window.open(LINKS.X, '_blank'));
document.getElementById('btnTG')?.addEventListener('click', () => window.open(LINKS.TG, '_blank'));
document.getElementById('btnNotion')?.addEventListener('click', () => window.open(LINKS.NOTION, '_blank'));
document.getElementById('btnAirdrop')?.addEventListener('click', () => window.open(LINKS.AIRDROP, '_blank'));

// زر Play (حالياً معاينة فقط)
document.getElementById('btnPlay')?.addEventListener('click', () => {
  alert('Game preview will load here. (We will integrate the canvas + sounds next.)');
});
// ---------------------------
// BlitzRun Mini: Track Only v0.2
// ---------------------------
(() => {
  const cv = document.getElementById('gameCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;

  // إعدادات المسار
  const horizonY = Math.round(H * 0.42);       // خط الأفق
  const roadTop = Math.round(W * 0.16);        // عرض الطريق عند الأفق
  const roadBottom = Math.round(W * 0.82);     // عرض الطريق عند أسفل الشاشة
  const centerX = Math.round(W / 2);

  // تحكم بالأنيميشن
  let running = true;
  let t = 0;                  // زمن للتمرير
  let speed = 2.2;            // السرعة الابتدائية (سيكبر لاحقًا)
  let speedMax = 9;           // حد أقصى للسرعة
  let accel = 0.002;          // تسارع بسيط مع الوقت

  // أدوات رسم
  function trapezoidPath(yTop, wTop, yBot, wBot) {
    ctx.beginPath();
    ctx.moveTo(centerX - wTop / 2, yTop);
    ctx.lineTo(centerX + wTop / 2, yTop);
    ctx.lineTo(centerX + wBot / 2, yBot);
    ctx.lineTo(centerX - wBot / 2, yBot);
    ctx.closePath();
  }

  function drawBackground() {
    // سماء
    const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
    sky.addColorStop(0, '#0f4239');
    sky.addColorStop(1, '#16584d');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, horizonY);

    // غابة بعيدة (كتل خضراء بسيطة الآن — لاحقًا نستبدلها ببارالاكس صور)
    const jungle = ctx.createLinearGradient(0, horizonY, 0, H);
    jungle.addColorStop(0, '#0e3a32');
    jungle.addColorStop(1, '#0a2923');
    ctx.fillStyle = jungle;
    ctx.fillRect(0, horizonY, W, H - horizonY);
  }

  function drawGrassAndRoad() {
    // عشب جانبي
    const leftTopX  = centerX - roadTop / 2;
    const rightTopX = centerX + roadTop / 2;
    const leftBotX  = centerX - roadBottom / 2;
    const rightBotX = centerX + roadBottom / 2;

    // عشب يسار
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(leftTopX, horizonY);
    ctx.lineTo(leftBotX, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = '#0e5c32';
    ctx.fill();
    // عشب يمين
    ctx.beginPath();
    ctx.moveTo(W, horizonY);
    ctx.lineTo(rightTopX, horizonY);
    ctx.lineTo(rightBotX, H);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = '#0e5c32';
    ctx.fill();

    // الطريق (تدرّج ترابي)
    const roadGrad = ctx.createLinearGradient(0, horizonY, 0, H);
    roadGrad.addColorStop(0, '#c18f52');
    roadGrad.addColorStop(1, '#9a6b3d');
    ctx.fillStyle = roadGrad;
    trapezoidPath(horizonY, roadTop, H, roadBottom);
    ctx.fill();

    // حواف الطريق (حد أبيض بسيط)
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    trapezoidPath(horizonY, roadTop, H, roadBottom);
    ctx.stroke();
  }

  function drawLaneStripes() {
    // خطوط متقطعة 3 مسارات بمنظور بسيط
    const lanes = 3;
    for (let i = 1; i < lanes; i++) {
      const k = (i / lanes) - 0.5; // -0.5 .. 0.5
      // نقاط الخط بين أعلى الطريق وأسفله حسب النسبة
      const xTop = centerX + k * roadTop;
      const xBot = centerX + k * roadBottom;

      // نحول y طولياً إلى شرطات تتحرك مع t
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 12]);
      ctx.lineDashOffset = -t * 0.8; // يتحرك مع الزمن

      ctx.beginPath();
      ctx.moveTo(xTop, horizonY);
      ctx.lineTo(xBot, H);
      ctx.stroke();

      ctx.setLineDash([]);
    }

    // خط وسط متقطع/غامق
    ctx.strokeStyle = 'rgba(255,230,100,0.9)';
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 14]);
    ctx.lineDashOffset = -t * 1.4;
    ctx.beginPath();
    ctx.moveTo(centerX, horizonY);
    ctx.lineTo(centerX, H);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function loop() {
    if (running) {
      t += speed;
      speed = Math.min(speed + accel, speedMax);
    }

    // رسم
    drawBackground();
    drawGrassAndRoad();
    drawLaneStripes();

    requestAnimationFrame(loop);
  }
  loop();

  // أزرار البدء/إيقاف والمعاينة (اختياري)
  const btnRun = document.getElementById('g-run');
  const btnJump = document.getElementById('g-jump');
  btnRun?.addEventListener('click', () => {
    running = !running;
    btnRun.textContent = running ? 'Pause' : 'Run +10';
  });
  btnJump?.addEventListener('click', () => {
    // كبسة مؤقتة لزيادة السرعة (بنشوفها بوضوح)
    speed = Math.min(speed + 1.5, speedMax);
  });

  // مفاتيح تحكم (لاحقًا للتمرير الجانبي والقفز)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') speed = Math.min(speed + 1.5, speedMax);
    if (e.code === 'KeyP') running = !running;
  });
})();
