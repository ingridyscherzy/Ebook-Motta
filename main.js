class EBookViewer {
    constructor() {
        this.pdf = null;
        this.pageFlip = null;
        this.currentZoom = 1;
        this.maxZoom = 2.0;
        this.minZoom = 0.4;
        this.zoomStep = 0.1;
        this.renderScale = 2;
        this.pages = [];
        this.isLoading = false;
        this.pdfUrl = './ebook.pdf';
        this.pageWidth = 400;
        this.pageHeight = 600;
        this.stage = null;
        this.resizeObserver = null;
        this.debounceTimer = null;
        this.readingHint = null;
        this.hintTimer = null;
        this.hasInteracted = false;
        this.visualViewportSupported = false;

        this.initializeApp();
    }

    async initializeApp() {
        console.log('🚀 Inicializando eBook Viewer...');

        try {
            // Configurar stage e mensagem
            this.stage = document.querySelector('.stage');
            this.readingHint = document.getElementById('readingHint');

            // Verificar suporte ao visualViewport
            this.visualViewportSupported = window.visualViewport !== undefined;

            // Verificar dependências
            this.checkDependencies();

            // Configurar PDF.js
            this.setupPDFJS();

            // Tentar carregar PDF automaticamente
            await this.loadPDF();

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

    async loadPDF() {
        this.showLoading();
        console.log('📖 Tentando carregar PDF...');

        try {
            // Método 1: Tentar input do usuário primeiro (para compatibilidade local)
            if (this.isLocalFile()) {
                throw new Error('CORS_LOCAL');
            }

            // Método 2: Tentar carregamento direto (funciona com servidor HTTP)
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

            await this.processPDF();

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

            await this.processPDF();

        } catch (error) {
            console.error('❌ Erro ao carregar arquivo:', error);
            this.showError(`Erro ao carregar arquivo: ${error.message}`);
        }
    }

    async processPDF() {
        try {
            await this.renderAllPages();
            this.initializeFlipbook();
            this.setupEventListeners();
            this.setupResizeHandling();
            this.hideLoading();

            // Aguardar renderização e aplicar fit
            setTimeout(() => {
                this.fitToViewport();
                this.showReadingHint();  // Mostrar mensagem de instrução
            }, 100);

            console.log('🎉 eBook carregado com sucesso!');

        } catch (error) {
            console.error('❌ Erro ao processar PDF:', error);
            this.showError(`Erro ao processar PDF: ${error.message}`);
        }
    }

    async renderAllPages() {
        const numPages = this.pdf.numPages;
        this.pages = [];

        console.log(`🎨 Renderizando ${numPages} páginas...`);

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            try {
                const page = await this.pdf.getPage(pageNum);
                const canvas = await this.renderPageToCanvas(page);
                this.pages.push(canvas);

                // Definir dimensões da primeira página
                if (pageNum === 1) {
                    this.pageWidth = canvas.width / this.renderScale;
                    this.pageHeight = canvas.height / this.renderScale;
                }

                // Atualizar progresso
                const progress = Math.round((pageNum / numPages) * 100);
                this.updateProgress(progress);

            } catch (error) {
                console.error(`❌ Erro na página ${pageNum}:`, error);
                this.pages.push(this.createErrorPage(pageNum));
            }
        }

        console.log(`✅ ${this.pages.length} páginas renderizadas`);
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

    initializeFlipbook() {
        const flipbookContainer = document.getElementById('flipbook');
        flipbookContainer.innerHTML = '';

        // Configurar PageFlip - capa única, resto duplas
        this.pageFlip = new St.PageFlip(flipbookContainer, {
            width: this.pageWidth,
            height: this.pageHeight,
            size: 'fixed',
            minWidth: 200,
            maxWidth: 2000,
            minHeight: 300,
            maxHeight: 2000,
            showCover: true,  // CAPA ISOLADA (só índice 0)
            mobileScrollSupport: true,
            clickEventForward: true,
            usePortrait: false,  // FALSE: spread mode por padrão
            startPage: 0,
            drawShadow: true,
            flippingTime: 600,
            useMouseEvents: true,
            swipeDistance: 30,
            showPageCorners: true,
            disableFlipByClick: false
        });

        // Criar elementos das páginas
        const pageElements = this.pages.map((canvas, index) => {
            return this.createPageElement(canvas, index);
        });

        // Carregar páginas no flipbook
        this.pageFlip.loadFromHTML(pageElements);

        // Event listeners do flipbook
        this.pageFlip.on('flip', () => {
            this.updatePageInfo();
            this.hideReadingHint();  // Esconder mensagem ao virar página
            this.debounceRefit();    // Reajustar escala ao mudar de página (capa -> spread)
        });

        this.pageFlip.on('changeState', () => {
            this.debounceRefit();
        });

        this.pageFlip.on('changeOrientation', () => {
            this.debounceRefit();
        });

        this.pageFlip.on('init', () => {
            this.debounceRefit();
        });

        this.updatePageInfo();
        console.log('📚 Flipbook inicializado com showCover: true');
    }

    createPageElement(canvas, pageIndex) {
        const pageDiv = document.createElement('div');
        pageDiv.className = 'page';

        // Criar um canvas exibido com o tamanho correto
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

    // FIT TO VIEWPORT REAL - baseado em medidas reais da stage
    fitToViewport() {
        if (!this.pageFlip || !this.stage) return;

        // Obter dimensões REAIS da stage via getBoundingClientRect
        const stageRect = this.stage.getBoundingClientRect();
        const availW = stageRect.width - 16;  // 8px padding de cada lado
        const availH = stageRect.height - 16; // 8px padding de cada lado

        // Detectar se estamos na capa ou em páginas normais
        const currentPageIndex = this.pageFlip.getCurrentPageIndex();
        const isCover = currentPageIndex === 0;

        // Calcular largura visível do livro baseado no estado atual
        let visibleBookWidth;
        if (isCover) {
            // APENAS A CAPA: single page centralizada
            visibleBookWidth = this.pageWidth;
        } else {
            // TODAS AS OUTRAS PÁGINAS: sempre spread (duplas)
            visibleBookWidth = this.pageWidth * 2;
        }

        const visibleBookHeight = this.pageHeight;

        // Calcular scale ideal para caber 100% na stage
        const scaleW = availW / visibleBookWidth;
        const scaleH = availH / visibleBookHeight;
        const idealScale = Math.min(scaleW, scaleH);

        // Reduzir ~10% para garantir folga
        const baseScale = idealScale * 0.9;

        // Aplicar escala final
        this.currentZoom = this.clamp(baseScale, this.minZoom, this.maxZoom);

        // Aplicar transform
        const flipbook = document.getElementById('flipbook');
        flipbook.style.transform = `scale(${this.currentZoom})`;
        flipbook.style.transformOrigin = 'center center';

        // Forçar centramento CSS na capa
        if (isCover) {
            flipbook.style.display = 'flex';
            flipbook.style.justifyContent = 'center';
            flipbook.style.alignItems = 'center';
        } else {
            flipbook.style.display = '';
            flipbook.style.justifyContent = '';
            flipbook.style.alignItems = '';
        }

        // Atualizar interface
        this.updateZoomInfo();

        // LOGS DE DIAGNÓSTICO
        const pageType = isCover ? 'CAPA_ÚNICA' : 'SPREAD_DUPLA';
        console.log(`📐 FIT TO VIEWPORT:`);
        console.log(`   stageRect: ${stageRect.width}x${stageRect.height}`);
        console.log(`   pageWidth: ${this.pageWidth}, pageHeight: ${this.pageHeight}`);
        console.log(`   visibleBookWidth: ${visibleBookWidth}`);
        console.log(`   currentPageIndex: ${currentPageIndex}, pageType: ${pageType}`);
        console.log(`   baseScale: ${baseScale.toFixed(3)}, currentZoom: ${this.currentZoom.toFixed(3)}`);
    }

    // Utilitário para clamp
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    // Debounce para evitar múltiplas chamadas
    debounceRefit() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.fitToViewport();
        }, 150);
    }

    // Configurar observadores de redimensionamento
    setupResizeHandling() {
        // ResizeObserver para a stage
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(entries => {
                this.debounceRefit();
            });
            this.resizeObserver.observe(this.stage);
        }

        // Window resize backup
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

        // Orientation change com matchMedia
        const orientationQuery = window.matchMedia("(orientation: portrait)");
        orientationQuery.addEventListener('change', () => {
            setTimeout(() => {
                this.debounceRefit();
            }, 300);
        });

        // Fallback para orientationchange
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.debounceRefit();
            }, 300);
        });

        console.log('✅ Listeners de redimensionamento configurados');
    }

    setupEventListeners() {
        console.log('🎮 Configurando controles...');

        // Navegação
        document.getElementById('prevBtn').addEventListener('click', () => {
            this.hideReadingHint();
            this.pageFlip.flipPrev();
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            this.hideReadingHint();
            this.pageFlip.flipNext();
        });

        // Zoom relativo - mantém centramento
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

        // Atalhos de teclado
        document.addEventListener('keydown', (e) => {
            if (!this.pageFlip) return;

            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.hideReadingHint();
                    this.pageFlip.flipPrev();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.hideReadingHint();
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

        console.log('✅ Controles configurados');
    }

    // Métodos de controle de zoom - agora relativos
    zoomIn() {
        this.currentZoom = this.clamp(this.currentZoom + this.zoomStep, this.minZoom, this.maxZoom);
        this.applyZoom();
    }

    zoomOut() {
        this.currentZoom = this.clamp(this.currentZoom - this.zoomStep, this.minZoom, this.maxZoom);
        this.applyZoom();
    }

    applyZoom() {
        const flipbook = document.getElementById('flipbook');
        flipbook.style.transform = `scale(${this.currentZoom})`;
        flipbook.style.transformOrigin = 'center center';

        this.updateZoomInfo();
    }

    updateZoomInfo() {
        document.getElementById('zoomInfo').textContent = `${Math.round(this.currentZoom * 100)}%`;
        document.getElementById('zoomInBtn').disabled = this.currentZoom >= this.maxZoom;
        document.getElementById('zoomOutBtn').disabled = this.currentZoom <= this.minZoom;
    }

    updatePageInfo() {
        if (!this.pageFlip || this.pages.length === 0) return;

        const currentPage = this.pageFlip.getCurrentPageIndex() + 1;
        const totalPages = this.pages.length;

        document.getElementById('pageInfo').textContent = `Página ${currentPage} de ${totalPages}`;

        document.getElementById('prevBtn').disabled = currentPage <= 1;
        document.getElementById('nextBtn').disabled = currentPage >= totalPages;
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

    // Métodos de UI
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

    // Controle da mensagem de instrução
    showReadingHint() {
        if (!this.readingHint || this.hasInteracted) return;

        // Mostrar mensagem
        this.readingHint.classList.remove('fade-out');

        // Auto fade-out após 3 segundos
        this.hintTimer = setTimeout(() => {
            this.hideReadingHint();
        }, 3000);

        console.log('💬 Mensagem de instrução exibida');
    }

    hideReadingHint() {
        if (!this.readingHint || this.hasInteracted) return;

        this.hasInteracted = true;
        this.readingHint.classList.add('fade-out');

        if (this.hintTimer) {
            clearTimeout(this.hintTimer);
            this.hintTimer = null;
        }

        console.log('💬 Mensagem de instrução escondida');
    }

    // Cleanup
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        if (this.hintTimer) {
            clearTimeout(this.hintTimer);
        }
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 Iniciando eBook Viewer...');
    new EBookViewer();
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