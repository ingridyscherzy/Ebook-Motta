# 📖 eBook Viewer

Um visualizador de eBook moderno e responsivo com efeito de virar páginas, criado especificamente para hospedar um único arquivo PDF com uma interface elegante e dark mode.

## ✨ Características

- 📚 **Efeito de virar páginas realista** usando StPageFlip
- 🎨 **Design moderno** com dark mode suave
- 📱 **Totalmente responsivo** para desktop e mobile
- 🔍 **Controles de zoom** avançados (50% - 300%)
- ⌨️ **Atalhos de teclado** para navegação
- 🖥️ **Modo tela cheia** para leitura imersiva
- 💾 **Botão de download** para salvar o PDF
- 🌐 **Compatível com GitHub Pages** - 100% arquivos estáticos
- 🚫 **Sem dependências de servidor** - funciona offline

## 📁 Estrutura do Projeto

```
ebook-viewer/
├── index.html          # Página principal
├── styles.css          # Estilos (dark mode responsivo)
├── main.js             # Lógica da aplicação
├── ebook.pdf           # SEU ARQUIVO PDF AQUI
└── README.md           # Esta documentação
```

## 🚀 Como usar

### Opção 1: GitHub Pages (Recomendado)

1. **Fork ou clone** este repositório
2. **Substitua** o arquivo `ebook.pdf` pelo seu próprio PDF
3. **Ative GitHub Pages** nas configurações do repositório:
   - Vá em `Settings` → `Pages`
   - Selecione `Deploy from a branch`
   - Escolha `main` branch
   - Pasta: `/ (root)`
4. **Acesse** sua URL do GitHub Pages: `https://seuusuario.github.io/nome-do-repo`

### Opção 2: Servidor Local

```bash
# Clone o repositório
git clone [url-do-seu-repo]
cd ebook-viewer

# Inicie um servidor HTTP
python3 -m http.server 8000

# Acesse no navegador
http://localhost:8000
```

### Opção 3: Arquivo Local (com limitações)

1. Abra `index.html` diretamente no navegador
2. Se aparecer erro de CORS, clique em **"📁 Selecionar PDF"**
3. Escolha seu arquivo PDF manualmente

## ✨ Funcionalidades

- **📖 Efeito flipbook** - Virar páginas com mouse/touch
- **🔍 Zoom** - Ampliar/diminuir com botões ou Ctrl+/Ctrl-
- **📱 Responsivo** - Funciona em mobile e desktop
- **🌙 Dark Mode** - Interface escura elegante
- **⌨️ Atalhos** - Setas, F11, Escape, etc.
- **📥 Download** - Botão para baixar PDF original
- **⛶ Tela Cheia** - Modo fullscreen

## ⚙️ Configurações

### Modificar Zoom
No arquivo `main.js`, altere:
```javascript
this.maxZoom = 3;     // Zoom máximo
this.minZoom = 0.5;   // Zoom mínimo
this.zoomStep = 0.25; // Incremento do zoom
```

### Modificar Tamanho das Páginas
No arquivo `main.js`, na função `initializeFlipbook()`:
```javascript
const maxWidth = Math.min(window.innerWidth * 0.35, 450);
const maxHeight = Math.min(window.innerHeight * 0.7, 650);
```

### Cores do Tema
No arquivo `styles.css`:
```css
/* Cores principais */
--primary-bg: #1a1a1a;     /* Fundo principal */
--secondary-bg: #2d2d2d;   /* Fundo dos controles */
--accent-color: #4a9eff;   /* Cor dos botões */
--text-color: #f0f0f0;     /* Cor do texto */
```

## 🔧 Resolução de Problemas

### PDF não carrega
- ✅ Arquivo deve se chamar exatamente `ebook.pdf`
- ✅ Arquivo deve estar na pasta raiz
- ✅ PDF deve ser válido (teste abrir em outro programa)

### Site não funciona no GitHub Pages
- ✅ Aguarde 5-10 minutos após o upload
- ✅ Verifique se o arquivo `.nojekyll` está presente
- ✅ Repositório deve ser público
- ✅ GitHub Pages deve estar ativado nas configurações

### Erro de CORS (ao testar localmente)
- ✅ Use um servidor HTTP (não abra o arquivo diretamente)
- ✅ Arquivos PDF podem ter restrições locais

### Performance lenta
- ✅ PDFs muito grandes (>50MB) podem ser lentos
- ✅ Muitas páginas (>100) podem demorar para carregar
- ✅ Considere compactar o PDF

## 📚 Bibliotecas Utilizadas

- **PDF.js** v3.11.174 - Renderização de PDFs
- **StPageFlip** v2.0.7 - Efeito de virar páginas

## 📄 Licença

Este código é fornecido "como está" para uso pessoal e educacional.

---

**Desenvolvido com ❤️ para facilitar a leitura de eBooks!**
