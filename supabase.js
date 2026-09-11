// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE.JS — Integração direta server-side com o banco EXIT Games
// Lê e grava: unidades, salas, ocupacao, vendas, clientes, keyo_memoria
// ═══════════════════════════════════════════════════════════════════════════════

'use strict';

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY; // Service Role Key (server-side apenas)

if (!SUPA_URL || !SUPA_KEY) {
  console.error('[Supabase] ⚠️  SUPABASE_URL ou SUPABASE_SERVICE_KEY não definidos no .env');
}

// ── Fetch base ───────────────────────────────────────────────────────────────
async function sf(path, method = 'GET', body = null, params = '') {
  const url = `${SUPA_URL}/rest/v1/${path}${params}`;
  const opts = {
    method,
    headers: {
      'apikey':        SUPA_KEY,
      'Authorization': `Bearer ${SUPA_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        method === 'POST' ? 'return=representation' : 'return=minimal'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${method} ${path}: ${res.status} — ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Leitura de configurações do ERP ─────────────────────────────────────────
async function carregarUnidades() {
  return sf('unidades', 'GET', null, '?select=*&order=id');
}

async function carregarSalas(unidadeId = null) {
  const filtro = unidadeId ? `?unidade_id=eq.${unidadeId}&select=*` : '?select=*';
  return sf('salas', 'GET', null, filtro);
}

async function carregarFeriados() {
  return sf('feriados', 'GET', null, '?select=data');
}

async function carregarCupons() {
  return sf('cupons', 'GET', null, '?ativo=eq.true&select=*');
}

// ── Ocupação ─────────────────────────────────────────────────────────────────
async function consultarHorarios(unidadeId, salaId, data) {
  const prefixo = salaId
    ? `${unidadeId}_${salaId}_${data}`
    : `${unidadeId}_%_${data}`;
  const rows = await sf('ocupacao', 'GET', null,
    `?chave=like.${encodeURIComponent(prefixo + '_%')}&select=chave,status`);
  return rows || [];
}

async function bloquearHorario(unidadeId, salaId, data, horario, status = 'reservado') {
  const chave = `${unidadeId}_${salaId}_${data}_${horario}`;
  return sf('ocupacao', 'POST', [{
    chave,
    unidade_id: String(unidadeId),
    status,
    atualizado_em: new Date().toISOString()
  }], '?on_conflict=chave');
}

// ── Vendas ───────────────────────────────────────────────────────────────────
async function criarVenda(venda) {
  return sf('vendas', 'POST', [{
    id: String(venda.id),
    unidade_id: String(venda.unidadeId),
    data: venda.data,
    dados: venda,
    criado_em: new Date().toISOString()
  }]);
}

async function buscarVenda(id) {
  const rows = await sf('vendas', 'GET', null, `?id=eq.${id}&select=*&limit=1`);
  return rows?.[0] || null;
}

// ── Clientes ─────────────────────────────────────────────────────────────────
async function buscarClientePorTel(tel) {
  const telNorm = tel.replace(/\D/g, '');
  // Busca pelo campo telefone dentro do JSON dados ou campo direto
  const rows = await sf('clientes', 'GET', null,
    `?or=(telefone.eq.${telNorm},dados->>telefone.eq.${telNorm})&select=*&limit=1`);
  return rows?.[0] || null;
}

async function criarOuAtualizarCliente(dados) {
  const telNorm = dados.telefone.replace(/\D/g, '');
  const existente = await buscarClientePorTel(telNorm);

  if (existente) {
    // Atualiza nome se mudou, não sobrescreve o resto
    await sf('clientes', 'PATCH', { nome: dados.nome },
      `?id=eq.${existente.id}`);
    return existente.id;
  }

  const novoId = 'cli-wa-' + Date.now();
  await sf('clientes', 'POST', [{
    id: novoId,
    nome: dados.nome,
    telefone: telNorm,
    dados: {
      ...dados,
      waConsentimento: true,
      waConsentimentoData: new Date().toISOString(),
      origem: 'whatsapp_keyo'
    },
    criado_em: new Date().toISOString()
  }]);
  return novoId;
}

// ── LGPD — Exclusão de dados ─────────────────────────────────────────────────
async function excluirDadosCliente(tel) {
  const telNorm = tel.replace(/\D/g, '');
  const cliente = await buscarClientePorTel(telNorm);
  if (!cliente) return false;

  // Anonimiza (não apaga — preserva integridade financeira)
  await sf('clientes', 'PATCH', {
    nome: '[DADOS REMOVIDOS - LGPD]',
    telefone: null,
    dados: {
      lgpd_removido: true,
      lgpd_data: new Date().toISOString(),
      lgpd_motivo: 'Solicitação do titular — Art. 18 LGPD'
    }
  }, `?id=eq.${cliente.id}`);

  // Remove histórico de conversas
  await sf('keyo_memoria', 'DELETE', null,
    `?tipo=eq.whatsapp_sessao&ref_id=eq.${telNorm}`).catch(() => {});

  console.log(`[LGPD] ✅ Dados do cliente ${telNorm} anonimizados.`);
  return true;
}

// ── Memória KEYO (keyo_memoria) ──────────────────────────────────────────────
async function salvarMemoria(tipo, refId, dados) {
  return sf('keyo_memoria', 'POST', [{
    tipo,
    ref_id: String(refId),
    dados,
    criado_em: new Date().toISOString()
  }], '?on_conflict=tipo,ref_id');
}

async function buscarMemoria(tipo, refId) {
  const rows = await sf('keyo_memoria', 'GET', null,
    `?tipo=eq.${tipo}&ref_id=eq.${encodeURIComponent(refId)}&select=dados&limit=1`);
  return rows?.[0]?.dados || null;
}

// ── Auditoria ─────────────────────────────────────────────────────────────────
async function registrarAuditoria(acao, descricao, ator = 'KEYO-BOT') {
  return sf('auditoria', 'POST', [{
    acao,
    descricao,
    ator,
    criado_em: new Date().toISOString()
  }]).catch(e => console.warn('[Auditoria] Falha ao registrar:', e.message));
}

module.exports = {
  supabase: {
    carregarUnidades,
    carregarSalas,
    carregarFeriados,
    carregarCupons,
    consultarHorarios,
    bloquearHorario,
    criarVenda,
    buscarVenda,
    buscarClientePorTel,
    criarOuAtualizarCliente,
    excluirDadosCliente,
    salvarMemoria,
    buscarMemoria,
    registrarAuditoria
  }
};
