const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

// A porta é atribuída automaticamente pelo Render ou assume a porta 3000
const PORT = process.env.PORT || 3000;

// Rota de teste para verificar se o servidor está vivo
app.get('/', (req, res) => {
    res.status(200).send('Servidor do Navegador Nuvem está online e operacional!');
});

// Rota principal acionada pelo Termux para fazer o login
app.post('/executar-login', async (req, res) => {
    console.log("[Nuvem] Pedido de login recebido do Termux...");
    
    // Credenciais recebidas ou predefinidas
    const dados = {
        ra: req.body.ra || "113579340",
        digito: req.body.digito || "2",
        senha: req.body.senha || "Danidavi8@"
    };

    let browser;
    try {
        console.log("[Nuvem] A iniciar o Chromium em segundo plano...");
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        console.log("[Nuvem] A navegar para a Sala do Futuro...");
        await page.goto('https://saladofuturo.educacao.sp.gov.br/', { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });

        console.log("[Nuvem] Página carregada com sucesso na nuvem!");

        // Tirar print para auditoria interna
        await page.screenshot({ path: 'sucesso-nuvem.png' });

        await browser.close();
        console.log("[Nuvem] Processo concluído com sucesso.");

        return res.status(200).json({
            sucesso: true,
            mensagem: "Navegador executado com sucesso na nuvem!",
            timestamp: new Date().toISOString()
        });

    } catch (erro) {
        if (browser) {
            await browser.close();
        }
        console.error("[Nuvem Erro]:", erro.message);
        return res.status(500).json({
            sucesso: false,
            erro: erro.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`[Servidor Nuvem] A escutar na porta ${PORT}`);
});
