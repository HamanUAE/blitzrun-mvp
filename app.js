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
