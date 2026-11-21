require('dotenv').config();
const http = require('http');
const { bot } = require('./keyo-bot.js');

const PORT = process.env.PORT || 3000;

console.log('\n🚀 KEYO BOT v4 - SERVIDOR INICIANDO\n');

const server = http.createServer(async (req, res) => {
  console.log("[REQ] " + req.method + " " + req.url);
  res.setHeader('Content-Type', 'application/json');

  // 🌐 LOG GLOBAL - INTERCEPTA QUALQUER REQUISIÇÃO
  console.log(`🌐 [REQUISIÇÃO RECEBIDA] ${req.method} | ${req.url} | IP: ${req.socket.remoteAddress}`);

  // Health check
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // [21/11/2026] Alerta de aprovacao de posts do Marketing. So manda para o
  // numero fixo no keyo-bot.js. Desligado se ALERTA_TOKEN nao estiver definido.
  if (req.url.split('?')[0] === '/alerta/aprovacao' && req.method === 'POST') {
    const token = typeof bot.alertaToken === 'function' ? bot.alertaToken() : '';
    if (!token) {
      res.writeHead(503);
      res.end(JSON.stringify({ error: 'alerta desligado (ALERTA_TOKEN ausente)' }));
      return;
    }
    const auth = String(req.headers['authorization'] || '');
    const crypto = require('crypto');
    const a = Buffer.from(auth), b = Buffer.from(`Bearer ${token}`);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'não autorizado' }));
      return;
    }
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); if (body.length > 10000) req.destroy(); });
    req.on('end', async () => {
      try {
        const { texto } = JSON.parse(body || '{}');
        const r = await bot.enviarAlertaAprovacao(texto);
        res.writeHead(r.ok ? 200 : 400);
        res.end(JSON.stringify(r));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ ok: false, motivo: 'JSON inválido' }));
      }
    });
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
          // [20/11/2026] Pode ser o bot OU uma pessoa digitando no celular do
          // Keyo. Se for pessoa, o Keyo fica em silencio naquela conversa.
          try {
            const m = event.data.message || {};
            const txt = m.conversation || m.extendedTextMessage?.text ||
                        m.documentMessage?.caption || m.documentWithCaptionMessage?.message?.documentMessage?.caption ||
                        m.imageMessage?.caption || '';
            if (typeof bot.mensagemPropria === 'function') {
              const quem = bot.mensagemPropria(event.data.key?.remoteJid, event.data.key?.id, txt);
              console.log(`⏭️  [fromMe] ${quem}`);
            }
          } catch (e) { console.error('❌ [fromMe]', e.message); }
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

        // [20/11/2026] Documento do cliente (ex.: questionario preenchido):
        // repassa ao atendimento. Aditivo: texto continua no fluxo de sempre.
        const ehDocumento = !!(msg.documentMessage || msg.documentWithCaptionMessage);
        if (remoteJid && ehDocumento && !userText.trim()) {
          const telDoc = remoteJid.split('@')[0];
          console.log(`📎 [${telDoc}] documento recebido`);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
          if (typeof bot.processarDocumento === 'function') {
            bot.processarDocumento(telDoc, event.data).catch(e => console.error('❌ [DOC]', e.message));
          }
          return;
        }

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
