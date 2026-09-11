// KEYO BOT v4 - SERVER COM WEBHOOK
// Verifica fromMe para evitar loop infinito
// Usa keyo-bot.js para lógica completa

require('dotenv').config();
const http = require('http');
const { bot } = require('./keyo-bot.js');  // ✅ CORREÇÃO: Destruturar { bot }

const PORT = process.env.PORT || 3000;

console.log('\n🚀 KEYO BOT v4 - SERVIDOR INICIANDO\n');

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  // Health check
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Webhook do Evolution
  if ((req.url === '/webhook' || req.url === '/webhook/evolution') && req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const event = JSON.parse(body);
        
        console.log('📥 [WEBHOOK] POST recebido');

        // 🔴 VERIFICAÇÃO CRÍTICA: Ignorar mensagens DO BOT
        // Isso previne loop infinito
        if (event.data?.key?.fromMe === true) {
          console.log('⏭️  [SKIP] Mensagem enviada pelo bot (fromMe=true)');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
          return;
        }

        // Verificar se é evento de mensagem
        const isMessageEvent = event.event === 'MESSAGES_UPSERT';
        if (!isMessageEvent || !event.data?.message) {
          console.log('⏭️  [SKIP] Não é mensagem do usuário');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
          return;
        }

        // Extrair dados CORRETOS do webhook Evolution
        // Documentação: https://evolutionapi-evolution-api-90.mintlify.app/concepts/webhooks
        const remoteJid = event.data.key?.remoteJid;
        const userText = event.data.message?.conversation || 
                         event.data.message?.extendedTextMessage?.text || '';

        if (!remoteJid || !userText.trim()) {
          console.log('⏭️  [SKIP] remoteJid ou mensagem vazia');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
          return;
        }

        const telefone = remoteJid.split('@')[0];
        console.log(`👤 [${telefone}] "${userText.substring(0, 80)}"`);

        // ✅ CORREÇÃO: Chamar bot.processarMensagem (com { bot })
        // Isso usa:
        // - Fluxo LGPD completo
        // - Coleta de nome
        // - Claude para IA
        // - Supabase para dados
        await bot.processarMensagem(telefone, userText);

        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('❌ [ERRO]', error.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
  console.log(`✅ Webhook: POST http://localhost:${PORT}/webhook`);
  console.log(`✅ Webhook: POST http://localhost:${PORT}/webhook/evolution`);
  console.log(`✅ Health: GET http://localhost:${PORT}/health\n`);
});
