// KEYO Bot v4 - TESTE DE WEBHOOK
// Execute DEPOIS de "npm start" em outro terminal:
// node teste-webhook.js

const http = require('http');

const WEBHOOK_URL = 'http://localhost:3000/webhook';
const TEST_CASES = [
  {
    name: 'Mensagem simples "Oi"',
    event: 'MESSAGES_UPSERT',
    message: {
      key: { remoteJid: '5579988521010@s.whatsapp.net' },
      conversation: 'Oi Keyo!'
    }
  },
  {
    name: 'Pergunta sobre horários',
    event: 'MESSAGES_UPSERT',
    message: {
      key: { remoteJid: '5579987654321@s.whatsapp.net' },
      conversation: 'Qual é o horário de funcionamento?'
    }
  },
  {
    name: 'Pergunta sobre preços',
    event: 'MESSAGES_UPSERT',
    message: {
      key: { remoteJid: '5579912345678@s.whatsapp.net' },
      conversation: 'Quanto custa?'
    }
  },
  {
    name: 'Evento desconhecido (deve ignorar)',
    event: 'STATUS_UPDATE',
    message: {
      key: { remoteJid: '5579900000000@s.whatsapp.net' },
      status: 'delivered'
    }
  }
];

let testesRodando = 0;
let testesPassaram = 0;

console.log('\n🧪 TESTE DE WEBHOOK\n');
console.log(`Testando ${TEST_CASES.length} casos...\n`);

function testarWebhook(testCase) {
  return new Promise((resolve) => {
    testesRodando++;

    const payload = JSON.stringify({
      event: testCase.event,
      data: {
        message: testCase.message
      }
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200 && response.success === true) {
            console.log(`✅ ${testCase.name}`);
            testesPassaram++;
          } else {
            console.log(`❌ ${testCase.name} - Status: ${res.statusCode}`);
          }
        } catch (e) {
          console.log(`❌ ${testCase.name} - Resposta inválida`);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log(`❌ ${testCase.name} - ${e.message}`);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

async function rodarTestes() {
  for (const testCase of TEST_CASES) {
    await testarWebhook(testCase);
    await new Promise(resolve => setTimeout(resolve, 500)); // Delay entre testes
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`\n📊 RESULTADO: ${testesPassaram}/${testesRodando} testes passaram\n`);

  if (testesPassaram === testesRodando) {
    console.log('✅ WEBHOOK FUNCIONA!\n');
    process.exit(0);
  } else {
    console.log('❌ ALGUNS TESTES FALHARAM\n');
    process.exit(1);
  }
}

// Verificar se servidor está rodando
const verificarServidor = http.get('http://localhost:3000/health', (res) => {
  if (res.statusCode === 200) {
    console.log('✅ Servidor encontrado em http://localhost:3000\n');
    rodarTestes();
  } else {
    console.log('❌ Servidor retornou status', res.statusCode, '\n');
    process.exit(1);
  }
});

verificarServidor.on('error', () => {
  console.log('❌ Servidor não está rodando!\n');
  console.log('Execute em outro terminal: npm start\n');
  process.exit(1);
});
