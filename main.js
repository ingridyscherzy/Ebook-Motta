class TwoPhaseEBookViewer {
    constructor() {
        this.pdf = null;
        this.pageFlip = null;
        this.currentZoom = 1;
        this.maxZoom = 2.0;
        this.minZoom = 0.4;
        this.zoomStep = 0.1;
        this.renderScale = 2;
        this.pages = [];
        this.pageWidth = 400;
        this.pageHeight = 600;
        this.pdfUrl = './ebook.pdf';

        // Elementos DOM
        this.stage = null;
        this.flipbook = null;
        this.coverCTA = null;

        // Estados
        this.currentPhase = 'loading'; // 'loading' | 'cover-stage' | 'book-stage'
        this.bookStageStarted = false;

        // Observadores
        this.resizeObserver = null;
        this.debounceTimer = null;
        this.visualViewportSupported = false;

        this.initializeApp();
    }

    async initializeApp() {
        console.log('🚀 INICIALIZANDO EBOOK VIEWER - 2 FASES');

        try {
            // Configurar elementos DOM
            this.stage = document.querySelector('.stage');
            this.flipbook = document.getElementById('flipbook');
            this.coverCTA = document.getElementById('coverCallToAction');

            // Verificar suporte ao visualViewport
            this.visualViewportSupported = window.visualViewport !== undefined;

            // Verificar dependências
            this.checkDependencies();

            // Configurar PDF.js
            this.setupPDFJS();

            // Carregar PDF e iniciar FASE 1
            await this.loadPDFAndStartCoverStage();

        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            this.showError(error.message);
        }
    }

    checkDependencies() {
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js não foi carregado. Verifique sua conexão com a internet.');
        }

        if (typeof St === 'undefined' || typeof St.PageFlip === 'undefined') {
            throw new Error('PageFlip não foi carregado. Verifique sua conexão com a internet.');
        }

        console.log('✅ Dependências carregadas com sucesso');
    }

    setupPDFJS() {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        console.log('✅ PDF.js configurado');
    }

    async loadPDFAndStartCoverStage() {
        this.showLoading();
        console.log('📖 FASE 1: Carregando PDF para cover stage...');

        try {
            // Verificar se é arquivo local
            if (this.isLocalFile()) {
                throw new Error('CORS_LOCAL');
            }

            // Carregar PDF
            const loadingTask = pdfjsLib.getDocument({
                url: this.pdfUrl,
                verbosity: 0
            });

            // Progress listener
            loadingTask.onProgress = (progress) => {
                if (progress.total > 0) {
                    const percent = Math.round((progress.loaded / progress.total) * 100);
                    this.updateProgress(percent);
                }
            };

            this.pdf = await loadingTask.promise;
            console.log(`✅ PDF carregado: ${this.pdf.numPages} páginas`);

            // Iniciar FASE 1: Cover Stage
            await this.startCoverStage();

        } catch (error) {
            console.warn('⚠️ Carregamento automático falhou:', error.message);

            if (error.message === 'CORS_LOCAL' || error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
                this.showCORSError();
            } else {
                this.showError(`Erro ao carregar PDF: ${error.message}`);
            }
        }
    }

    async loadPDFFromFile(file) {
        this.showLoading();
        console.log('📁 Carregando arquivo selecionado:', file.name);

        try {
            if (file.type !== 'application/pdf') {
                throw new Error('Por favor, selecione um arquivo PDF válido.');
            }

            const arrayBuffer = await file.arrayBuffer();

            const loadingTask = pdfjsLib.getDocument({
                data: arrayBuffer,
                verbosity: 0
            });

            this.pdf = await loadingTask.promise;
            console.log(`✅ Arquivo carregado: ${this.pdf.numPages} páginas`);

            // Iniciar FASE 1: Cover Stage
            await this.startCoverStage();

        } catch (error) {
            console.error('❌ Erro ao carregar arquivo:', error);
            this.showError(`Erro ao carregar arquivo: ${error.message}`);
        }
    }

    // ===== FASE 1: COVER STAGE =====
    async startCoverStage() {
        console.log('📖 INICIANDO FASE 1: COVER STAGE');
        this.currentPhase = 'cover-stage';

        try {
            // Renderizar APENAS a página 1 (capa)
            const page1 = await this.pdf.getPage(1);
            const coverCanvas = await this.renderPageToCanvas(page1);

            // Definir dimensões base a partir da capa
            this.pageWidth = coverCanvas.width / this.renderScale;
            this.pageHeight = coverCanvas.height / this.renderScale;

            // Criar DOM da capa: 1 div.page com 1 canvas
            this.createCoverDOM(coverCanvas);

            // Configurar CSS para fase de capa
            this.flipbook.className = 'cover-stage';

            // Configurar listeners para transição para Fase 2
            this.setupCoverStageListeners();

            // Configurar resize handling
            this.setupResizeHandling();

            // Fit inicial
            this.fitToViewport();

            // Mostrar call-to-action
            this.showCoverCTA();

            this.hideLoading();

            console.log(`✅ FASE 1 COMPLETA: Capa (${this.pageWidth}x${this.pageHeight}) exibida`);

        } catch (error) {
            console.error('❌ Erro na FASE 1:', error);
            this.showError(`Erro ao exibir capa: ${error.message}`);
        }
    }

    async renderPageToCanvas(page) {
        const viewport = page.getViewport({ scale: this.renderScale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        await page.render(renderContext).promise;
        return canvas;
    }

    createCoverDOM(coverCanvas) {
        // Limpar flipbook
        this.flipbook.innerHTML = '';

        // Criar div.page única
        const pageDiv = document.createElement('div');
        pageDiv.className = 'page';
        pageDiv.setAttribute('data-page-index', '0');

        // Criar canvas exibido com tamanho correto
        const displayCanvas = document.createElement('canvas');
        displayCanvas.width = coverCanvas.width;
        displayCanvas.height = coverCanvas.height;
        displayCanvas.style.width = `${this.pageWidth}px`;
        displayCanvas.style.height = `${this.pageHeight}px`;
        displayCanvas.style.maxWidth = '100%';
        displayCanvas.style.maxHeight = '100%';
        displayCanvas.style.objectFit = 'contain';

        const ctx = displayCanvas.getContext('2d');
        ctx.drawImage(coverCanvas, 0, 0);

        pageDiv.appendChild(displayCanvas);
        this.flipbook.appendChild(pageDiv);

        console.log(`📄 CAPA DOM CRIADA: 1 div.page + 1 canvas (${coverCanvas.width}x${coverCanvas.height})`);
    }

    setupCoverStageListeners() {
        // Eventos para iniciar Fase 2
        const startBookStage = () => {
            if (!this.bookStageStarted) {
                this.bookStageStarted = true;
                this.startBookStage();
            }
        };

        // Click/Touch em qualquer lugar do flipbook
        this.flipbook.addEventListener('click', startBookStage);
        this.flipbook.addEventListener('touchstart', startBookStage);

        // Teclas
        document.addEventListener('keydown', (e) => {
            if (this.currentPhase === 'cover-stage') {
                if (['ArrowRight', 'ArrowLeft', ' ', 'Enter'].includes(e.key)) {
                    e.preventDefault();
                    startBookStage();
                }
            }
        });

        console.log('✅ Listeners da FASE 1 configurados');
    }

    showCoverCTA() {
        if (this.coverCTA) {
            this.coverCTA.classList.remove('hidden');
            console.log('💬 Call-to-action exibido');
        }
    }

    hideCoverCTA() {
        if (this.coverCTA) {
            this.coverCTA.classList.add('hidden');
            console.log('💬 Call-to-action escondido');
        }
    }

    // ===== FASE 2: BOOK STAGE =====
    async startBookStage() {
        console.log('📚 INICIANDO FASE 2: BOOK STAGE');
        this.currentPhase = 'book-stage';

        try {
            // Esconder CTA
            this.hideCoverCTA();

            // Mostrar loading breve
            this.showLoading();

            // Renderizar TODAS as páginas do PDF
            await this.renderAllPages();

            // Limpar flipbook e inicializar PageFlip
            this.initializePageFlip();

            // Configurar controles
            this.setupBookStageControls();

            // Posicionar na primeira dupla útil (páginas 2-3)
            // Como showCover:false, a primeira dupla será automaticamente exibida
            setTimeout(() => {
                this.pageFlip.turnToPage(1); // Página 2 (índice 1)
                setTimeout(() => this.diagnosePageVisibility(), 200);
            }, 100);

            // Configurar CSS para book stage
            this.flipbook.className = 'book-stage';

            // Fit inicial
            this.fitToViewport();

            this.hideLoading();

            console.log('✅ FASE 2 COMPLETA: Modo livro inicializado');

        } catch (error) {
            console.error('❌ Erro na FASE 2:', error);
            this.showError(`Erro ao inicializar livro: ${error.message}`);
        }
    }

    async renderAllPages() {
        const numPages = this.pdf.numPages;
        this.pages = [];

        console.log(`🎨 Renderizando ${numPages} páginas para book stage...`);

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            try {
                const page = await this.pdf.getPage(pageNum);
                const canvas = await this.renderPageToCanvas(page);
                this.pages.push(canvas);

                // Atualizar progresso
                const progress = Math.round((pageNum / numPages) * 100);
                this.updateProgress(progress);

            } catch (error) {
                console.error(`❌ Erro na página ${pageNum}:`, error);
                this.pages.push(this.createErrorPage(pageNum));
            }
        }

        console.log(`✅ ${this.pages.length} páginas renderizadas para book stage`);
    }

    createErrorPage(pageNum) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = this.pageWidth * this.renderScale;
        canvas.height = this.pageHeight * this.renderScale;

        // Fundo branco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Texto de erro
        ctx.fillStyle = '#333333';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Erro ao carregar', canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText(`página ${pageNum}`, canvas.width / 2, canvas.height / 2 + 10);

        return canvas;
    }

    initializePageFlip() {
        // Limpar flipbook completamente
        this.flipbook.innerHTML = '';

        // Configurar PageFlip SEM showCover (capa já foi exibida na Fase 1)
        this.pageFlip = new St.PageFlip(this.flipbook, {
            width: this.pageWidth,
            height: this.pageHeight,
            size: 'fixed',
            minWidth: 200,
            maxWidth: 2000,
            minHeight: 300,
            maxHeight: 2000,
            showCover: false,  // SEM CAPA - já foi exibida na Fase 1
            mobileScrollSupport: true,
            clickEventForward: true,
            usePortrait: true,
            startPage: 0,
            drawShadow: true,
            flippingTime: 600,
            useMouseEvents: true,
            swipeDistance: 30,
            showPageCorners: true,
            disableFlipByClick: false,
            maxShadowOpacity: 0.2
        });

        // CRÍTICO: Criar elementos das páginas SEM anexar ao DOM
        // O PageFlip vai gerenciar a exibição interna
        const pageDivs = this.pages.map((canvas, index) => {
            return this.createPageElement(canvas, index);
        });

        // Carregar páginas no PageFlip - ele vai controlar a exibição
        this.pageFlip.loadFromHTML(pageDivs);

        console.log(`📄 PÁGINAS CARREGADAS NO PAGEFLIP: ${pageDivs.length}`);

        // Event listeners do flipbook
        this.pageFlip.on('flip', () => {
            this.updatePageInfo();
            this.debounceRefit();
            console.log(`📖 PÁGINA VIRADA - Atual: ${this.pageFlip.getCurrentPageIndex()}`);
            setTimeout(() => this.diagnosePageVisibility(), 100);
        });

        this.pageFlip.on('changeState', () => {
            this.debounceRefit();
        });

        this.pageFlip.on('changeOrientation', () => {
            this.debounceRefit();
        });

        this.pageFlip.on('init', () => {
            this.debounceRefit();
            this.diagnosePageVisibility();
        });

        this.updatePageInfo();
        console.log('📚 PageFlip inicializado - apenas páginas ativas visíveis');
    }

    createPageElement(canvas, pageIndex) {
        const pageDiv = document.createElement('div');
        pageDiv.className = 'page';
        pageDiv.setAttribute('data-page-index', pageIndex);

        // Criar canvas exibido
        const displayCanvas = document.createElement('canvas');
        displayCanvas.width = canvas.width;
        displayCanvas.height = canvas.height;
        displayCanvas.style.width = `${this.pageWidth}px`;
        displayCanvas.style.height = `${this.pageHeight}px`;
        displayCanvas.style.maxWidth = '100%';
        displayCanvas.style.maxHeight = '100%';
        displayCanvas.style.objectFit = 'contain';

        const ctx = displayCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0);

        pageDiv.appendChild(displayCanvas);

        return pageDiv;
    }

    // ===== FIT TO VIEWPORT =====
    fitToViewport() {
        if (!this.stage || !this.flipbook) return;

        // Obter dimensões REAIS da stage
        const stageRect = this.stage.getBoundingClientRect();
        const availW = stageRect.width - 16;  // 8px padding de cada lado
        const availH = stageRect.height - 16; // 8px padding de cada lado

        let visibleBookWidth, visibleBookHeight;

        if (this.currentPhase === 'cover-stage') {
            // FASE 1: Apenas a capa
            visibleBookWidth = this.pageWidth;
            visibleBookHeight = this.pageHeight;
        } else if (this.currentPhase === 'book-stage') {
            // FASE 2: Sempre spread duplo (sem capa)
            visibleBookWidth = this.pageWidth * 2;
            visibleBookHeight = this.pageHeight;
        } else {
            return; // Loading ou outro estado
        }

        // Calcular scale ideal
        const scaleW = availW / visibleBookWidth;
        const scaleH = availH / visibleBookHeight;
        const idealScale = Math.min(scaleW, scaleH);

        // Aplicar folga de ~8%
        const baseScale = idealScale * 0.92;

        // Clamp
        this.currentZoom = this.clamp(baseScale, this.minZoom, this.maxZoom);

        // Aplicar transform
        this.flipbook.style.transform = `scale(${this.currentZoom})`;
        this.flipbook.style.transformOrigin = 'center center';

        // Atualizar interface
        this.updateZoomInfo();

        // LOGS DE DIAGNÓSTICO
        console.log(`📐 FIT TO VIEWPORT - FASE ${this.currentPhase.toUpperCase()}`);
        console.log(`   stageRect: ${stageRect.width.toFixed(1)}x${stageRect.height.toFixed(1)}`);
        console.log(`   availableSpace: ${availW.toFixed(1)}x${availH.toFixed(1)}`);
        console.log(`   visibleBookSize: ${visibleBookWidth}x${visibleBookHeight}`);
        console.log(`   scaleW: ${scaleW.toFixed(3)}, scaleH: ${scaleH.toFixed(3)}`);
        console.log(`   appliedScale: ${this.currentZoom.toFixed(3)}`);
    }

    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    debounceRefit() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.fitToViewport();
        }, 150);
    }

    // ===== RESIZE HANDLING =====
    setupResizeHandling() {
        // ResizeObserver para a stage
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(() => {
                this.debounceRefit();
            });
            this.resizeObserver.observe(this.stage);
        }

        // Window resize
        window.addEventListener('resize', () => {
            this.debounceRefit();
        });

        // Visual Viewport API para iOS/Android
        if (this.visualViewportSupported) {
            window.visualViewport.addEventListener('resize', () => {
                this.debounceRefit();
            });
            console.log('✅ Visual Viewport API configurado');
        }

        // Orientation change
        const orientationQuery = window.matchMedia("(orientation: portrait)");
        orientationQuery.addEventListener('change', () => {
            setTimeout(() => {
                this.debounceRefit();
            }, 300);
        });

        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.debounceRefit();
            }, 300);
        });

        console.log('✅ Resize handlers configurados');
    }

    // ===== CONTROLES DO BOOK STAGE =====
    setupBookStageControls() {
        console.log('🎮 Configurando controles do book stage...');

        // Navegação
        document.getElementById('prevBtn').addEventListener('click', () => {
            if (this.pageFlip) this.pageFlip.flipPrev();
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            if (this.pageFlip) this.pageFlip.flipNext();
        });

        // Zoom
        document.getElementById('zoomInBtn').addEventListener('click', () => {
            this.zoomIn();
        });

        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            this.zoomOut();
        });

        // Download
        document.getElementById('downloadBtn').addEventListener('click', () => {
            this.downloadPDF();
        });

        // Fullscreen
        document.getElementById('fullscreenBtn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Seleção de arquivo
        const selectFileBtn = document.getElementById('selectFileBtn');
        const fileInput = document.getElementById('fileInput');
        const retryBtn = document.getElementById('retryBtn');

        if (selectFileBtn && fileInput) {
            selectFileBtn.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.loadPDFFromFile(e.target.files[0]);
                }
            });
        }

        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.initializeApp();
            });
        }

        // Atalhos de teclado (apenas no book stage)
        document.addEventListener('keydown', (e) => {
            if (this.currentPhase !== 'book-stage' || !this.pageFlip) return;

            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.pageFlip.flipPrev();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.pageFlip.flipNext();
                    break;
                case '=':
                case '+':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.zoomIn();
                    }
                    break;
                case '-':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.zoomOut();
                    }
                    break;
                case 'f':
                case 'F11':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
                case 'Escape':
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    }
                    break;
            }
        });

        console.log('✅ Controles do book stage configurados');
    }

    // ===== ZOOM CONTROLS =====
    zoomIn() {
        this.currentZoom = this.clamp(this.currentZoom + this.zoomStep, this.minZoom, this.maxZoom);
        this.applyZoom();
    }

    zoomOut() {
        this.currentZoom = this.clamp(this.currentZoom - this.zoomStep, this.minZoom, this.maxZoom);
        this.applyZoom();
    }

    applyZoom() {
        this.flipbook.style.transform = `scale(${this.currentZoom})`;
        this.flipbook.style.transformOrigin = 'center center';
        this.updateZoomInfo();
    }

    updateZoomInfo() {
        const zoomInfoEl = document.getElementById('zoomInfo');
        if (zoomInfoEl) {
            zoomInfoEl.textContent = `${Math.round(this.currentZoom * 100)}%`;
        }

        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');

        if (zoomInBtn) zoomInBtn.disabled = this.currentZoom >= this.maxZoom;
        if (zoomOutBtn) zoomOutBtn.disabled = this.currentZoom <= this.minZoom;
    }

    updatePageInfo() {
        if (!this.pageFlip || this.pages.length === 0) return;

        const currentPage = this.pageFlip.getCurrentPageIndex() + 1;
        const totalPages = this.pages.length;

        const pageInfoEl = document.getElementById('pageInfo');
        if (pageInfoEl) {
            pageInfoEl.textContent = `Página ${currentPage} de ${totalPages}`;
        }

        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        if (prevBtn) prevBtn.disabled = currentPage <= 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    }

    downloadPDF() {
        const link = document.createElement('a');
        link.href = this.pdfUrl;
        link.download = 'ebook.pdf';
        link.click();
    }

    toggleFullscreen() {
        const container = document.querySelector('.app-container');

        if (!document.fullscreenElement) {
            container.requestFullscreen().then(() => {
                container.classList.add('fullscreen');
                setTimeout(() => {
                    this.fitToViewport();
                }, 300);
            });
        } else {
            document.exitFullscreen().then(() => {
                container.classList.remove('fullscreen');
                setTimeout(() => {
                    this.fitToViewport();
                }, 300);
            });
        }
    }

    // ===== UI METHODS =====
    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('error').classList.add('hidden');
        document.getElementById('controls').style.display = 'none';
        this.updateProgress(0);
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('controls').style.display = 'flex';
    }

    showError(message) {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('error').classList.remove('hidden');
        document.getElementById('controls').style.display = 'none';
        document.getElementById('errorMessage').textContent = message;
    }

    showCORSError() {
        this.showError('Problema de CORS detectado');
        const errorContent = document.querySelector('.error-solution');
        if (errorContent) {
            errorContent.style.display = 'block';
        }
    }

    updateProgress(percent) {
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }

        const loadingText = document.querySelector('.loading p');
        if (loadingText) {
            loadingText.textContent = `Carregando eBook... ${percent}%`;
        }
    }

    isLocalFile() {
        return window.location.protocol === 'file:';
    }

    // ===== DIAGNÓSTICO =====
    diagnosePageVisibility() {
        const visiblePages = this.flipbook.querySelectorAll('.page');
        const visibleCanvases = this.flipbook.querySelectorAll('canvas');

        console.log(`🔍 DIAGNÓSTICO DOM PAGEFLIP:`);
        console.log(`   Páginas visíveis no DOM: ${visiblePages.length}`);
        console.log(`   Canvas visíveis no DOM: ${visibleCanvases.length}`);
        console.log(`   Páginas renderizadas total: ${this.pages.length}`);

        // Verificar quais páginas estão realmente visíveis
        visiblePages.forEach((page, index) => {
            const rect = page.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0;
            console.log(`   Página ${index}: ${isVisible ? 'VISÍVEL' : 'OCULTA'} (${rect.width}x${rect.height})`);
        });
    }

    // ===== CLEANUP =====
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 INICIANDO TWO-PHASE EBOOK VIEWER...');
    new TwoPhaseEBookViewer();
});

// Prevenir zoom do navegador
document.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && (e.key === '=' || e.key === '+' || e.key === '-')) {
        e.preventDefault();
    }
});