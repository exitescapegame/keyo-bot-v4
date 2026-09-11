// KEYO BOT v4 - ULTRA SIMPLES - FUNCIONA
require('dotenv').config();
const http = require('http');
const Anthropic = require('@anthropic-ai/sdk');

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;
const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evolution-api-production-2ca5.up.railway.app';
const EVOLUTION_KEY = process.env.EVOLUTION_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'exit-keyo';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

console.log('\n🚀 KEYO BOT v4 - INICIANDO\n');

if (!ANTHROPIC_API_KEY) {
  console.log('❌ ANTHROPIC_API_KEY não definida!');
  process.exit(1);
}

if (!EVOLUTION_KEY) {
  console.log('❌ EVOLUTION_KEY não definida!');
  process.exit(1);
}

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ═══════════════════════════════════════════════════════════════
// HTTP SERVER
// ═══════════════════════════════════════════════════════════════

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  // Health check
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Webhook
  if (req.url === '/webhook' && req.method === 'POST') {
    console.log('📥 [WEBHOOK] POST /webhook recebido');

    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const event = JSON.parse(body);
        console.log('✅ [JSON] Parseado com sucesso');

        // Extrair mensagem
        const isMessageEvent = event.event === 'MESSAGES_UPSERT' || event.event === 'messages.upsert';
        
        if (!isMessageEvent || !event.data?.message) {
          console.log('⏭️ [SKIP] Não é mensagem do cliente');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
          return;
        }

        const message = event.data.message;
        const remoteJid = message.key?.remoteJid || message.remoteJid;
        const userText = message.conversation || message.extendedTextMessage?.text || message.body || '';

        if (!remoteJid || !userText.trim()) {
          console.log('⏭️ [SKIP] remoteJid ou mensagem vazia');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
          return;
        }

        const phoneNumber = remoteJid.split('@')[0];
        console.log(`👤 [${phoneNumber}] "${userText}"`);

        // Chamar Claude
        console.log('📞 [CLAUDE] Chamando API...');
        const response = await client.messages.create({
          model: 'claude-opus-4-6',
          max_tokens: 500,
          system: `Você é KEYO, atendente virtual da EXIT Games Brasil (escape rooms).
Seja amigável, breve, direto. Sempre em português.

Informações:
- SALVADOR: walk-in only (sem agendamento), Seg-Sab 14:00-22:00, Dom 12:00-21:00
- Preços: Seg-Quinta R$35 | Sexta-Dom R$45
- Salas: Quarto 209 (médio) e Loira do Banheiro (fácil)
- Aracaju: FECHADA (procurando novo local)
- Pets: Aceitos (se couberem na sala)
- Contato: +55 79 98852-1010`,
          messages: [
            { role: 'user', content: userText }
          ]
        });

        const botReply = response.content[0]?.text || 'Desculpe, não consegui processar.';
        console.log(`✅ [CLAUDE] Respondeu: "${botReply.substring(0, 60)}..."`);

        // Enviar para Evolution
        console.log('📤 [EVOLUTION] Enviando resposta...');
        await sendToEvolution(phoneNumber, botReply);
        console.log('✅ [OK] Resposta enviada\n');

        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('❌ [ERROR]', error.message);
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

// ═══════════════════════════════════════════════════════════════
// ENVIAR PARA EVOLUTION
// ═══════════════════════════════════════════════════════════════

async function sendToEvolution(phoneNumber, message) {
  const url = `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`;

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      number: phoneNumber,
      text: message
    });

    const options = {
      hostname: new URL(url).hostname,
      port: 443,
      path: new URL(url).pathname + new URL(url).search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'apikey': EVOLUTION_KEY
      }
    };

    const req = require('https').request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => (responseData += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`Evolution retornou ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════

server.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
  console.log(`✅ Health check: GET http://localhost:${PORT}/health`);
  console.log(`✅ Webhook: POST http://localhost:${PORT}/webhook\n`);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Encerrando...');
  server.close(() => {
    console.log('✅ Servidor fechado');
    process.exit(0);
  });
});
