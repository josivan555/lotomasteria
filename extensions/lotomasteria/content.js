/* Mundo isolado da extensão. Usa apenas controles do DOM; nunca acessa Angular, cookies ou APIs de pagamento. */
(() => {
  if (globalThis.__lotoMasterImporter) return;
  globalThis.__lotoMasterImporter = true;
  const C = globalThis.LotoMasterCore;
  const KEY = "LM_SESSION";
  let session = null;
  let commandQueue = Promise.resolve();
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const byId = (id) => document.getElementById(id);
  const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  function enabled(el) {
    return el && !el.disabled && el.getAttribute("aria-disabled") !== "true" && !el.classList.contains("disabled");
  }
  function click(el) {
    if (!enabled(el)) throw Error("Um controle do volante está indisponível. Confira a página da Caixa.");
    el.click();
  }
  function counter(id) {
    const box = byId(id)?.parentElement?.parentElement;
    const text = box?.querySelector(":scope > span")?.textContent?.trim();
    if (!/^\d+$/.test(text || "")) throw Error("Não foi possível ler a quantidade do volante.");
    return Number(text);
  }
  function cart() {
    const text = byId("carrinho")?.textContent?.trim();
    if (!/^\d+$/.test(text || "")) throw Error("Não foi possível confirmar a quantidade de itens do carrinho.");
    return Number(text);
  }
  function route() {
    if (location.origin !== "https://www.loteriasonline.caixa.gov.br" || location.pathname !== "/silce-web/") throw Error("Use o portal oficial da Caixa.");
    const rota = location.hash.replace(/^#\//, "").split("/")[0];
    const loteria = Object.keys(C.modalidades).find((key) => C.modalidades[key].rota === rota);
    if (!loteria || !byId("n01") || !byId("colocarnocarrinho")) throw Error("Abra um volante de modalidade suportada na Caixa.");
    return loteria;
  }
  function contest() {
    const matches = Array.from(document.querySelectorAll("h3")).map((el) => el.textContent.match(/Concurso\s*n[ºo°.]?\s*(\d+)/i)).filter(Boolean);
    if (matches.length !== 1) throw Error("Não foi possível identificar o concurso do volante.");
    return Number(matches[0][1]);
  }
  function blockers() {
    const dialog = Array.from(document.querySelectorAll('.modal.in, .modal.show, [role="dialog"]')).find(visible);
    if (dialog) throw Error("A Caixa abriu uma mensagem. Leia e resolva o aviso antes de continuar.");
    const alert = Array.from(document.querySelectorAll(".alert-danger, .alert-warning")).find((el) => visible(el) && el.textContent.trim());
    if (alert) throw Error("A Caixa está exibindo um aviso. Confira a página antes de continuar.");
  }
  function selected() {
    return Array.from(document.querySelectorAll('a[id^="n"].selected')).filter((el) => /^n\d{2}$/.test(el.id)).map((el) => Number(el.id.slice(1))).sort((a, b) => a - b);
  }
  function extras(jogo) {
    if (jogo.mes_sorte) {
      const names = ["JANEIRO", "FEVEREIRO", "MARCO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
      const items = Array.from(document.querySelectorAll('li[ng-repeat="mes in listaMeses"]'));
      const match = items.filter((el) => C.normalizar(el.querySelector(".nomeMes")?.textContent || "") === names[jogo.mes_sorte - 1]);
      if (match.length !== 1) throw Error("O Mês de Sorte não foi encontrado no volante.");
      return match[0];
    }
    if (jogo.time_coracao) {
      const matches = Array.from(document.querySelectorAll('[name="btnTime"]')).filter((el) => C.normalizar(el.parentElement?.querySelector(".nomeTime")?.textContent || "") === C.normalizar(jogo.time_coracao));
      if (matches.length !== 1) throw Error(`Time não encontrado ou ambíguo: ${jogo.time_coracao}. Não será substituído por outro.`);
      return matches[0];
    }
    return null;
  }
  function guard() {
    blockers();
    if (route() !== session.loteria || contest() !== session.concurso || location.hash !== session.hash) throw Error("A modalidade ou o concurso mudou. O preenchimento foi interrompido.");
    if (counter("aumentarteimosinha") !== 0) throw Error("Defina Teimosinhas como zero na Caixa antes de continuar.");
    if (byId("apostaEspelho")?.checked) throw Error("Desmarque Aposta Espelho na Caixa antes de continuar.");
    if (document.querySelector('input[ng-model="escolherMesSurpresinha"]')?.checked || document.querySelector('input[ng-model="escolherTimeSurpresinha"]')?.checked) {
      throw Error("Desmarque a escolha aleatória de mês ou time na Caixa antes de continuar.");
    }
  }
  function checkpoint() {
    guard();
    if (session.pauseRequested) throw Error("PAUSA_SOLICITADA");
  }
  async function waitFor(fn, ms = 10000) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      blockers();
      const result = fn();
      if (result) return result;
      await sleep(100);
    }
    throw Error("A Caixa não confirmou a operação a tempo. Confira o volante e o carrinho.");
  }
  async function save() {
    session.atualizadoEm = new Date().toISOString();
    await chrome.storage.local.set({ [KEY]: JSON.parse(JSON.stringify(session)) });
  }
  function probe() {
    blockers();
    return { loteria: route(), concurso: contest(), carrinho: cart(), hash: location.hash };
  }
  async function prepare(jogo) {
    checkpoint();
    click(byId("limparvolante"));
    await waitFor(() => selected().length === 0);
    if (byId("aumentarnumero")) {
      for (let i = 0; i < 25; i++) {
        checkpoint();
        const before = counter("aumentarnumero");
        if (before === jogo.dezenas.length) break;
        click(byId(before < jogo.dezenas.length ? "aumentarnumero" : "diminuirnumero"));
        await waitFor(() => counter("aumentarnumero") !== before);
      }
      if (counter("aumentarnumero") !== jogo.dezenas.length) throw Error("A quantidade de dezenas no volante não corresponde ao jogo.");
    } else if (jogo.dezenas.length !== C.modalidades[session.loteria].min) {
      throw Error("Controle de quantidade de dezenas não encontrado.");
    }
    for (const dezena of jogo.dezenas) {
      checkpoint();
      const el = byId(`n${C.pad(dezena)}`);
      if (!el || el.textContent.trim() !== C.pad(dezena)) throw Error(`Controle da dezena ${C.pad(dezena)} não identificado.`);
      click(el);
      await waitFor(() => el.classList.contains("selected"));
    }
    const extra = extras(jogo);
    if (extra) {
      checkpoint();
      if (!extra.classList.contains("active")) click(extra);
      await waitFor(() => extra.classList.contains("active"));
    }
    checkpoint();
    if (JSON.stringify(selected()) !== JSON.stringify(jogo.dezenas)) throw Error("As dezenas selecionadas na Caixa não correspondem ao arquivo.");
    if (byId("aumentarnumero") && counter("aumentarnumero") !== jogo.dezenas.length) throw Error("A quantidade de dezenas mudou durante o preenchimento.");
    if (extra && !extra.classList.contains("active")) throw Error("O complemento da aposta não foi confirmado.");
  }
  async function run(limite) {
    const end = Math.min(session.indice + limite, session.jogos.length);
    try {
      while (session.indice < end) {
        session.fase = "preparando";
        session.mensagem = `Preenchendo jogo ${session.indice + 1} de ${session.jogos.length}.`;
        await save();
        checkpoint();
        if (cart() !== session.ultimoCarrinho) throw Error("O carrinho mudou fora da extensão. Confira os itens antes de retomar.");
        const jogo = session.jogos[session.indice];
        await prepare(jogo);
        const before = cart();
        if (before !== session.ultimoCarrinho) throw Error("O carrinho mudou durante o preenchimento. Confira a página.");
        // Grava a incerteza ANTES do clique: uma interrupção nunca provoca repetição silenciosa.
        session.fase = "enviando";
        session.incerto = true;
        await save();
        checkpoint();
        click(byId("colocarnocarrinho"));
        session.fase = "confirmando";
        await save();
        await waitFor(() => {
          guard();
          const after = cart();
          if (after > before + 1 || after < before) throw Error("A quantidade do carrinho mudou de forma inesperada. Confira o último jogo.");
          return after === before + 1;
        });
        await sleep(300);
        guard();
        if (cart() !== before + 1) throw Error("A inclusão no carrinho não permaneceu confirmada.");
        session.incerto = false;
        session.indice++;
        session.ultimoCarrinho = before + 1;
        session.fase = "incluido";
        await save();
        if (session.pauseRequested) break;
        if (session.indice < end) await sleep(900);
      }
      session.fase = session.indice === session.jogos.length ? "concluido" : "pausado";
      session.mensagem = session.fase === "concluido" ? "Todos os jogos foram incluídos no carrinho. Confira e pague no portal da Caixa." : "Lote encerrado. Confira o carrinho antes de continuar.";
    } catch (e) {
      session.fase = "pausado";
      session.mensagem = e.message === "PAUSA_SOLICITADA" ? "Preenchimento pausado." : e.message;
    } finally {
      session.executando = false;
      session.pauseRequested = false;
      await save();
    }
  }
  function limit(value) {
    if (!Number.isInteger(value) || value < 1 || value > 500) throw Error("Quantidade de lote inválida.");
    return value;
  }
  async function handle(msg) {
    if (msg.tipo === "STATUS") return { pagina: probe(), sessao: session };
    if (msg.tipo === "PAUSAR") {
      if (session?.executando) { session.pauseRequested = true; await save(); }
      return { sessao: session };
    }
    if (msg.tipo === "ENCERRAR") {
      if (session?.executando) throw Error("Pause o preenchimento antes de encerrar a sessão.");
      session = null;
      await chrome.storage.local.remove(KEY);
      return {};
    }
    if (msg.tipo === "RESTAURAR") {
      if (session) return { sessao: session };
      const saved = (await chrome.storage.local.get(KEY))[KEY];
      if (!saved || saved.tabId !== msg.tabId) throw Error("Não há sessão desta aba para restaurar.");
      saved.jogos = C.validar(saved.loteria, saved.jogos);
      if (!Number.isInteger(saved.indice) || saved.indice < 0 || saved.indice > saved.jogos.length) throw Error("Progresso salvo inválido.");
      session = { ...saved, executando: false, pauseRequested: false, fase: "pausado", incerto: !!saved.incerto || ["enviando", "confirmando"].includes(saved.fase), mensagem: "Sessão restaurada após interrupção. Confira a página antes de continuar." };
      await save();
      return { sessao: session };
    }
    if (msg.tipo === "RECONCILIAR") {
      if (!session || session.executando || !session.incerto) throw Error("Não há inclusão pendente de conferência.");
      guard();
      if (typeof msg.entrou !== "boolean") throw Error("Informe o resultado da conferência.");
      const expected = session.ultimoCarrinho + (msg.entrou ? 1 : 0);
      if (cart() !== expected) throw Error("A contagem do carrinho não corresponde à opção escolhida. Confira os itens.");
      session.conferenciasManuais = [...(session.conferenciasManuais || []), { jogo: session.indice + 1, entrou: msg.entrou, data: new Date().toISOString() }];
      if (msg.entrou) session.indice++;
      session.ultimoCarrinho = expected;
      session.incerto = false;
      session.mensagem = "Conferência manual registrada. Você pode continuar.";
      await save();
      return { sessao: session };
    }
    if (msg.tipo === "INICIAR") {
      if (session) throw Error("Encerre a sessão anterior antes de importar outro arquivo.");
      const old = (await chrome.storage.local.get(KEY))[KEY];
      if (old) throw Error("Há uma sessão salva. Conecte à aba anterior e encerre ou retome essa sessão.");
      const pagina = probe();
      if (pagina.loteria !== msg.loteria || pagina.concurso !== msg.concurso) throw Error("Modalidade ou concurso diferente do volante da Caixa.");
      const jogos = C.validar(msg.loteria, msg.jogos);
      const lote = limit(msg.limite);
      session = { id: crypto.randomUUID(), tabId: msg.tabId, loteria: msg.loteria, concurso: msg.concurso, hash: pagina.hash, jogos, indice: 0, ultimoCarrinho: pagina.carrinho, carrinhoInicial: pagina.carrinho, incerto: false, executando: true, pauseRequested: false, fase: "preparando", mensagem: "Iniciando preenchimento.", iniciadoEm: new Date().toISOString() };
      await save();
      void run(lote);
      return { sessao: session };
    }
    if (msg.tipo === "RETOMAR") {
      if (!session || session.executando) throw Error("Não há sessão pausada para continuar.");
      if (session.incerto) throw Error("Confira primeiro a inclusão pendente.");
      guard();
      if (cart() !== session.ultimoCarrinho) throw Error("O carrinho mudou desde a pausa. Confira os itens; a retomada automática foi bloqueada.");
      if (session.indice >= session.jogos.length) throw Error("Todos os jogos já foram incluídos.");
      const lote = limit(msg.limite);
      session.executando = true;
      session.pauseRequested = false;
      await save();
      void run(lote);
      return { sessao: session };
    }
    throw Error("Comando não reconhecido.");
  }
  chrome.runtime.onMessage.addListener((msg, sender, respond) => {
    if (sender.id !== chrome.runtime.id || msg?.origem !== "lotomasteria") return;
    commandQueue = commandQueue.then(() => handle(msg)).then((data) => respond({ ok: true, ...data }), (e) => respond({ ok: false, erro: e.message }));
    return true;
  });
})();
