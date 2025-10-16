import os
import zipfile

# Criar diretório para o projeto
project_dir = "flipbook-ebook"
if not os.path.exists(project_dir):
    os.makedirs(project_dir)

# 1. Criar index.html
index_html = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eBook Interativo</title>
    <link rel="stylesheet" href="styles.css">
    
    <!-- PDF.js CDN -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    
    <!-- StPageFlip CDN -->
    <script src="https://unpkg.com/page-flip@2.0.7/dist/js/page-flip.browser.js"></script>
</head>
<body>
    <div class="app-container">
        <!-- Header -->
        <header class="header">
            <h1>📖 eBook Interativo</h1>
        </header>

        <!-- Loading Screen -->
        <div id="loading" class="loading">
            <div class="spinner"></div>
            <p>Carregando eBook...</p>
        </div>

        <!-- Error Message -->
        <div id="error" class="error hidden">
            <p>❌ Erro ao carregar o eBook</p>
            <small>Verifique se o arquivo 'ebook.pdf' está na pasta correta.</small>
        </div>

        <!-- Main Content -->
        <main class="main-content">
            <div class="flipbook-container">
                <div id="flipbook"></div>
            </div>
        </main>

        <!-- Controls -->
        <div class="controls" id="controls">
            <div class="controls-group">
                <button id="prevBtn" class="control-btn" title="Página Anterior">
                    <span>‹</span>
                </button>
                
                <span id="pageInfo" class="page-info">
                    Página 1 de 1
                </span>
                
                <button id="nextBtn" class="control-btn" title="Próxima Página">
                    <span>›</span>
                </button>
            </div>

            <div class="controls-group">
                <button id="zoomOutBtn" class="control-btn" title="Diminuir Zoom">
                    <span>🔍-</span>
                </button>
                
                <span id="zoomInfo" class="zoom-info">
                    100%
                </span>
                
                <button id="zoomInBtn" class="control-btn" title="Aumentar Zoom">
                    <span>🔍+</span>
                </button>
            </div>

            <div class="controls-group">
                <button id="downloadBtn" class="control-btn" title="Baixar PDF">
                    <span>📥</span>
                </button>
                
                <button id="fullscreenBtn" class="control-btn" title="Tela Cheia">
                    <span>⛶</span>
                </button>
            </div>
        </div>
    </div>

    <script src="main.js"></script>
</body>
</html>"""

# 2. Criar styles.css
styles_css = """/* Reset e Base */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
    color: #f0f0f0;
    height: 100vh;
    overflow: hidden;
}

/* App Container */
.app-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
}

/* Header */
.header {
    padding: 1rem 2rem;
    background: rgba(45, 45, 45, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid #444;
    text-align: center;
    position: relative;
    z-index: 100;
}

.header h1 {
    font-size: 1.5rem;
    font-weight: 300;
    color: #4a9eff;
}

/* Loading Screen */
.loading {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(26, 26, 26, 0.95);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.spinner {
    width: 50px;
    height: 50px;
    border: 3px solid #333;
    border-top: 3px solid #4a9eff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.loading p {
    font-size: 1.1rem;
    color: #ccc;
}

/* Error Message */
.error {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(26, 26, 26, 0.95);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    text-align: center;
    padding: 2rem;
}

.error p {
    font-size: 1.2rem;
    color: #ff6b6b;
    margin-bottom: 0.5rem;
}

.error small {
    color: #999;
}

.hidden {
    display: none !important;
}

/* Main Content */
.main-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    overflow: hidden;
}

.flipbook-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    max-width: 90%;
    max-height: 90%;
}

#flipbook {
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    border-radius: 8px;
    overflow: hidden;
}

/* Estilos para páginas do flipbook */
.page {
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.page canvas {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

/* Controls */
.controls {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: 1rem 2rem;
    background: rgba(45, 45, 45, 0.95);
    backdrop-filter: blur(10px);
    border-top: 1px solid #444;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 100;
    flex-wrap: wrap;
    gap: 1rem;
}

.controls-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.control-btn {
    background: rgba(74, 158, 255, 0.2);
    border: 1px solid #4a9eff;
    color: #4a9eff;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 1rem;
    min-width: 45px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.control-btn:hover {
    background: rgba(74, 158, 255, 0.3);
    transform: translateY(-2px);
}

.control-btn:active {
    transform: translateY(0);
}

.control-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

.page-info, .zoom-info {
    color: #ccc;
    font-size: 0.9rem;
    min-width: 80px;
    text-align: center;
}

/* Responsive Design */
@media (max-width: 768px) {
    .header {
        padding: 0.75rem 1rem;
    }
    
    .header h1 {
        font-size: 1.25rem;
    }
    
    .controls {
        padding: 1rem;
        flex-direction: column;
        gap: 0.75rem;
    }
    
    .controls-group {
        justify-content: center;
        width: 100%;
    }
    
    .control-btn {
        padding: 0.6rem 0.8rem;
        font-size: 0.9rem;
        min-width: 40px;
    }
    
    .page-info, .zoom-info {
        font-size: 0.8rem;
        min-width: 70px;
    }
    
    .main-content {
        padding: 0.5rem;
    }
    
    .flipbook-container {
        max-width: 95%;
        max-height: 85%;
    }
}

@media (max-width: 480px) {
    .control-btn {
        padding: 0.5rem;
        min-width: 35px;
    }
    
    .page-info, .zoom-info {
        font-size: 0.75rem;
        min-width: 60px;
    }
}

/* Fullscreen styles */
.fullscreen {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    z-index: 9999 !important;
    background: #1a1a1a !important;
}

.fullscreen .flipbook-container {
    max-width: 100% !important;
    max-height: 100% !important;
    padding: 2rem !important;
}

/* Smooth transitions */
.flipbook-container {
    transition: all 0.3s ease;
}

/* Page flip animations */
.stf__wrapper {
    margin: 0 auto;
}

.stf__item {
    background: #fff;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

/* Custom scrollbar for any overflow */
::-webkit-scrollbar {
    width: 8px;
}

::-webkit-scrollbar-track {
    background: #333;
}

::-webkit-scrollbar-thumb {
    background: #666;
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: #777;
}"""

# 3. Criar main.js
main_js = """class EBookFlipbook {
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
});"""

# Salvar arquivos
with open(os.path.join(project_dir, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(index_html)

with open(os.path.join(project_dir, 'styles.css'), 'w', encoding='utf-8') as f:
    f.write(styles_css)

with open(os.path.join(project_dir, 'main.js'), 'w', encoding='utf-8') as f:
    f.write(main_js)

# Criar arquivo .nojekyll vazio
with open(os.path.join(project_dir, '.nojekyll'), 'w') as f:
    f.write('')

print("✅ Arquivos criados com sucesso!")
print(f"📁 Diretório: {project_dir}/")
print("📄 Arquivos criados:")
print("   - index.html")
print("   - main.js") 
print("   - styles.css")
print("   - .nojekyll")