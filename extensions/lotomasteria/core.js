/* Compartilhado pelo importador, pelo script do volante e pelos testes. */
(() => {
  const modalidades = {
    lotofacil: { nome: "Lotofácil", rota: "lotofacil", min: 15, max: 20, total: 25 },
    megasena: { nome: "Mega-Sena", rota: "mega-sena", min: 6, max: 20, total: 60 },
    quina: { nome: "Quina", rota: "quina", min: 5, max: 15, total: 80 },
    lotomania: { nome: "Lotomania", rota: "lotomania", min: 50, max: 50, total: 99 },
    duplasena: { nome: "Dupla Sena", rota: "dupla-sena", min: 6, max: 15, total: 50 },
    timemania: { nome: "Timemania", rota: "timemania", min: 10, max: 10, total: 80 },
    diadesorte: { nome: "Dia de Sorte", rota: "dia-de-sorte", min: 7, max: 15, total: 31 },
  };
  const normalizar = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().replace(/\s+/g, " ");
  const pad = (n) => String(n).padStart(2, "0");
  function validar(loteria, jogos) {
    const cfg = modalidades[loteria];
    if (!cfg) throw Error("Modalidade não suportada.");
    if (!Array.isArray(jogos) || jogos.length < 1 || jogos.length > 500) throw Error("Importe de 1 a 500 jogos por arquivo.");
    return jogos.map((j, i) => {
      const erro = (s) => { throw Error(`Jogo ${i + 1}: ${s}`); };
      if (!j || !Array.isArray(j.dezenas)) return erro("dezenas ausentes.");
      const d = j.dezenas.map((n) => loteria === "lotomania" && n === 100 ? 0 : n);
      if (d.length < cfg.min || d.length > cfg.max) return erro(`use de ${cfg.min} a ${cfg.max} dezenas.`);
      if (d.some((n) => !Number.isInteger(n) || n < (loteria === "lotomania" ? 0 : 1) || n > cfg.total)) return erro("há dezenas inválidas.");
      if (new Set(d).size !== d.length) return erro("há dezenas repetidas na mesma aposta.");
      const r = { dezenas: d.slice().sort((a, b) => a - b) };
      if (loteria === "diadesorte") {
        const m = j.mes_sorte ?? j.mes ?? j.metadata?.mes_sorte;
        if (!Number.isInteger(m) || m < 1 || m > 12) return erro("Mês de Sorte ausente ou inválido.");
        r.mes_sorte = m;
      }
      if (loteria === "timemania") {
        const t = j.time_coracao ?? j.time ?? j.metadata?.time_coracao;
        if (typeof t !== "string" || !t.trim() || /[\n\r|]/.test(t)) return erro("Time do Coração ausente ou inválido.");
        r.time_coracao = t.trim();
      }
      return r;
    });
  }
  function importar(texto, escolhida) {
    if (typeof texto !== "string" || texto.length > 1000000) throw Error("O arquivo deve ter até 1 MB.");
    const s = texto.replace(/^\uFEFF/, "").trim();
    let loteria = escolhida, jogos;
    if (s.startsWith("{") || s.startsWith("[")) {
      let doc;
      try { doc = JSON.parse(s); } catch { throw Error("Arquivo JSON inválido."); }
      if (!doc || doc.formato !== "lotomasteria-jogos" || doc.versao !== 1) throw Error("Use o JSON exportado pelo LotoMasteria (versão 1).");
      if (escolhida && doc.loteria !== escolhida) throw Error("A modalidade escolhida difere da modalidade do arquivo.");
      loteria = doc.loteria;
      jogos = doc.jogos;
      if (doc.quantidade !== jogos?.length) throw Error("A quantidade declarada no arquivo não corresponde aos jogos.");
    } else {
      if (!modalidades[loteria]) throw Error("Escolha a modalidade antes de importar TXT.");
      jogos = s.split(/\r?\n/).map((l, i) => {
        const match = l.trim().match(/^((?:\d{1,3}[ \t]+)*\d{1,3})(?:[ \t]*\|[ \t]*(mes|time)=(.+))?$/);
        if (!match) throw Error(`Linha ${i + 1}: use apenas dezenas separadas por espaços e o complemento exportado pelo LotoMasteria.`);
        const j = { dezenas: match[1].split(/\s+/).map(Number) };
        if (match[2] === "mes") {
          if (loteria !== "diadesorte" || !/^\d{1,2}$/.test(match[3])) throw Error(`Linha ${i + 1}: complemento de mês inválido.`);
          j.mes_sorte = Number(match[3]);
        }
        if (match[2] === "time") {
          if (loteria !== "timemania") throw Error(`Linha ${i + 1}: complemento de time inválido.`);
          j.time_coracao = match[3];
        }
        return j;
      });
    }
    const apostas = validar(loteria, jogos);
    const repetidos = apostas.length - new Set(apostas.map((j) => JSON.stringify(j))).size;
    return { loteria, jogos: apostas, repetidos };
  }
  function linha(j) {
    return j.dezenas.map(pad).join(" ") + (j.mes_sorte ? ` | mes=${pad(j.mes_sorte)}` : j.time_coracao ? ` | time=${j.time_coracao}` : "");
  }
  globalThis.LotoMasterCore = Object.freeze({ modalidades, normalizar, pad, validar, importar, linha });
})();
