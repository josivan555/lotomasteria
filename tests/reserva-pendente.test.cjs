const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Executa os handlers reais, substituindo apenas banco, sessão e provedor de pagamento.
function loadTs(file, mocks = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  const localRequire = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('.')) return loadTs(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), name + '.ts')), mocks);
    return require(name);
  };
  new Function('require', 'module', 'exports', source)(localRequire, mod, mod.exports);
  return mod.exports;
}

const bolaoId = '11111111-1111-4111-8111-111111111111';
const outroBolao = '22222222-2222-4222-8222-222222222222';
const reservaId = '33333333-3333-4333-8333-333333333333';
const compra = { bolaoId, nome: 'José da Silva', celular: '(98) 99999-1234', cotas: 1 };
const reserva = () => ({ id: reservaId, bolao_id: bolaoId, nome_completo: 'JOSÉ DA SILVA', celular: '+55 98 99999-1234', quantidade_cotas: 3, valor_total: 22.5, status: 'reservado', codigo_referencia: 'BOL-ANTIGA', payment_id: '123' });

function fixture(initial = []) {
  const state = { rows: structuredClone(initial), cancelCalls: 0, pixCalls: 0, available: 10, status: 'ativo', failWrite: false, cancelResult: 'cancelado', paymentStatus: 'pending', pixInputs: [] };
  const sb = {
    auth: { getSession: async () => ({ data: { session: null } }) },
    from: () => {
      let action = 'read', value;
      const filters = [];
      const query = {
        select: () => query, order: () => query,
        eq: (k, v) => { filters.push(row => row[k] === v); return query; },
        is: (k, v) => { filters.push(row => (row[k] ?? null) === v); return query; },
        insert: v => { action = 'insert'; value = v; return query; },
        update: v => { action = 'update'; value = v; return query; },
        maybeSingle: () => run(true), single: () => run(true),
        then: (resolve, reject) => run(false).then(resolve, reject),
      };
      async function run(single) {
        if (action !== 'read' && state.failWrite) return { data: null, error: { message: 'Banco indisponível' } };
        let rows = state.rows.filter(row => filters.every(filter => filter(row)));
        if (action === 'insert') { state.rows.push(structuredClone(value)); rows = [state.rows.at(-1)]; }
        if (action === 'update') rows.forEach(row => Object.assign(row, structuredClone(value)));
        return { data: structuredClone(single ? rows[0] ?? null : rows), error: null };
      }
      return query;
    },
  };
  const api = loadTs('src/lib/boloes.functions.ts', {
    '@tanstack/react-start': { createServerFn: () => {
      let validator = x => x;
      const chain = { middleware: () => chain, inputValidator: fn => { validator = fn; return chain; }, handler: fn => ({ data }) => fn({ data: validator(data) }) };
      return chain;
    } },
    '@/integrations/backend/auth-middleware': { requireSupabaseAuth: {} },
    '@/integrations/backend/client': { supabase: sb },
    '@/integrations/backend/client.server': { supabaseAdmin: sb },
    './loterias-config': { LOTERIA_IDS: ['lotofacil'] },
    './bolao-conferencia': {}, './bolao-historico': {},
    './pix-bolao.server': {
      cancelarPixPendente: async () => {
        state.cancelCalls++;
        if (state.onCancel) state.onCancel();
        if (state.cancelResult instanceof Error) throw state.cancelResult;
        return state.cancelResult;
      },
      consultarPagamentoReserva: async () => state.paymentStatus,
      gerarPixReserva: async input => { state.pixCalls++; state.pixInputs.push(input); return { pix: { paymentId: '456', qrCode: 'novo-pix' } }; },
    },
  });
  api.obterBolao = async () => ({ id: bolaoId, nome: 'Bolão', cotas_disponiveis: state.available, valor_cota: 7.5, prazo_vendas: '2099-12-31', horario_encerramento: '23:59', status: state.status });
  return { state, comprar: data => api.comprarCotasBolao({ data: { ...compra, ...data } }), retomar: () => api.buscarReservaBolao({ data: { codigo: 'BOL-ANTIGA', bolaoId } }) };
}

test('mesmo nome e telefone formatados: notifica sem criar reserva nem PIX', async () => {
  const { state, comprar } = fixture([reserva()]);
  const res = await comprar({ nome: '  jose   da silva ' });
  assert.equal(res.tipo, 'reservas_pendentes');
  assert.equal(res.reservas[0].codigoReferencia, 'BOL-ANTIGA');
  assert.equal(state.rows.length, 1);
  assert.equal(state.cancelCalls + state.pixCalls, 0);
});

test('sem reserva correspondente, mantém o fluxo normal', async () => {
  for (const existing of [[], [{ ...reserva(), celular: '98988880000' }], [{ ...reserva(), nome_completo: 'Maria Silva' }], [{ ...reserva(), bolao_id: outroBolao }], [{ ...reserva(), status: 'pago' }]]) {
    const { state, comprar } = fixture(existing);
    const res = await comprar({});
    assert.equal(res.tipo, 'compra');
    assert.equal(state.rows.length, existing.length + 1);
    assert.equal(state.pixCalls, 1);
    assert.equal(state.cancelCalls, 0);
  }
});

test('recuperação é oferecida mesmo quando as cotas estão esgotadas', async () => {
  const { state, comprar } = fixture([reserva()]);
  state.available = 0;
  assert.equal((await comprar({})).tipo, 'reservas_pendentes');
  assert.equal(state.rows.length, 1);
});

test('substitui em uma escrita, reaproveita disponibilidade e troca ID/código/PIX', async () => {
  const { state, comprar } = fixture([reserva()]);
  state.available = 0;
  const res = await comprar({ substituirReservaId: reservaId, cotas: 2 });
  assert.equal(res.tipo, 'compra');
  assert.equal(state.rows.length, 1);
  assert.notEqual(state.rows[0].id, reservaId);
  assert.notEqual(res.codigoReferencia, 'BOL-ANTIGA');
  assert.equal(state.rows[0].quantidade_cotas, 2);
  assert.equal(res.valorTotal, 15);
  assert.equal(state.rows[0].payment_id, '456');
  assert.equal(state.cancelCalls, 1);
});

test('não cancela uma reserva de outra identidade', async () => {
  const { state, comprar } = fixture([reserva()]);
  await assert.rejects(comprar({ substituirReservaId: reservaId, celular: '98988880000' }), /mudou ou já foi paga/);
  assert.equal(state.cancelCalls, 0);
  assert.equal(state.rows[0].id, reservaId);
});

test('pagamento aprovado preserva a reserva e confirma o status', async () => {
  const { state, comprar } = fixture([reserva()]);
  state.cancelResult = 'pago';
  await assert.rejects(comprar({ substituirReservaId: reservaId }), /já foi paga/);
  assert.equal(state.rows[0].status, 'pago');
  assert.equal(state.rows[0].codigo_referencia, 'BOL-ANTIGA');
  assert.equal(state.pixCalls, 0);
});

test('falhas de cancelamento ou banco não removem a reserva', async () => {
  for (const failure of ['cancel', 'write']) {
    const { state, comprar } = fixture([reserva()]);
    if (failure === 'cancel') state.cancelResult = new Error('Falha no cancelamento');
    else state.failWrite = true;
    await assert.rejects(comprar({ substituirReservaId: reservaId }));
    assert.equal(state.rows.length, 1);
    assert.equal(state.rows[0].id, reservaId);
    assert.equal(state.pixCalls, 0);
  }
});

test('cotas insuficientes e bolão encerrado não cancelam o PIX', async () => {
  for (const closed of [false, true]) {
    const { state, comprar } = fixture([reserva()]);
    state.available = 0;
    if (closed) state.status = 'encerrado';
    await assert.rejects(comprar({ substituirReservaId: reservaId, cotas: closed ? 1 : 4 }));
    assert.equal(state.cancelCalls, 0);
    assert.equal(state.rows[0].id, reservaId);
  }
});

test('mudança concorrente de status impede substituição', async () => {
  const { state, comprar } = fixture([reserva()]);
  state.onCancel = () => { state.rows[0].status = 'pago'; };
  await assert.rejects(comprar({ substituirReservaId: reservaId }), /mudou durante/);
  assert.equal(state.rows[0].id, reservaId);
  assert.equal(state.pixCalls, 0);
});

test('havendo várias reservas, apenas a escolhida é substituída', async () => {
  const outra = { ...reserva(), id: '44444444-4444-4444-8444-444444444444', codigo_referencia: 'BOL-OUTRA' };
  const { state, comprar } = fixture([reserva(), outra]);
  assert.equal((await comprar({})).reservas.length, 2);
  await comprar({ substituirReservaId: reservaId });
  assert.deepEqual(state.rows.find(row => row.id === outra.id), outra);
  assert.equal(state.rows.length, 2);
});

test('cancelamento real do provedor: aprovações, falhas e confirmação do PUT', async () => {
  const { cancelarPixPendente } = loadTs('src/lib/pix-bolao.server.ts');
  const originalFetch = global.fetch;
  const originalToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  process.env.MERCADOPAGO_ACCESS_TOKEN = 'token-de-teste';
  try {
    for (const status of ['approved', 'authorized', 'cancelled', 'rejected', 'pending', 'in_process']) {
      const calls = [];
      global.fetch = async (_url, options) => {
        calls.push(options);
        return Response.json({ external_reference: reservaId, status: options.method === 'PUT' ? 'cancelled' : status });
      };
      assert.equal(await cancelarPixPendente('123', reservaId), ['approved', 'authorized'].includes(status) ? 'pago' : 'cancelado');
      assert.equal(calls.length, ['pending', 'in_process'].includes(status) ? 2 : 1);
      if (calls.length === 2) assert.deepEqual(JSON.parse(calls[1].body), { status: 'cancelled' });
    }
    global.fetch = async () => new Response('', { status: 503 });
    await assert.rejects(cancelarPixPendente('123', reservaId), /verificar o pagamento/);
    global.fetch = async () => Response.json({ external_reference: 'outra-reserva', status: 'pending' });
    await assert.rejects(cancelarPixPendente('123', reservaId), /não corresponde/);
    global.fetch = async (_url, options) => options.method === 'PUT'
      ? new Response('', { status: 409 })
      : Response.json({ external_reference: reservaId, status: 'pending' });
    await assert.rejects(cancelarPixPendente('123', reservaId), /reserva foi mantida/);
    global.fetch = async () => Response.json({ external_reference: reservaId, status: 'pending' });
    await assert.rejects(cancelarPixPendente('123', reservaId), /cancelamento do PIX não foi confirmado/);
  } finally {
    global.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    else process.env.MERCADOPAGO_ACCESS_TOKEN = originalToken;
  }
});


test('retomar PIX válido mantém o código, a quantidade e a cobrança existentes', async () => {
  const original = { ...reserva(), pix_data: { qrCode: 'pix-antigo' }, created_at: new Date().toISOString() };
  const { state, retomar } = fixture([original]);
  const res = await retomar();
  assert.equal(res.id, reservaId);
  assert.equal(res.quantidade_cotas, 3);
  assert.equal(res.pix_data.qrCode, 'pix-antigo');
  assert.equal(state.rows.length, 1);
  assert.equal(state.pixCalls, 0);
});

test('retomar PIX vencido ou cancelado reemite na mesma reserva', async () => {
  for (const cancelled of [false, true]) {
    const original = { ...reserva(), pix_data: { qrCode: 'pix-antigo' }, created_at: new Date(Date.now() - (cancelled ? 0 : 31 * 60 * 1000)).toISOString() };
    const { state, retomar } = fixture([original]);
    state.paymentStatus = cancelled ? 'cancelled' : 'pending';
    const res = await retomar();
    assert.equal(res.id, reservaId);
    assert.equal(res.codigo_referencia, 'BOL-ANTIGA');
    assert.equal(res.quantidade_cotas, 3);
    assert.equal(res.pix_data.qrCode, 'novo-pix');
    assert.equal(state.rows.length, 1);
    assert.equal(state.pixInputs[0].reservaId, reservaId);
    assert.equal(state.pixInputs[0].valor, 22.5);
  }
});

test('retomar pagamento aprovado confirma a reserva sem emitir outro PIX', async () => {
  const { state, retomar } = fixture([reserva()]);
  state.paymentStatus = 'approved';
  const res = await retomar();
  assert.equal(res.status, 'pago');
  assert.equal(res.id, reservaId);
  assert.equal(state.pixCalls, 0);
});
