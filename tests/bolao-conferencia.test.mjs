import assert from "node:assert/strict";
import test from "node:test";
import { bolaoConferidoOficial } from "../src/lib/bolao-conferencia.ts";

test("status e data de sorteio não substituem a conferência oficial", () => {
  for (const status of ["em_vendas", "encerrado", "sorteado", "conferido"]) {
    for (const resultado_oficial of [null, undefined, []]) {
      assert.equal(bolaoConferidoOficial({ status, data_sorteio: "2020-01-01", resultado_oficial }), false);
    }
  }
  assert.equal(bolaoConferidoOficial(null), false);
});

test("resultado oficial permite histórico mesmo com status antigo", () => {
  for (const status of ["encerrado", "sorteado", "conferido"]) {
    assert.equal(bolaoConferidoOficial({ status, resultado_oficial: [1, 2, 3, 4, 5, 6] }), true);
  }
});

test("combo só entra no histórico com todas as partes conferidas", () => {
  const oficial = { resultado_oficial: [1, 2, 3, 4, 5, 6] };
  for (const combo_loterias of [null, [], [oficial, {}], [oficial, { resultado_oficial: [] }], [oficial, { resultado: [1, 2, 3] }]]) {
    assert.equal(bolaoConferidoOficial({ is_combo: true, status: "conferido", resultado_oficial: [1, 2, 3], combo_loterias }), false);
  }
  assert.equal(bolaoConferidoOficial({ is_combo: true, combo_loterias: [oficial, oficial] }), true);
});
