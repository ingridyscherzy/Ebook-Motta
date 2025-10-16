
// ======= Config =======
const PDF_URL = './ebook.pdf';
const RENDER_SCALE_BASE = 1.5;
const MAX_PAGES = 500;

// ======= DOM refs =======
const flipbookEl = document.getElementById('flipbook');
const stageEl = document.getElementById('stage');
const coverHintEl = document.getElementById('coverHint');

const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const pageLabel = document.getElementById('pageLabel');
const zoomLabel = document.getElementById('zoomLabel');
const fullscreenBtn = document.getElementById('fullscreen');

// ======= State =======
let pdfDoc = null;
let pageFlip = null;
let pageWidth = 0, pageHeight = 0;
let currentZoom = 1;
const minZoom = 0.4, maxZoom = 2.0;
let phase = 'cover'; // 'cover' | 'book'

// ======= PDF.js worker local =======
if (window['pdfjsLib']) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.js';
}

// ======= Helpers =======
function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }

function isMobile() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function createPageElement() {
  const page = document.createElement('div');
  page.className = 'page';
  const canvas = document.createElement('canvas');
  page.appendChild(canvas);
  return { page, canvas };
}

async function renderPdfPage(pdf, pageNumber, canvas, scaleFactor = RENDER_SCALE_BASE) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: scaleFactor });
  const ctx = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: ctx, viewport }).promise;
  return { width: viewport.width, height: viewport.height };
}

function updateZoomInfo() {
  zoomLabel.textContent = `${Math.round(currentZoom * 100)}%`;
}

function fitToViewport() {
  const rect = stageEl.getBoundingClientRect();
  const availW = rect.width - 16;   // padding 8px de cada lado
  const availH = rect.height - 16;

  const single = (phase === 'cover') || isMobile();
  const visibleW = single ? pageWidth : pageWidth * 2;
  const visibleH = pageHeight;

  const scaleW = availW / visibleW;
  const scaleH = availH / visibleH;
  const scale = Math.min(scaleW, scaleH) * 0.92;
  currentZoom = clamp(scale, minZoom, 1.0);

  flipbookEl.style.transform = `scale(${currentZoom})`;
  flipbookEl.style.transformOrigin = 'center center';
  updateZoomInfo();
}

function debounce(fn, ms=120){
  let t; return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), ms); };
}
const debounceFit = debounce(fitToViewport, 80);

// ======= Phase 1: render only cover (single) =======
async function showCover() {
  phase = 'cover';
  flipbookEl.innerHTML = '';
  const { page, canvas } = createPageElement();
  flipbookEl.appendChild(page);
  const dims = await renderPdfPage(pdfDoc, 1, canvas, RENDER_SCALE_BASE);
  pageWidth = dims.width; pageHeight = dims.height;
  fitToViewport();
  coverHintEl.classList.remove('hide');
}

// ======= Phase 2: init PageFlip (book) =======
async function startBook() {
  if (phase !== 'cover') return;
  phase = 'book';
  coverHintEl.classList.add('hide');
  // Prepare all pages into detached divs
  const total = Math.min(pdfDoc.numPages, MAX_PAGES);
  const pages = [];
  pageWidth = 0; pageHeight = 0;

  for (let i=1; i<=total; i++){
    const { page, canvas } = createPageElement();
    const dims = await renderPdfPage(pdfDoc, i, canvas, RENDER_SCALE_BASE);
    pageWidth = Math.max(pageWidth, dims.width);
    pageHeight = Math.max(pageHeight, dims.height);
    pages.push(page);
  }

  flipbookEl.innerHTML = '';

  // Init PageFlip
  pageFlip = new St.PageFlip(flipbookEl, {
    width: pageWidth,
    height: pageHeight,
    size: 'fixed',
    minWidth: 200,
    maxWidth: 3000,
    minHeight: 300,
    maxHeight: 3000,
    showCover: false,          // capa já foi exibida na fase 1
    usePortrait: isMobile(),   // mobile: single; desktop: dupla
    mobileScrollSupport: true,
    drawShadow: true,
    flippingTime: 600,
    swipeDistance: 30,
    maxShadowOpacity: 0.2,
    autoSize: false
  });

  pageFlip.loadFromHTML(pages);

  pageFlip.on('init', ()=>{
    fitToViewport();
    updatePageLabel();
  });
  pageFlip.on('flip', ()=>{
    updatePageLabel();
    fitToViewport();
  });
  pageFlip.on('changeState', fitToViewport);

  fitToViewport();
}

function updatePageLabel(){
  if (phase === 'cover'){
    pageLabel.textContent = `Página 1 de ${pdfDoc ? pdfDoc.numPages : '?'}`;
    return;
  }
  const idx = pageFlip.getCurrentPageIndex() + 1;
  const total = pageFlip.getPageCount();
  pageLabel.textContent = `${idx} / ${total}`;
}

// ======= Controls =======
prevBtn.addEventListener('click', ()=>{
  if (phase === 'cover') return;
  pageFlip.flipPrev();
});
nextBtn.addEventListener('click', ()=>{
  if (phase === 'cover') { startBook(); return; }
  pageFlip.flipNext();
});
zoomInBtn.addEventListener('click', ()=>{
  currentZoom = clamp(currentZoom + 0.1, minZoom, maxZoom);
  flipbookEl.style.transform = `scale(${currentZoom})`;
  updateZoomInfo();
});
zoomOutBtn.addEventListener('click', ()=>{
  currentZoom = clamp(currentZoom - 0.1, minZoom, maxZoom);
  flipbookEl.style.transform = `scale(${currentZoom})`;
  updateZoomInfo();
});
document.addEventListener('keydown', (e)=>{
  if (e.key === 'ArrowLeft') (phase==='cover')? null : pageFlip.flipPrev();
  if (e.key === 'ArrowRight') (phase==='cover')? startBook() : pageFlip.flipNext();
});

// Fullscreen (best-effort)
fullscreenBtn?.addEventListener('click', ()=>{
  const el = document.documentElement;
  if (!document.fullscreenElement) el.requestFullscreen?.();
  else document.exitFullscreen?.();
});

// Start interactions
flipbookEl.addEventListener('click', ()=>{
  if (phase === 'cover') startBook();
});

// Resize handling
window.addEventListener('resize', debounceFit);
if (window.visualViewport) window.visualViewport.addEventListener('resize', debounceFit);
const ro = new ResizeObserver(debounceFit);
ro.observe(stageEl);

// ======= Boot =======
(async function init(){
  pdfDoc = await pdfjsLib.getDocument(PDF_URL).promise;
  await showCover();
  updatePageLabel();

  // Refit when breakpoint changes (mobile ↔ desktop)
  const mq = window.matchMedia('(max-width: 768px)');
  const onMQ = ()=> debounceFit();
  if (mq.addEventListener) mq.addEventListener('change', onMQ);
  else mq.addListener(onMQ);
})();
