require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ✅ MODELO CORRETO PARA SETEMBRO 2026
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

console.log('\n🚀 KEYO BOT v4 - SERVIDOR INICIANDO');
console.log(`📦 Usando modelo: ${ANTHROPIC_MODEL}`);
console.log(`🔑 API Key presente: ${ANTHROPIC_API_KEY ? '✅' : '❌'}\n`);

// Estado em memória para conversas
const conversas = new Map();

async function chamarClaude(mensagemUsuario, historico = []) {
  try {
    // Adiciona mensagem atual ao histórico
    const messages = [
      ...historico,
      { role: 'user', content: mensagemUsuario }
    ];

    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        system: `Você é Keyo, atendente virtual da EXIT Games Brasil. 
Seja amigável, conversacional e honesto. 
Se não souber algo com 100% certeza, encaminhe para o atendente.
Não invente informações sobre preços, horários ou descontos.
Fale sempre em português brasileiro.`,
        messages: messages
      })
    });

    if (!response.ok) {
      const erro = await response.json();
      console.error('❌ [CLAUDE API ERROR]', erro);
      throw new Error(`Claude API error: ${erro.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const resposta = data.content?.[0]?.text || 'Desculpa, não consegui processar isso.';
    
    return {
      resposta,
      historico: [...messages, { role: 'assistant', content: resposta }]
    };
  } catch (erro) {
    console.error('❌ [ERRO AO CHAMAR CLAUDE]:', erro.message);
    throw erro;
  }
}

async function enviarWhatsApp(telefone, mensagem) {
  try {
    // Aqui você integraria com Evolution API para enviar
    // Por enquanto, apenas log
    console.log(`📱 [WHATSAPP] Para ${telefone}: ${mensagem.substring(0, 80)}...`);
  } catch (erro) {
    console.error('❌ [ERRO AO ENVIAR WHATSAPP]:', erro.message);
  }
}

app.post('/webhook/evolution', async (req, res) => {
  try {
    const event = req.body;

    console.log('📥 [WEBHOOK] POST recebido');

    // Ignorar mensagens enviadas pelo próprio bot
    if (event.data?.key?.fromMe === true) {
      console.log('⏭️  [SKIP] Mensagem enviada pelo bot (fromMe=true)');
      return res.json({ success: true });
    }

    // Aceitar tanto MESSAGES_UPSERT quanto messages.upsert
    const isMessageEvent = event.event === 'MESSAGES_UPSERT' || event.event === 'messages.upsert';
    
    if (!isMessageEvent || !event.data?.message) {
      console.log('⏭️  [SKIP] Não é evento de mensagem ou faltam dados');
      return res.json({ success: true });
    }

    const remoteJid = event.data.key?.remoteJid;
    const userText = event.data.message?.conversation || 
                     event.data.message?.extendedTextMessage?.text || '';

    if (!remoteJid || !userText.trim()) {
      console.log('⏭️  [SKIP] remoteJid vazio ou mensagem vazia');
      return res.json({ success: true });
    }

    const telefone = remoteJid.split('@')[0];
    console.log(`👤 [${telefone}] "${userText.substring(0, 80)}"`);

    // Obter ou criar conversa
    let conversa = conversas.get(telefone) || { historico: [] };

    // Chamar Claude
    const { resposta, historico } = await chamarClaude(userText, conversa.historico);
    
    // Atualizar histórico
    conversa.historico = historico;
    conversas.set(telefone, conversa);

    console.log(`🤖 [RESPOSTA] ${resposta.substring(0, 100)}...`);

    // Enviar resposta (quando Evolution API estiver conectada)
    await enviarWhatsApp(telefone, resposta);

    res.json({ success: true });
  } catch (error) {
    console.error('❌ [ERRO WEBHOOK]:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    modelo: ANTHROPIC_MODEL,
    timestamp: new Date().toISOString() 
  });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor KEYO-BOT rodando na porta ${PORT}`);
  console.log(`✅ Webhook: POST http://localhost:${PORT}/webhook/evolution`);
  console.log(`✅ Health: GET http://localhost:${PORT}/health\n`);
});
