const express = require('express');
const puppeteer = require('puppeteer');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Token de segurança gerado no arranque
const TOKEN_MESTRE = crypto.randomBytes(16).toString('hex');
console.log(`[Segurança] TOKEN DE ACESSO GERADO: ${TOKEN_MESTRE}`);

// Instância global do navegador para reutilizar e suportar múltiplas abas
let browserInstance = null;

async function getBrowser() {
    if (!browserInstance || !browserInstance.connected) {
        console.log("[Nuvem] A iniciar nova instância do Chromium...");
        browserInstance = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
    }
    return browserInstance;
}

app.get('/', (req, res) => {
    res.status(200).send('Navegador Nuvem Multi-abas operacional!');
});

app.get('/token', (req, res) => {
    res.status(200).json({ token_ativo: TOKEN_MESTRE });
});

// Endpoint genérico para abrir um URL em nova aba, interagir ou recolher dados
app.post('/navegar', async (req, res) => {
    const { token, url, acoes } = req.body;

    if (!token || token !== TOKEN_MESTRE) {
        return res.status(401).json({ sucesso: false, erro: "Token inválido." });
    }

    if (!url) {
        return res.status(400).json({ sucesso: false, erro: "URL não fornecido." });
    }

    let page;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        console.log(`[Nuvem] A abrir nova aba para o URL: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        let resultadoExtra = null;

        // Se quiser executar ações específicas passadas no JSON (ex: preencher inputs, clicar, etc.)
        if (acoes && Array.isArray(acoes)) {
            for (let acao of acoes) {
                if (acao.tipo === 'digitar') {
                    await page.type(acao.seletor, acao.texto);
                } else if (acao.tipo === 'clicar') {
                    await page.click(acao.seletor);
                } else if (acao.tipo === 'esperar') {
                    await new Promise(r => setTimeout(r, acao.tempo || 2000));
                }
            }
        }

        // Tira um print para registo
        const screenshotBuffer = await page.screenshot({ encoding: 'base64' });
        
        // Recolhe o título da página ou HTML se necessário
        const titulo = await page.title();

        await page.close(); // Fecha apenas a aba, mantendo o navegador pronto para outras

        return res.status(200).json({
            sucesso: true,
            tituloPagina: titulo,
            screenshotBase64: screenshotBuffer,
            mensagem: "Aba executada com sucesso!"
        });

    } catch (erro) {
        if (page) {
            try { await page.close(); } catch(e) {}
        }
        console.error("[Erro na aba]:", erro.message);
        return res.status(500).json({ sucesso: false, erro: erro.message });
    }
});

app.listen(PORT, () => {
    console.log(`[Servidor Nuvem] A escutar na porta ${PORT}`);
});
