class EBookFlipbook {
    constructor() {
        this.pdf = null;
        this.pageFlip = null;
        this.currentZoom = 1;
        this.maxZoom = 3;
        this.minZoom = 0.5;
        this.zoomStep = 0.25;
        this.renderScale = 2;
        this.pages = [];
        this.isLoading = false;

        this.init();
    }

    async init() {
        this.showLoading();

        try {
            // Configurar PDF.js worker
            if (typeof pdfjsLib !== 'undefined') {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }

            await this.loadPDF();
            await this.renderAllPages();
            this.initializeFlipbook();
            this.setupEventListeners();
            this.hideLoading();

        } catch (error) {
            console.error('Erro ao inicializar:', error);
            this.showError();
        }
    }

    async loadPDF() {
        try {
            const loadingTask = pdfjsLib.getDocument('./ebook.pdf');
            this.pdf = await loadingTask.promise;
            console.log('PDF carregado com sucesso:', this.pdf.numPages, 'páginas');
        } catch (error) {
            console.error('Erro ao carregar PDF:', error);
            throw new Error('Não foi possível carregar o arquivo PDF');
        }
    }

    async renderAllPages() {
        const numPages = this.pdf.numPages;
        this.pages = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            try {
                const page = await this.pdf.getPage(pageNum);
                const canvas = await this.renderPageToCanvas(page);
                this.pages.push(canvas);

                // Atualizar loading com progresso
                const progress = Math.round((pageNum / numPages) * 100);
                this.updateLoadingProgress(progress);

            } catch (error) {
                console.error(`Erro ao renderizar página ${pageNum}:`, error);
                // Criar página em branco em caso de erro
                this.pages.push(this.createErrorPage());
            }
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

    createErrorPage() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = 400;
        canvas.height = 600;

        // Fundo branco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Texto de erro
        ctx.fillStyle = '#333333';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Erro ao carregar', canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText('esta página', canvas.width / 2, canvas.height / 2 + 20);

        return canvas;
    }

    initializeFlipbook() {
        const flipbookContainer = document.getElementById('flipbook');

        // Calcular dimensões baseadas no primeiro canvas
        let pageWidth = 400;
        let pageHeight = 600;

        if (this.pages.length > 0) {
            const firstCanvas = this.pages[0];
            const aspectRatio = firstCanvas.height / firstCanvas.width;

            // Ajustar tamanho baseado na tela
            const maxWidth = Math.min(window.innerWidth * 0.35, 450);
            const maxHeight = Math.min(window.innerHeight * 0.7, 650);

            pageWidth = Math.min(maxWidth, maxHeight / aspectRatio);
            pageHeight = pageWidth * aspectRatio;
        }

        // Configurar PageFlip
        this.pageFlip = new St.PageFlip(flipbookContainer, {
            width: pageWidth,
            height: pageHeight,
            size: 'stretch',
            minWidth: 200,
            maxWidth: 800,
            minHeight: 300,
            maxHeight: 1000,
            showCover: true,
            mobileScrollSupport: false,
            clickEventForward: true,
            usePortrait: false,
            startPage: 0,
            drawShadow: true,
            flippingTime: 600,
            useMouseEvents: true,
            swipeDistance: 30,
            showPageCorners: true,
            disableFlipByClick: false
        });

        // Adicionar páginas ao flipbook
        this.pages.forEach((canvas, index) => {
            const pageElement = this.createPageElement(canvas, index);
            this.pageFlip.loadFromHTML([pageElement]);
        });

        // Atualizar controles
        this.updatePageInfo();

        // Event listeners do flipbook
        this.pageFlip.on('flip', (e) => {
            this.updatePageInfo();
        });

        this.pageFlip.on('changeOrientation', (e) => {
            this.updatePageInfo();
        });
    }

    createPageElement(canvas, pageIndex) {
        const pageDiv = document.createElement('div');
        pageDiv.className = 'page';
        pageDiv.style.width = '100%';
        pageDiv.style.height = '100%';

        // Aplicar zoom ao canvas
        const scaledCanvas = this.scaleCanvas(canvas, this.currentZoom);
        pageDiv.appendChild(scaledCanvas);

        return pageDiv;
    }

    scaleCanvas(originalCanvas, scale) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = originalCanvas.width;
        canvas.height = originalCanvas.height;
        canvas.style.width = `${originalCanvas.width * scale}px`;
        canvas.style.height = `${originalCanvas.height * scale}px`;
        canvas.style.maxWidth = '100%';
        canvas.style.maxHeight = '100%';
        canvas.style.objectFit = 'contain';

        ctx.drawImage(originalCanvas, 0, 0);

        return canvas;
    }

    setupEventListeners() {
        // Botões de navegação
        document.getElementById('prevBtn').addEventListener('click', () => {
            this.pageFlip.flipPrev();
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            this.pageFlip.flipNext();
        });

        // Botões de zoom
        document.getElementById('zoomInBtn').addEventListener('click', () => {
            this.zoomIn();
        });

        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            this.zoomOut();
        });

        // Botão de download
        document.getElementById('downloadBtn').addEventListener('click', () => {
            this.downloadPDF();
        });

        // Botão de tela cheia
        document.getElementById('fullscreenBtn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Atalhos de teclado
        document.addEventListener('keydown', (e) => {
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

        // Redimensionamento da janela
        window.addEventListener('resize', () => {
            if (this.pageFlip) {
                this.pageFlip.updateState();
            }
        });
    }

    updatePageInfo() {
        if (!this.pageFlip || this.pages.length === 0) return;

        const currentPage = this.pageFlip.getCurrentPageIndex() + 1;
        const totalPages = this.pages.length;

        const pageInfo = document.getElementById('pageInfo');
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;

        // Atualizar estado dos botões
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= totalPages;
    }

    zoomIn() {
        if (this.currentZoom < this.maxZoom) {
            this.currentZoom = Math.min(this.currentZoom + this.zoomStep, this.maxZoom);
            this.updateZoom();
        }
    }

    zoomOut() {
        if (this.currentZoom > this.minZoom) {
            this.currentZoom = Math.max(this.currentZoom - this.zoomStep, this.minZoom);
            this.updateZoom();
        }
    }

    updateZoom() {
        // Atualizar display do zoom
        const zoomInfo = document.getElementById('zoomInfo');
        zoomInfo.textContent = `${Math.round(this.currentZoom * 100)}%`;

        // Atualizar estado dos botões
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');

        zoomInBtn.disabled = this.currentZoom >= this.maxZoom;
        zoomOutBtn.disabled = this.currentZoom <= this.minZoom;

        // Recriar flipbook com novo zoom
        this.recreateFlipbook();
    }

    recreateFlipbook() {
        if (!this.pageFlip) return;

        const currentPageIndex = this.pageFlip.getCurrentPageIndex();

        // Limpar flipbook atual
        document.getElementById('flipbook').innerHTML = '';

        // Recriar com novo zoom
        this.initializeFlipbook();

        // Restaurar página atual
        setTimeout(() => {
            this.pageFlip.flip(currentPageIndex);
        }, 100);
    }

    downloadPDF() {
        const link = document.createElement('a');
        link.href = './ebook.pdf';
        link.download = 'ebook.pdf';
        link.click();
    }

    toggleFullscreen() {
        const container = document.querySelector('.app-container');

        if (!document.fullscreenElement) {
            container.requestFullscreen().then(() => {
                container.classList.add('fullscreen');
                if (this.pageFlip) {
                    setTimeout(() => this.pageFlip.updateState(), 300);
                }
            }).catch(err => {
                console.log('Erro ao entrar em tela cheia:', err);
            });
        } else {
            document.exitFullscreen().then(() => {
                container.classList.remove('fullscreen');
                if (this.pageFlip) {
                    setTimeout(() => this.pageFlip.updateState(), 300);
                }
            });
        }
    }

    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('error').classList.add('hidden');
        document.getElementById('controls').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('controls').style.display = 'flex';
    }

    showError() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('error').classList.remove('hidden');
        document.getElementById('controls').style.display = 'none';
    }

    updateLoadingProgress(progress) {
        const loadingText = document.querySelector('.loading p');
        loadingText.textContent = `Carregando eBook... ${progress}%`;
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new EBookFlipbook();
});

// Prevenir zoom do navegador com Ctrl+scroll
document.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
    }
}, { passive: false });

// Prevenir alguns atalhos padrão do navegador
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && (e.key === '=' || e.key === '+' || e.key === '-')) {
        e.preventDefault();
    }
});