import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
const core = readFileSync(new URL('../core.js',import.meta.url),'utf8');
const content = readFileSync(new URL('../content.js',import.meta.url),'utf8');
const pause = ms => new Promise(r=>setTimeout(r,ms));
function fixture(opts={}) {
  const id=opts.loteria||'megasena';
  const routes={megasena:'mega-sena',diadesorte:'dia-de-sorte',timemania:'timemania',lotomania:'lotomania'};
  const min={megasena:6,diadesorte:7,timemania:10,lotomania:50}[id];
  const total={megasena:60,diadesorte:31,timemania:80,lotomania:99}[id];
  const numbers=Array.from({length:total+(id==='lotomania'?1:0)},(_,i)=>id==='lotomania'?i:i+1);
  const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const dom=new JSDOM(`<h3>Concurso nº 1234</h3><a id="carrinho">0</a>
    ${numbers.map(n=>`<a id="n${String(n).padStart(2,'0')}">${String(n).padStart(2,'0')}</a>`).join('')}
    <button id="limparvolante">Limpar</button><div><span id="qtd">${min}</span><div><a id="aumentarnumero">+</a><a id="diminuirnumero">-</a></div></div>
    <div><span id="teimo">${opts.teimo||0}</span><div><a id="aumentarteimosinha">+</a></div></div>
    <input id="apostaEspelho" type="checkbox"><button id="colocarnocarrinho">Adicionar</button>
    ${meses.map(m=>`<li ng-repeat="mes in listaMeses"><span class="nomeMes">${m}</span></li>`).join('')}
    <li><img name="btnTime"><span class="nomeTime">FLAMENGO/RJ</span></li>`, {url:`https://www.loteriasonline.caixa.gov.br/silce-web/#/${routes[id]}`,runScripts:'outside-only'});
  const w=dom.window, d=w.document; let listener, data=opts.saved ? {LM_SESSION:JSON.parse(JSON.stringify(opts.saved))} : {}, sends=0, clock=0;
  w.Date.now=()=>clock+=100;
  w.setTimeout=(fn)=>setTimeout(fn,1);
  w.HTMLElement.prototype.getClientRects=function(){return this.style.display==='none'?[]:[{}]};
  w.chrome={runtime:{id:'test',onMessage:{addListener:fn=>listener=fn}},storage:{local:{
    async get(key){return JSON.parse(JSON.stringify({[key]:data[key]}));},
    async set(value){data={...data,...JSON.parse(JSON.stringify(value))};},
    async remove(key){delete data[key];}
  }}};
  // Angular cancela a navegação dos links de controle no portal real.
  d.addEventListener("click", (e) => { if (e.target.closest("a")) e.preventDefault(); });
  const byId=id=>d.getElementById(id);
  for(const el of d.querySelectorAll('a[id^="n"]')) el.addEventListener('click',()=>{if(!opts.selectionBroken) el.classList.toggle('selected');});
  byId('limparvolante').onclick=()=>{for(const el of d.querySelectorAll('.selected,.active')) el.classList.remove('selected','active');};
  byId('aumentarnumero').onclick=()=>byId('qtd').textContent=Number(byId('qtd').textContent)+1;
  byId('diminuirnumero').onclick=()=>byId('qtd').textContent=Number(byId('qtd').textContent)-1;
  for(const el of d.querySelectorAll('li[ng-repeat],img[name]')) el.onclick=()=>el.classList.add('active');
  byId('apostaEspelho').checked=!!opts.espelho;
  byId('carrinho').textContent=String(opts.cart || 0);
  byId('colocarnocarrinho').onclick=()=>{
    sends++;
    if(opts.changeContest) d.querySelector('h3').textContent='Concurso nº 1235';
    if(opts.confirm!==false) byId('carrinho').textContent=Number(byId('carrinho').textContent)+1;
    opts.onAdd?.({w,d});
  };
  w.eval(core); w.eval(content);
  const send=(tipo,extra={})=>new Promise(resolve=>listener({origem:'lotomasteria',tipo,...extra},{id:'test'},resolve));
  const start=(games,limite=games.length,extra={})=>send('INICIAR',{loteria:id,concurso:1234,jogos:games,limite,tabId:7,...extra});
  async function done(){for(let i=0;i<2000;i++){if(data.LM_SESSION&&!data.LM_SESSION.executando)return data.LM_SESSION; await pause(1);}throw Error('timeout do teste');}
  return {dom,w,d,send,start,done,get saved(){return data.LM_SESSION},get sends(){return sends}};
}
const game={dezenas:[1,2,3,4,5,6]};

test('inclui 50 jogos, confirma cada avanço e não paga',async()=>{
  const f=fixture();
  try{assert.equal((await f.start(Array(50).fill(game))).ok,true);const s=await f.done();assert.equal(s.indice,50,s.mensagem);assert.equal(s.incerto,false);assert.equal(f.sends,50);assert.equal(s.fase,'concluido');}finally{f.dom.window.close();}
});
test('lotes de um jogo retomam do próximo, sem repetir os confirmados',async()=>{
  const f=fixture();try{await f.start([game,game],1);assert.equal((await f.done()).indice,1,JSON.stringify(f.saved));await f.send('RETOMAR',{limite:1});assert.equal((await f.done()).indice,2);assert.equal(f.sends,2);}finally{f.dom.window.close();}
});
test('não envia com concurso incorreto, teimosinha ou espelho',async()=>{
  for(const opts of [{teimo:3},{espelho:true},{}]){const f=fixture(opts);try{
    const r=await f.start([game],1,opts.teimo||opts.espelho?{}:{concurso:999});
    if(r.ok){const s=await f.done();assert.equal(s.indice,0);}
    else assert.match(r.erro,/concurso/);
    assert.equal(f.sends,0);
  }finally{f.dom.window.close();}}
});
test('falta de confirmação não avança nem permite repetição automática',async()=>{
  const f=fixture({confirm:false});try{
    await f.start([game]);const s=await f.done();assert.equal(s.indice,0);assert.equal(s.incerto,true);assert.equal(f.sends,1);
    assert.equal((await f.send('RETOMAR',{limite:1})).ok,false);
    assert.equal((await f.send('RECONCILIAR',{entrou:true})).ok,false);
    assert.equal((await f.send('RECONCILIAR',{entrou:false})).ok,true);
  }finally{f.dom.window.close();}
});
test('mudança do concurso durante inclusão exige conferência e interrompe o lote',async()=>{
  const f=fixture({changeContest:true});try{await f.start([game,game]);const s=await f.done();assert.equal(s.indice,0);assert.equal(s.incerto,true);assert.equal(f.sends,1);}finally{f.dom.window.close();}
});
test('seleção não confirmada nunca é enviada ao carrinho',async()=>{
  const f=fixture({selectionBroken:true});try{await f.start([game]);const s=await f.done();assert.equal(s.indice,0);assert.equal(f.sends,0);assert.equal(s.incerto,false);}finally{f.dom.window.close();}
});
test('ajusta a quantidade de dezenas e preserva mês e time',async()=>{
  for(const [loteria,jogo] of [['megasena',{dezenas:[1,2,3,4,5,6,7,8]}],['diadesorte',{dezenas:[1,2,3,4,5,6,7],mes_sorte:12}],['timemania',{dezenas:[1,2,3,4,5,6,7,8,9,10],time_coracao:'Flamengo/RJ'}],['lotomania',{dezenas:Array.from({length:50},(_,i)=>i)}]]){
    const f=fixture({loteria});try{await f.start([jogo]);assert.equal((await f.done()).indice,1,JSON.stringify(f.saved));assert.equal(f.sends,1);if(loteria==='diadesorte')assert.equal(f.d.querySelector('li.active .nomeMes').textContent,'Dezembro');if(loteria==='timemania')assert.ok(f.d.querySelector('img.active'));}finally{f.dom.window.close();}
  }
});
test('cliques duplos para iniciar não duplicam o lote',async()=>{
  const f=fixture();try{const results=await Promise.all([f.start([game]),f.start([game])]);assert.equal(results.filter(r=>r.ok).length,1);await f.done();assert.equal(f.sends,1);}finally{f.dom.window.close();}
});
test('carrinho modificado durante pausa bloqueia a retomada',async()=>{
  const f=fixture();try{await f.start([game,game],1);await f.done();f.d.getElementById('carrinho').textContent='5';assert.equal((await f.send('RETOMAR',{limite:1})).ok,false);assert.equal(f.sends,1);}finally{f.dom.window.close();}
});


test('restauração de sessão interrompida não reinicia automaticamente nem perde incerteza',async()=>{
  const first=fixture({confirm:false});
  let saved;
  try {await first.start([game]);saved=await first.done();} finally {first.dom.window.close();}
  const f=fixture({saved});
  try {
    const r=await f.send('RESTAURAR',{tabId:7});
    assert.equal(r.ok,true);assert.equal(r.sessao.incerto,true);assert.equal(r.sessao.executando,false);
    assert.equal((await f.send('RETOMAR',{limite:1})).ok,false);assert.equal(f.sends,0);
  } finally {f.dom.window.close();}
});

test('pausa solicitada durante a inclusão aguarda confirmação e preserva o próximo índice',async()=>{
  let f;
  f=fixture({onAdd:()=>{void f.send('PAUSAR');}});
  try {await f.start([game,game]);const s=await f.done();assert.equal(s.indice,1);assert.equal(s.incerto,false);assert.equal(f.sends,1);assert.equal(s.executando,false);}finally{f.dom.window.close();}
});
