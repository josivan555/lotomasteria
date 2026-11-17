import test from 'node:test';
import assert from 'node:assert/strict';
import '../core.js';
import { serializarJogos } from '../../../src/lib/jogos-export.ts';
const C = globalThis.LotoMasterCore;
const mega = { id: 'megasena', nome: 'Mega-Sena', total: 60, tamanhoMin: 6, tamanhoMax: 20 };
const jogo = { dezenas: [1,2,3,4,5,60] };

test('lê exatamente os TXT e JSON gerados pelo site, inclusive 50 jogos', () => {
  const games = Array.from({length:50}, () => jogo);
  for (const f of ['txt','json']) {
    const result = C.importar(serializarJogos(mega, games, f), f === 'txt' ? 'megasena' : undefined);
    assert.equal(result.jogos.length, 50);
    assert.equal(result.repetidos, 49);
    assert.deepEqual(result.jogos[0], jogo);
  }
});
test('preserva complementos e 00 entre o exportador do site e a extensão', () => {
  for (const [id, games, total, min] of [
    ['diadesorte', [{dezenas:[1,2,3,4,5,6,7],mes:12}],31,7],
    ['timemania', [{dezenas:[1,2,3,4,5,6,7,8,9,10],time:'FLAMENGO/RJ'}],80,10],
    ['lotomania', [{dezenas:Array.from({length:50},(_,i)=>i+51)}],100,50],
  ]) for (const f of ['txt','json']) {
    const cfg = {id,nome:id,total,tamanhoMin:min,tamanhoMax:min};
    const result = C.importar(serializarJogos(cfg, games, f), id);
    if(id === 'diadesorte') assert.equal(result.jogos[0].mes_sorte,12);
    if(id === 'timemania') assert.equal(result.jogos[0].time_coracao,'FLAMENGO/RJ');
    if(id === 'lotomania') assert.equal(result.jogos[0].dezenas[0],0);
  }
});
test('rejeita CSV antigo, linhas parcialmente válidas, modalidades diferentes e versões desconhecidas', () => {
  for(const txt of ['score,d1,d2\n99,1,2', '01 02 03 04 05 06 lixo', '01 02 03 04 05 05', '', '01 02 03 04 05 61']) assert.throws(()=>C.importar(txt,'megasena'));
  const doc = JSON.parse(serializarJogos(mega,[jogo],'json'));
  assert.throws(()=>C.importar(JSON.stringify(doc),'quina'),/difere/);
  doc.versao=2; assert.throws(()=>C.importar(JSON.stringify(doc)),/versão/);
  doc.versao=1; doc.quantidade=10; assert.throws(()=>C.importar(JSON.stringify(doc)),/quantidade/);
});
test('rejeita arquivos grandes, lotes maiores que 500 e complementos ausentes', () => {
  assert.throws(()=>C.importar('x'.repeat(1000001),'megasena'),/1 MB/);
  assert.throws(()=>C.validar('megasena',Array(501).fill(jogo)),/500/);
  assert.throws(()=>C.importar('01 02 03 04 05 06 07','diadesorte'),/Mês/);
  assert.throws(()=>C.importar('01 02 03 04 05 06 | mes=01','megasena'),/complemento/);
});
