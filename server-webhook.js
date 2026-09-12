require('dotenv').config();
const http = require('http');
const { bot } = require('./keyo-bot.js');

const PORT = process.env.PORT || 3000;

console.log('\n🚀 KEYO BOT v4 - SERVIDOR INICIANDO\n');

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  // 🌐 LOG GLOBAL - INTERCEPTA QUALQUER REQUISIÇÃO
  console.log(`🌐 [REQUISIÇÃO RECEBIDA] ${req.method} | ${req.url} | IP: ${req.socket.remoteAddress}`);

  // Health check
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // ✅ Aceita /webhook/evolution com qualquer sufixo (Webhook by Events)
  if ((req.url.startsWith('/webhook/evolution')) && req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const event = JSON.parse(body);
        
        console.log('📩 [WEBHOOK ENTRADA]:', JSON.stringify(event, null, 2));

        // Ignorar mensagens DO BOT
        if (event.data?.key?.fromMe === true) {
          console.log('⏭️  [SKIP] Mensagem enviada pelo bot (fromMe=true)');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
          return;
        }

        // Aceitar MESSAGES_UPSERT em diferentes formatos
        const isMessageEvent = event.event === 'MESSAGES_UPSERT' || 
                               event.event === 'messages.upsert' ||
                               req.url.includes('MESSAGES_UPSERT');
        
        if (!isMessageEvent || !event.data?.message) {
          console.log('⏭️  [SKIP] Não é evento de mensagem ou faltam dados');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
          return;
        }

        // Extrair dados corretos do webhook Evolution
        const remoteJid = event.data.key?.remoteJid;
        const msg = event.data.message;
        const userText = msg.conversation || 
                         msg.extendedTextMessage?.text || 
                         msg.buttonsResponseMessage?.selectedButtonId || 
                         msg.listResponseMessage?.singleSelectReply?.selectedRowId || '';

        if (!remoteJid || !userText.trim()) {
          console.log('⏭️  [SKIP] remoteJid vazio ou mensagem vazia');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
          return;
        }

        const telefone = remoteJid.split('@')[0];
        console.log(`👤 [${telefone}] "${userText.substring(0, 80)}"`);

        // Chamar bot com destructuring correto
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
  console.log(`✅ Webhook: POST http://localhost:${PORT}/webhook/evolution`);
  console.log(`✅ Webhook: POST http://localhost:${PORT}/webhook/evolution/MESSAGES_UPSERT`);
  console.log(`✅ Health: GET http://localhost:${PORT}/health\n`);
});
