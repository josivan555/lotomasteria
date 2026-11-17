import assert from "node:assert/strict";
import test from "node:test";
import { prepararExportacao, serializarJogos } from "../src/lib/jogos-export.ts";

const mega = { id: "megasena", nome: "Mega-Sena", total: 60, tamanhoMin: 6, tamanhoMax: 20 };
const dia = { id: "diadesorte", nome: "Dia de Sorte", total: 31, tamanhoMin: 7, tamanhoMax: 15 };
const time = { id: "timemania", nome: "Timemania", total: 80, tamanhoMin: 10, tamanhoMax: 10 };

test("exporta 50 apostas sem score ou cabeçalho e mantém apostas iguais", () => {
  const jogos = Array.from({ length: 50 }, () => ({ dezenas: [6, 5, 4, 3, 2, 1], score: 99 }));
  const antes = JSON.stringify(jogos);
  const txt = serializarJogos(mega, jogos, "txt");
  assert.equal(txt.split("\n").length, 50);
  assert.ok(txt.split("\n").every((l) => l === "01 02 03 04 05 06"));
  assert.equal(JSON.stringify(jogos), antes);
});

test("preserva tamanhos diferentes e ordem dos jogos", () => {
  const jogos = [{ dezenas: [60, 4, 2, 1, 3, 5] }, { dezenas: [7, 6, 5, 4, 3, 2, 1] }];
  assert.equal(serializarJogos(mega, jogos, "txt"), "01 02 03 04 05 60\n01 02 03 04 05 06 07");
});

test("rejeita jogos incompletos, dezenas inválidas e dezenas duplicadas", () => {
  assert.throws(() => prepararExportacao(mega, []), /pelo menos/);
  for (const dezenas of [[1, 2, 3], [1, 2, 3, 4, 5, 61], [0, 1, 2, 3, 4, 5], [1, 2, 3, 4, 5, 5], [1, 2, 3, 4, 5, 6.5]]) {
    assert.throws(() => prepararExportacao(mega, [{ dezenas }]), /Jogo 1/);
  }
});

test("Lotomania converte 100 para 00 sem alterar os dados originais", () => {
  const cfg = { ...mega, id: "lotomania", total: 100, tamanhoMin: 50, tamanhoMax: 50 };
  const dezenas = Array.from({ length: 50 }, (_, i) => i + 51);
  const txt = serializarJogos(cfg, [{ dezenas }], "txt");
  assert.ok(txt.startsWith("00 51 52"));
  assert.ok(!txt.includes("100"));
  assert.equal(dezenas[49], 100);
});

test("preserva o mês de jogos gerados, salvos e snapshots", () => {
  const dezenas = [1, 2, 3, 4, 5, 6, 7];
  const jogos = [{ dezenas, mes: 1 }, { dezenas, metadata: { mes_sorte: 12 } }, { dezenas, mes_sorte: 6 }];
  const json = JSON.parse(serializarJogos(dia, jogos, "json"));
  assert.equal(json.quantidade, 3);
  assert.equal(json.loteria, "diadesorte");
  assert.deepEqual(json.jogos.map((j) => j.mes_sorte), [1, 12, 6]);
  assert.ok(serializarJogos(dia, jogos, "txt").endsWith("| mes=06"));
  for (const mes of [undefined, 0, 13, 1.5]) {
    assert.throws(() => prepararExportacao(dia, [{ dezenas, mes }]), /Mês de Sorte/);
  }
});

test("preserva o time e impede exportação sem o complemento obrigatório", () => {
  const dezenas = Array.from({ length: 10 }, (_, i) => i + 1);
  const jogos = [{ dezenas, time: "TIME A" }, { dezenas, metadata: { time_coracao: "TIME B" } }];
  assert.deepEqual(JSON.parse(serializarJogos(time, jogos, "json")).jogos.map((j) => j.time_coracao), ["TIME A", "TIME B"]);
  assert.ok(serializarJogos(time, jogos, "txt").endsWith("| time=TIME B"));
  for (const nome of [undefined, "", "TIME\nA", "TIME|A"]) {
    assert.throws(() => prepararExportacao(time, [{ dezenas, time: nome }]), /Time do Coração/);
  }
});

test("JSON contém apenas os dados das apostas", () => {
  const j = { dezenas: [1, 2, 3, 4, 5, 6], score: 90, user_id: "privado", id: "privado", metadata: { extra: "privado" } };
  const json = serializarJogos(mega, [j], "json");
  assert.ok(!json.includes("privado"));
  assert.deepEqual(JSON.parse(json).jogos, [{ dezenas: j.dezenas }]);
});
