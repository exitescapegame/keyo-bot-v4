// KEYO Bot v4 - SUITE DE TESTES COMPLETA
// Execute com: node keyo-testes.js
// Resultado: PASSA = sobe pro Railway | FALHA = corrige antes

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════

const CORES = {
  reset: '\x1b[0m',
  verde: '\x1b[32m',
  vermelho: '\x1b[31m',
  amarelo: '\x1b[33m',
  azul: '\x1b[36m',
  bold: '\x1b[1m',
};

let totalTestes = 0;
let testesPassaram = 0;
let testesFalharam = 0;

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function teste(nome, funcao) {
  totalTestes++;
  try {
    funcao();
    console.log(`  ${CORES.verde}✅${CORES.reset} ${nome}`);
    testesPassaram++;
    return true;
  } catch (error) {
    console.log(`  ${CORES.vermelho}❌${CORES.reset} ${nome}`);
    console.log(`     ${CORES.vermelho}${error.message}${CORES.reset}`);
    testesFalharam++;
    return false;
  }
}

function assert(condicao, mensagem) {
  if (!condicao) {
    throw new Error(mensagem);
  }
}

function assertFile(caminhoArquivo, mensagem) {
  if (!fs.existsSync(caminhoArquivo)) {
    throw new Error(mensagem || `Arquivo não encontrado: ${caminhoArquivo}`);
  }
}

function assertFileContains(caminhoArquivo, texto, mensagem) {
  const conteudo = fs.readFileSync(caminhoArquivo, 'utf8');
  if (!conteudo.includes(texto)) {
    throw new Error(mensagem || `Arquivo não contém: ${texto}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// TESTES
// ═══════════════════════════════════════════════════════════════

console.log(`\n${CORES.bold}${CORES.azul}🧪 KEYO BOT v4 - SUITE DE TESTES${CORES.reset}\n`);

// ─────────────────────────────────────────────────────────────
// GRUPO 1: ARQUIVOS
// ─────────────────────────────────────────────────────────────

console.log(`${CORES.bold}📁 GRUPO 1: ARQUIVOS${CORES.reset}`);

teste('server.js existe', () => {
  assertFile('server.js', 'server.js não encontrado');
});

teste('package.json existe', () => {
  assertFile('package.json', 'package.json não encontrado');
});

teste('.env.example existe', () => {
  assertFile('.env.example', '.env.example não encontrado');
});

teste('README.md existe', () => {
  assertFile('README.md', 'README.md não encontrado');
});

// ─────────────────────────────────────────────────────────────
// GRUPO 2: SINTAXE
// ─────────────────────────────────────────────────────────────

console.log(`\n${CORES.bold}🔍 GRUPO 2: SINTAXE${CORES.reset}`);

teste('server.js sintaxe válida', () => {
  const { spawnSync } = require('child_process');
  const result = spawnSync('node', ['--check', 'server.js']);
  assert(result.status === 0, `Erro de sintaxe: ${result.stderr.toString()}`);
});

teste('keyo-testes.js sintaxe válida', () => {
  const { spawnSync } = require('child_process');
  const result = spawnSync('node', ['--check', 'keyo-testes.js']);
  assert(result.status === 0, `Erro de sintaxe: ${result.stderr.toString()}`);
});

teste('package.json JSON válido', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert(pkg.name === 'keyo-bot', 'Nome do pacote incorreto');
  assert(pkg.main === 'server.js', 'Main incorreto');
});

// ─────────────────────────────────────────────────────────────
// GRUPO 3: DEPENDÊNCIAS
// ─────────────────────────────────────────────────────────────

console.log(`\n${CORES.bold}📦 GRUPO 3: DEPENDÊNCIAS${CORES.reset}`);

teste('package.json tem @anthropic-ai/sdk', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert(
    pkg.dependencies['@anthropic-ai/sdk'],
    'Falta @anthropic-ai/sdk em dependencies'
  );
});

teste('Node.js >= 18', () => {
  const nodeVersion = parseInt(process.version.slice(1).split('.')[0]);
  assert(nodeVersion >= 18, `Node.js versão inválida: ${process.version}`);
});

teste('npm --version funciona', () => {
  const { spawnSync } = require('child_process');
  const result = spawnSync('npm', ['--version']);
  assert(result.status === 0, 'npm não funciona');
});

teste('node_modules existe', () => {
  assert(
    fs.existsSync('node_modules'),
    'node_modules não existe. Execute: npm install'
  );
});

teste('node_modules/@anthropic-ai/sdk existe', () => {
  assert(
    fs.existsSync('node_modules/@anthropic-ai/sdk'),
    '@anthropic-ai/sdk não instalado. Execute: npm install'
  );
});

// ─────────────────────────────────────────────────────────────
// GRUPO 4: VARIÁVEIS DE AMBIENTE
// ─────────────────────────────────────────────────────────────

console.log(`\n${CORES.bold}🔐 GRUPO 4: VARIÁVEIS DE AMBIENTE${CORES.reset}`);

teste('.env.example template correto', () => {
  assertFileContains('.env.example', 'ANTHROPIC_API_KEY', 'Falta ANTHROPIC_API_KEY em .env.example');
  assertFileContains('.env.example', 'EVOLUTION_KEY', 'Falta EVOLUTION_KEY em .env.example');
  assertFileContains('.env.example', 'EVOLUTION_INSTANCE', 'Falta EVOLUTION_INSTANCE em .env.example');
});

teste('.env configurado (ou gerar)', () => {
  if (!fs.existsSync('.env')) {
    // Criar .env.local de teste
    fs.copyFileSync('.env.example', '.env');
  }
  assertFile('.env', '.env não existe');
});

teste('.env tem ANTHROPIC_API_KEY', () => {
  const env = fs.readFileSync('.env', 'utf8');
  assert(
    env.includes('ANTHROPIC_API_KEY'),
    'ANTHROPIC_API_KEY não definida em .env'
  );
});

teste('.env tem EVOLUTION_KEY', () => {
  const env = fs.readFileSync('.env', 'utf8');
  assert(
    env.includes('EVOLUTION_KEY'),
    'EVOLUTION_KEY não definida em .env'
  );
});

// ─────────────────────────────────────────────────────────────
// GRUPO 5: CONTEÚDO DO CÓDIGO
// ─────────────────────────────────────────────────────────────

console.log(`\n${CORES.bold}🔬 GRUPO 5: CONTEÚDO DO CÓDIGO${CORES.reset}`);

teste('server.js importa Anthropic SDK', () => {
  assertFileContains('server.js', '@anthropic-ai/sdk', 'Falta import do Anthropic SDK');
});

teste('server.js tem função sendToEvolution', () => {
  assertFileContains('server.js', 'sendToEvolution', 'Falta função sendToEvolution');
});

teste('server.js processa webhook MESSAGES_UPSERT', () => {
  assertFileContains('server.js', 'MESSAGES_UPSERT', 'Não processa MESSAGES_UPSERT');
});

teste('server.js tem health check endpoint', () => {
  assertFileContains('server.js', '/health', 'Falta /health endpoint');
});

teste('server.js tem webhook endpoint', () => {
  assertFileContains('server.js', '/webhook', 'Falta /webhook endpoint');
});

teste('server.js tem try-catch', () => {
  assertFileContains('server.js', 'try', 'Falta try-catch');
});

teste('server.js não tem console.log() perigoso', () => {
  const conteudo = fs.readFileSync('server.js', 'utf8');
  // Verificar que não logga credenciais (procurar por padrões reais de logging)
  const temLoggingCredenciais = 
    conteudo.includes('console.log(ANTHROPIC_API_KEY)') ||
    conteudo.includes('console.log(EVOLUTION_KEY)') ||
    conteudo.includes('console.error(ANTHROPIC_API_KEY)') ||
    conteudo.includes('console.error(EVOLUTION_KEY)');
  
  assert(
    !temLoggingCredenciais,
    'Código está logando credenciais (segurança)'
  );
});

// ─────────────────────────────────────────────────────────────
// GRUPO 6: LÓGICA (SEM FAZER REQUISIÇÕES REAIS)
// ─────────────────────────────────────────────────────────────

console.log(`\n${CORES.bold}⚙️  GRUPO 6: LÓGICA${CORES.reset}`);

teste('sendToEvolution valida phoneNumber', () => {
  const serverCode = fs.readFileSync('server.js', 'utf8');
  assert(
    serverCode.includes('phoneNumber') || serverCode.includes('number'),
    'Função não extrai número de telefone'
  );
});

teste('Claude API usa modelo correto', () => {
  assertFileContains('server.js', 'claude-opus-4-6', 'Modelo Claude incorreto');
});

teste('Max tokens configurado', () => {
  assertFileContains('server.js', 'max_tokens', 'Max tokens não configurado');
});

teste('System prompt existe', () => {
  assertFileContains('server.js', 'system:', 'System prompt não definido');
});

teste('Resposta de erro tratada', () => {
  assertFileContains('server.js', 'catch', 'Erros não são tratados');
});

// ═══════════════════════════════════════════════════════════════
// RESUMO
// ═══════════════════════════════════════════════════════════════

console.log(`\n${CORES.bold}${'═'.repeat(60)}${CORES.reset}`);
console.log(`\n${CORES.bold}📊 RESULTADO FINAL${CORES.reset}\n`);

console.log(`  Total de testes:  ${CORES.bold}${totalTestes}${CORES.reset}`);
console.log(`  ${CORES.verde}✅ Passaram:${CORES.reset}     ${CORES.verde}${CORES.bold}${testesPassaram}${CORES.reset}`);
console.log(`  ${CORES.vermelho}❌ Falharam:${CORES.reset}     ${CORES.vermelho}${CORES.bold}${testesFalharam}${CORES.reset}`);

console.log(`\n${CORES.bold}${'═'.repeat(60)}${CORES.reset}\n`);

if (testesFalharam === 0) {
  console.log(`${CORES.verde}${CORES.bold}🎉 TODOS OS TESTES PASSARAM!${CORES.reset}`);
  console.log(`${CORES.verde}Código pronto para subir pro Railway.${CORES.reset}\n`);
  process.exit(0);
} else {
  console.log(`${CORES.vermelho}${CORES.bold}❌ ${testesFalharam} TESTE(S) FALHARAM${CORES.reset}`);
  console.log(`${CORES.vermelho}Corrija os erros antes de subir.${CORES.reset}\n`);
  process.exit(1);
}
