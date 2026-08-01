import { useEffect, useState } from "react";
import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRESETS = [20, 50, 100, 200];

export function JanelaAnalise({
  total,
  janela,
  onChange,
}: {
  total: number;
  janela: number | null;
  onChange: (n: number | null) => void;
}) {
  const [texto, setTexto] = useState(janela ? String(janela) : "");
  useEffect(() => setTexto(janela ? String(janela) : ""), [janela]);

  const aplicar = () => {
    const n = Number(texto);
    if (!texto.trim() || !Number.isFinite(n) || n <= 0) return onChange(null);
    onChange(Math.min(Math.floor(n), total));
  };

  const usados = janela ? Math.min(janela, total) : total;

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <Database className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Base de análise</span>
        <span className="text-xs text-muted-foreground">
          usando {usados} de {total} concursos {janela ? "(mais recentes)" : "(histórico completo)"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={janela === p ? "default" : "outline"}
            onClick={() => onChange(p)}
            disabled={p > total}
          >
            {p}
          </Button>
        ))}
        <Button
          size="sm"
          variant={janela === null ? "default" : "outline"}
          onClick={() => onChange(null)}
        >
          Tudo ({total})
        </Button>

        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={total}
            inputMode="numeric"
            placeholder="Personalizado"
            className="h-9 w-32"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && aplicar()}
          />
          <Button size="sm" variant="secondary" onClick={aplicar}>
            Aplicar
          </Button>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Menos concursos = análise mais rápida e focada na tendência recente. Mais concursos = estatística
        mais estável. Padrão: histórico completo.
      </p>
    </div>
  );
}
