# Criar arquivo README com instruções
readme_content = """# eBook Flipbook - GitHub Pages

Este projeto cria um site estático para hospedar eBooks com efeito de virar páginas usando **StPageFlip + PDF.js**.

## 📁 Estrutura dos Arquivos

```
├── index.html      # Página principal
├── main.js         # Lógica JavaScript
├── styles.css      # Estilos CSS
├── .nojekyll       # Arquivo para GitHub Pages
└── ebook.pdf       # SEU ARQUIVO PDF (adicionar)
```

## 🚀 Como Usar

### 1. Deploy no GitHub Pages

1. **Criar repositório no GitHub**
   - Vá para github.com e crie um novo repositório
   - Nome sugerido: `meu-ebook-flipbook`
   - Marque como público

2. **Upload dos arquivos**
   - Extraia os arquivos deste ZIP
   - **Adicione seu arquivo PDF** e renomeie para `ebook.pdf`
   - Upload todos os arquivos para o repositório

3. **Ativar GitHub Pages**
   - Vá em Settings > Pages
   - Source: Deploy from a branch
   - Branch: main / (root)
   - Salvar

4. **Acessar o site**
   - URL: `https://SEU-USUARIO.github.io/NOME-DO-REPO`
   - Ex: `https://joao123.github.io/meu-ebook-flipbook`

### 2. Teste Local

Para testar localmente, você precisa de um servidor HTTP:

```bash
# Python 3
python -m http.server 8000

# Node.js (se tiver npx)
npx serve .

# Live Server (VS Code extension)
# Clique direito em index.html > "Open with Live Server"
```

Acesse: `http://localhost:8000`

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
"""

# Salvar README
with open(os.path.join(project_dir, 'README.md'), 'w', encoding='utf-8') as f:
    f.write(readme_content)

print("✅ README.md criado!")

# Criar arquivo ZIP
zip_filename = 'flipbook.zip'

with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
    # Adicionar todos os arquivos do projeto
    for root, dirs, files in os.walk(project_dir):
        for file in files:
            file_path = os.path.join(root, file)
            # Nome do arquivo no ZIP (sem o diretório do projeto)
            arc_name = os.path.relpath(file_path, project_dir)
            zipf.write(file_path, arc_name)

print(f"🎁 Arquivo ZIP criado: {zip_filename}")
print(f"📦 Tamanho do arquivo: {os.path.getsize(zip_filename)} bytes")

# Mostrar conteúdo do ZIP
print("\n📋 Conteúdo do ZIP:")
with zipfile.ZipFile(zip_filename, 'r') as zipf:
    for file_info in zipf.filelist:
        print(f"   - {file_info.filename} ({file_info.file_size} bytes)")

print(f"\n✨ Projeto completo salvo em: {zip_filename}")
print("\n🚀 Próximos passos:")
print("1. Extraia os arquivos do ZIP")
print("2. Adicione seu arquivo PDF e renomeie para 'ebook.pdf'")
print("3. Faça upload para GitHub e ative GitHub Pages")
print("4. Acesse seu eBook flipbook online!")