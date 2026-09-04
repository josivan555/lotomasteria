import { Sparkles, Layers } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { BaseSorteios } from "@/lib/base-sorteios";

export function SeletorBaseSorteios({
  base,
  onChange,
  totalRegular,
  totalEspecial,
}: {
  base: BaseSorteios;
  onChange: (b: BaseSorteios) => void;
  totalRegular: number;
  totalEspecial: number;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <Layers className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Bancos de dados de sorteios</span>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <label className="flex cursor-pointer items-center gap-2">
          <Checkbox
            checked={base.regular}
            onCheckedChange={(v) => onChange({ ...base, regular: v === true })}
          />
          <span className="text-sm">
            Sorteios comuns
            <span className="ml-1 text-xs text-muted-foreground">({totalRegular})</span>
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-2">
          <Checkbox
            checked={base.especial}
            onCheckedChange={(v) => onChange({ ...base, especial: v === true })}
          />
          <span className="flex items-center gap-1.5 text-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Sorteios especiais
            <span className="text-xs text-muted-foreground">({totalEspecial})</span>
          </span>
        </label>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Marque os bancos que a IA deve usar. Especiais são concursos como a Lotofácil da
        Independência, Mega da Virada e Quina de São João.
      </p>
    </div>
  );
}
