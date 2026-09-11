import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
app.use(express.json());

const client = new Anthropic();

// Armazena conversas por ID de cliente
const conversas = new Map();

app.post('/webhook/evolution', async (req, res) => {
  console.log('[WEBHOOK] POST recebido');
  console.log('[PAYLOAD COMPLETO]', JSON.stringify(req.body, null, 2));
  
  try {
    // Log detalhado da estrutura
    console.log('[DEBUG] event:', req.body.event);
    console.log('[DEBUG] data:', req.body.data);
    
    if (req.body.event === 'messages.upsert') {
      console.log('[DEBUG] messages:', JSON.stringify(req.body.data.messages, null, 2));
      
      const messages = req.body.data.messages || [];
      
      for (const msg of messages) {
        console.log('[DEBUG] Mensagem individual:', JSON.stringify(msg, null, 2));
        console.log('[DEBUG] msg.key:', msg.key);
        console.log('[DEBUG] msg.key.fromMe:', msg.key?.fromMe);
        console.log('[DEBUG] msg.message:', msg.message);
        
        // Verifica se é mensagem do usuário
        if (msg.key?.fromMe === true) {
          console.log('[SKIP] É mensagem do bot (fromMe=true)');
          continue;
        }
        
        // Extrai texto da mensagem
        const texto = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        
        if (!texto) {
          console.log('[SKIP] Sem texto na mensagem');
          continue;
        }
        
        console.log('[PROCESSANDO] Texto:', texto);
        
        // Processa a mensagem
        await processarMensagem(msg, texto);
      }
    }
    
    res.json({ status: 'ok' });
  } catch (erro) {
    console.error('[ERRO]', erro);
    res.status(500).json({ erro: erro.message });
  }
});

async function processarMensagem(msg, texto) {
  try {
    const telefone = msg.key?.remoteJid || 'unknown';
    console.log('[MSG] De:', telefone, 'Texto:', texto);
    
    // Aqui processaria com Claude
    console.log('[PROCESS] Mensagem seria processada aqui');
  } catch (erro) {
    console.error('[ERRO processarMensagem]', erro);
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 Bot rodando em http://localhost:${PORT}`);
});
