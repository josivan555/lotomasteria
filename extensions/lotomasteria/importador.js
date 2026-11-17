const C = globalThis.LotoMasterCore;
const $ = (id) => document.getElementById(id);
const KEY = "LM_SESSION";
let arquivo = null, tabId = null, pagina = null, sessao = null;
let conectado = false, connecting = false;
for (const [id, cfg] of Object.entries(C.modalidades)) {
  const option = document.createElement("option"); option.value = id; option.textContent = cfg.nome; $("modalidade").appendChild(option);
}
function error(e) { $("erro").textContent = e?.message || String(e); }
function render() {
  const busy = conectado && !!sessao?.executando;
  $("iniciar").disabled = !conectado || !arquivo || !!sessao || !$("confirmar").checked;
  $("retomar").disabled = !conectado || !sessao || busy || sessao.incerto || sessao.indice >= sessao.jogos.length || !$("confirmar").checked;
  $("pausar").disabled = !conectado || !busy;
  $("encerrar").disabled = busy;
  $("relatorio").disabled = !sessao;
  $("incerto").hidden = !sessao?.incerto || busy;
  $("progresso").max = sessao?.jogos.length || arquivo?.jogos.length || 1;
  $("progresso").value = sessao?.indice || 0;
  $("estado").textContent = sessao ? `${sessao.indice}/${sessao.jogos.length} inclusões confirmadas · ${conectado ? sessao.mensagem : "Reconecte à aba original para verificar o estado da sessão."}` : "Aguardando início do preenchimento.";
  for (const id of ["arquivo", "texto", "modalidade", "validar", "abas", "concurso", "conectar"]) $(id).disabled = busy;
}
async function send(tipo, data = {}) {
  if (!tabId) throw Error("Conecte à aba da Caixa primeiro.");
  const result = await chrome.tabs.sendMessage(tabId, { origem: "lotomasteria", tipo, ...data });
  if (!result?.ok) throw Error(result?.erro || "A extensão perdeu a conexão com a aba. Reconecte antes de continuar.");
  if (Object.hasOwn(result, "sessao")) sessao = result.sessao;
  render();
  return result;
}
async function refreshTabs() {
  const before = $("abas").value;
  const tabs = await chrome.tabs.query({ url: "https://www.loteriasonline.caixa.gov.br/*" });
  $("abas").replaceChildren();
  for (const tab of tabs) {
    const option = document.createElement("option"); option.value = String(tab.id); option.textContent = tab.title || "Portal da Caixa"; $("abas").appendChild(option);
  }
  if (tabs.some((tab) => String(tab.id) === before)) $("abas").value = before;
}
async function connect() {
  if (connecting) return;
  connecting = true;
  try {
    $("erro").textContent = "";
    await refreshTabs();
    const value = $("abas").value;
    if (!value) throw Error("Abra uma aba da Caixa e entre no volante da modalidade desejada.");
    tabId = Number(value);
    await chrome.scripting.executeScript({ target: { tabId }, files: ["core.js", "content.js"] });
    const result = await send("STATUS");
    pagina = result.pagina;
    const saved = (await chrome.storage.local.get(KEY))[KEY];
    if (!result.sessao && saved) {
      if (saved.tabId !== tabId) throw Error("A sessão salva pertence a outra aba. Selecione essa aba; se ela foi fechada, use Encerrar sessão após conferir o carrinho.");
      await send("RESTAURAR", { tabId });
    }
    conectado = true;
    $("conexao").textContent = `${C.modalidades[pagina.loteria].nome} · Concurso ${pagina.concurso} · ${pagina.carrinho} item(ns) no carrinho.`;
  } catch (e) { conectado = false; $("conexao").textContent = "Sem conexão com um volante válido."; error(e); }
  finally { connecting = false; render(); }
}
function validarArquivo() {
  arquivo = null;
  try {
    $("erro").textContent = "";
    arquivo = C.importar($("texto").value, $("modalidade").value || undefined);
    $("modalidade").value = arquivo.loteria;
    $("resumo").textContent = `${C.modalidades[arquivo.loteria].nome}: ${arquivo.jogos.length} jogo(s).` + (arquivo.repetidos ? ` Atenção: ${arquivo.repetidos} aposta(s) repetida(s), mantida(s) no arquivo.` : " Nenhum jogo repetido.");
    $("previa").textContent = arquivo.jogos.map((j, i) => `${String(i + 1).padStart(3, "0")}  ${C.linha(j)}`).join("\n");
  } catch (e) { $("resumo").textContent = "Arquivo não validado."; $("previa").textContent = ""; error(e); }
  $("confirmar").checked = false;
  render();
}
function invalidate() { arquivo = null; $("confirmar").checked = false; $("resumo").textContent = "O conteúdo mudou. Clique em Conferir arquivo."; $("previa").textContent = ""; render(); }
$("texto").addEventListener("input", invalidate);
$("modalidade").addEventListener("change", invalidate);
$("arquivo").addEventListener("change", async () => {
  invalidate();
  try {
    const file = $("arquivo").files[0];
    if (!file) return;
    if (file.size > 1000000) throw Error("Escolha um arquivo de até 1 MB.");
    $("texto").value = await file.text();
    validarArquivo();
  } catch (e) { error(e); }
});
$("validar").addEventListener("click", validarArquivo);
$("confirmar").addEventListener("change", render);
$("abas").addEventListener("change", () => { conectado = false; $("confirmar").checked = false; render(); });
$("conectar").addEventListener("click", connect);
$("abrir").addEventListener("click", () => chrome.tabs.create({ url: "https://www.loteriasonline.caixa.gov.br/" }));
$("iniciar").addEventListener("click", async () => {
  try {
    if (!arquivo || !$("confirmar").checked) throw Error("Confira o arquivo e confirme as informações antes de iniciar.");
    const concurso = Number($("concurso").value);
    if (!Number.isInteger(concurso) || concurso <= 0) throw Error("Digite o número do concurso desejado.");
    $("erro").textContent = "";
    await send("INICIAR", { ...arquivo, concurso, limite: Number($("limite").value), tabId });
  } catch (e) { error(e); }
});
$("retomar").addEventListener("click", async () => {
  try { $("erro").textContent = ""; await send("RETOMAR", { limite: Number($("limite").value) }); } catch (e) { error(e); }
});
$("pausar").addEventListener("click", async () => {
  try { await send("PAUSAR"); } catch (e) { error(e); }
});
for (const [id, entrou] of [["entrou", true], ["nao-entrou", false]]) $(id).addEventListener("click", async () => {
  if (!confirm(`Você conferiu o jogo ${sessao?.indice + 1} no carrinho e confirma que ele ${entrou ? "entrou" : "não entrou"}?`)) return;
  try { $("erro").textContent = ""; await send("RECONCILIAR", { entrou }); } catch (e) { error(e); }
});
$("encerrar").addEventListener("click", async () => {
  if (!confirm("Encerrar esta sessão? Os jogos já incluídos permanecerão no carrinho. Confira-os antes de importar o mesmo arquivo novamente.")) return;
  try {
    // Só apaga progresso local se a aba de origem já não existe. Nunca encerra uma execução viva em outra aba.
    const saved = (await chrome.storage.local.get(KEY))[KEY];
    if (saved) {
      let live;
      try { live = await chrome.tabs.get(saved.tabId); } catch { live = null; }
      if (live && conectado && saved.tabId === tabId) await send("ENCERRAR");
      else if (live) throw Error("Conecte à aba original da sessão para pausar e encerrar.");
      else await chrome.storage.local.remove(KEY);
    }
    sessao = null; $("confirmar").checked = false; render();
  } catch (e) { error(e); }
});
$("relatorio").addEventListener("click", () => {
  if (!sessao) return;
  const relatorio = { formato: "lotomasteria-relatorio", versao: 1, aviso: "Inclusões no carrinho; não é comprovante de aposta paga.", ...sessao };
  const url = URL.createObjectURL(new Blob([JSON.stringify(relatorio, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = `lotomasteria-relatorio-${sessao.id}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[KEY]) { sessao = changes[KEY].newValue || null; render(); }
});
chrome.tabs.onRemoved.addListener((id) => {
  if (id === tabId) { conectado = false; $("conexao").textContent = "A aba da Caixa foi fechada. Confira o progresso salvo."; render(); }
});
chrome.tabs.onUpdated.addListener((id, change) => {
  if (id === tabId && change.status === "loading") { conectado = false; $("conexao").textContent = "A página foi recarregada ou mudou. Reconecte antes de continuar."; render(); }
});
(async () => {
  sessao = (await chrome.storage.local.get(KEY))[KEY] || null;
  await refreshTabs();
  if (sessao && Array.from($("abas").options).some((o) => o.value === String(sessao.tabId))) $("abas").value = String(sessao.tabId);
  // Sem preenchimento automático na abertura. A conexão é iniciada pelo usuário.
  render();
})().catch(error);
