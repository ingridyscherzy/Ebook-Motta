/* =================== CONFIG =================== */
const PDF_URL = './ebook.pdf';
const RENDER_SCALE_BASE = 1.5;
const MAX_PAGES = 500;

/* =================== DOM =================== */
const flipbookEl   = document.getElementById('flipbook');
const stageEl      = document.getElementById('stage');
const coverHintEl  = document.getElementById('coverHint');
const errorBanner  = document.getElementById('errorBanner');

const prevBtn      = document.getElementById('prev');
const nextBtn      = document.getElementById('next');
const zoomInBtn    = document.getElementById('zoomIn');
const zoomOutBtn   = document.getElementById('zoomOut');
const pageLabel    = document.getElementById('pageLabel');
const zoomLabel    = document.getElementById('zoomLabel');
const fullscreenBtn= document.getElementById('fullscreen');

/* =================== STATE =================== */
let pdfDoc = null;
let pageFlip = null;
let pageWidth = 0, pageHeight = 0;
let currentZoom = 1;
const minZoom = 0.4, maxZoom = 2.0;
let phase = 'cover'; // 'cover' | 'book'

/* PDF.js worker local (deve existir ./pdf.worker.min.js na raiz) */
if (window['pdfjsLib']) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.js';
}

/* =================== HELPERS =================== */
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

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

function updateZoomInfo(){ zoomLabel.textContent = `${Math.round(currentZoom*100)}%`; }

function fitToViewport() {
    const rect  = stageEl.getBoundingClientRect();
    const availW = rect.width  - 16;  // padding 8px de cada lado
    const availH = rect.height - 16;

    const single = (phase === 'cover') || isMobile(); // capa e mobile = 1 página; desktop = dupla
    const visibleW = single ? pageWidth : pageWidth * 2;
    const visibleH = pageHeight;

    const scaleW = availW / visibleW;
    const scaleH = availH / visibleH;
    const scale  = Math.min(scaleW, scaleH) * 0.92;  // ~8% de folga
    currentZoom  = clamp(scale, minZoom, 1.0);

    flipbookEl.style.transform = `scale(${currentZoom})`;
    flipbookEl.style.transformOrigin = 'center center';
    updateZoomInfo();
}

function debounce(fn, ms=120){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
const debounceFit = debounce(fitToViewport, 80);

/* =================== FASE 1: CAPA SINGLE =================== */
async function showCover(){
    phase = 'cover';
    flipbookEl.innerHTML = '';
    const { page, canvas } = createPageElement();
    flipbookEl.appendChild(page);

    const dims = await renderPdfPage(pdfDoc, 1, canvas, RENDER_SCALE_BASE);
    pageWidth = dims.width; pageHeight = dims.height;

    coverHintEl.classList.remove('hide');
    fitToViewport();
    updatePageLabel();
}

/* =================== FASE 2: LIVRO (PageFlip) =================== */
async function startBook(){
    if (phase !== 'cover') return;
    phase = 'book';
    coverHintEl.classList.add('hide');

    // Renderizar todas as páginas em divs DETACHED (não anexar ao DOM manualmente)
    const total = Math.min(pdfDoc.numPages, MAX_PAGES);
    const pages = [];
    pageWidth = 0; pageHeight = 0;

    for (let i = 1; i <= total; i++){
        const { page, canvas } = createPageElement();
        const dims = await renderPdfPage(pdfDoc, i, canvas, RENDER_SCALE_BASE);
        pageWidth = Math.max(pageWidth, dims.width);
        pageHeight = Math.max(pageHeight, dims.height);
        pages.push(page);
    }

    flipbookEl.innerHTML = '';

    // Inicializa PageFlip
    pageFlip = new St.PageFlip(flipbookEl, {
        width: pageWidth,
        height: pageHeight,
        size: 'fixed',
        minWidth: 200, maxWidth: 3000,
        minHeight: 300, maxHeight: 3000,
        showCover: false,            // capa já foi exibida na fase 1
        usePortrait: isMobile(),     // mobile: 1 página; desktop: dupla
                               mobileScrollSupport: true,
                               drawShadow: true,
                               flippingTime: 600,
                               swipeDistance: 30,
                               maxShadowOpacity: 0.2,
                               autoSize: false
    });

    // MUITO IMPORTANTE: carregar via API (PageFlip controla a visibilidade)
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

/* =================== CONTROLES =================== */
prevBtn.addEventListener('click', ()=>{ if (phase === 'book') pageFlip.flipPrev(); });
nextBtn.addEventListener('click', ()=>{ if (phase === 'cover') startBook(); else pageFlip.flipNext(); });

zoomInBtn.addEventListener('click', ()=>{
    currentZoom = clamp(currentZoom + 0.1, minZoom, maxZoom);
    flipbookEl.style.transform = `scale(${currentZoom})`; updateZoomInfo();
});
zoomOutBtn.addEventListener('click', ()=>{
    currentZoom = clamp(currentZoom - 0.1, minZoom, maxZoom);
    flipbookEl.style.transform = `scale(${currentZoom})`; updateZoomInfo();
});

document.addEventListener('keydown', (e)=>{
    if (e.key === 'ArrowLeft' ) { if (phase==='book')  pageFlip.flipPrev(); }
    if (e.key === 'ArrowRight') { if (phase==='cover') startBook(); else pageFlip.flipNext(); }
});

fullscreenBtn?.addEventListener('click', ()=>{
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.(); else document.exitFullscreen?.();
});

flipbookEl.addEventListener('click', ()=>{ if (phase === 'cover') startBook(); });

/* =================== RESIZE/HANDLERS =================== */
window.addEventListener('resize', debounceFit);
if (window.visualViewport) window.visualViewport.addEventListener('resize', debounceFit);
new ResizeObserver(debounceFit).observe(stageEl);

const mq = window.matchMedia('(max-width: 768px)');
const onMQ = ()=> debounceFit();
if (mq.addEventListener) mq.addEventListener('change', onMQ); else mq.addListener(onMQ);

/* =================== BOOT =================== */
/* Tenta abrir o PDF direto; se falhar, tenta via fetch/ArrayBuffer (cobre casos de MIME/CDN) */
async function tryOpenPdf(url) {
    try { return await pdfjsLib.getDocument(url).promise; }
    catch (e1) {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const buf = await res.arrayBuffer();
        return await pdfjsLib.getDocument({ data: buf }).promise;
    }
}

(async function init(){
    try{
        errorBanner.hidden = true;
        pdfDoc = await tryOpenPdf(PDF_URL);
        await showCover();  // capa single, centralizada
    }catch(err){
        console.error(err);
        errorBanner.hidden = false;
    }
})();
