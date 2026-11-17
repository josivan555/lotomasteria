import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const html=readFileSync(new URL('../importador.html',import.meta.url),'utf8');
const core=readFileSync(new URL('../core.js',import.meta.url),'utf8');
const script=readFileSync(new URL('../importador.js',import.meta.url),'utf8');
const wait=()=>new Promise(r=>setTimeout(r,1));
function ui(saved=null){
  const dom=new JSDOM(html,{url:'https://extension.test/importador.html',runScripts:'outside-only'});
  const w=dom.window; let sent=0;
  w.chrome={storage:{local:{get:async()=>({LM_SESSION:saved})},onChanged:{addListener(){}}},tabs:{query:async()=>[{id:7,title:'Lotofácil: Aposte'}],onRemoved:{addListener(){}},onUpdated:{addListener(){}},sendMessage:async()=>{sent++;return {ok:true}}},scripting:{executeScript:async()=>{}}};
  w.eval(core);w.eval(script);
  return {dom,w,d:w.document,get sent(){return sent}};
}
test('abertura não inicia preenchimento e importação só libera com conexão e confirmação',async()=>{
  const f=ui();try{
    await wait();assert.equal(f.sent,0);assert.equal(f.d.getElementById('iniciar').disabled,true);
    const text=f.d.getElementById('texto'),select=f.d.getElementById('modalidade');
    select.value='megasena';text.value='01 02 03 04 05 06';f.d.getElementById('validar').click();
    assert.match(f.d.getElementById('resumo').textContent,/1 jogo/);
    assert.match(f.d.getElementById('previa').textContent,/01 02 03 04 05 06/);
    assert.equal(f.d.getElementById('iniciar').disabled,true);
    text.value='01 02';text.dispatchEvent(new f.w.Event('input'));
    assert.equal(f.d.getElementById('previa').textContent,'');
    f.d.getElementById('validar').click();assert.match(f.d.getElementById('erro').textContent,/dezenas/);
  }finally{f.dom.window.close();}
});
test('progresso salvo como executando não bloqueia a reconexão após reabrir a interface',async()=>{
  const f=ui({executando:true,indice:2,jogos:[{}, {}, {}],tabId:7,mensagem:'Em execução'});
  try{await wait();assert.equal(f.d.getElementById('conectar').disabled,false);assert.match(f.d.getElementById('estado').textContent,/Reconecte/);assert.equal(f.sent,0);}finally{f.dom.window.close();}
});
