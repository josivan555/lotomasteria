import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ReactNode } from "react";

export type InfoContent = {
  /** Título mostrado dentro do balão (padrão: o próprio label) */
  title?: string;
  /** Explicação principal: o que é o recurso/filtro */
  description: string;
  /** Faixa ou valor sugerido, quando fizer sentido */
  faixa?: string;
  /** Exemplo prático */
  exemplo?: string;
  /** Dica de uso */
  dica?: string;
};

function InfoBody({ title, description, faixa, exemplo, dica }: InfoContent & { title: string }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {faixa && (
        <p className="text-xs">
          <span className="font-semibold text-primary">Faixa sugerida: </span>
          <span className="text-muted-foreground">{faixa}</span>
        </p>
      )}
      {exemplo && (
        <p className="text-xs">
          <span className="font-semibold text-foreground">Exemplo: </span>
          <span className="text-muted-foreground">{exemplo}</span>
        </p>
      )}
      {dica && (
        <p className="rounded-md bg-muted/60 px-2 py-1.5 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Dica: </span>
          {dica}
        </p>
      )}
    </div>
  );
}

const contentClass = "w-[min(20rem,calc(100vw-2rem))] md:w-80";

/** Label com botão de informação ao lado (usado nos filtros do Gerador). */
export function InfoLabel({
  label,
  description,
  faixa,
  exemplo,
  dica,
  side = "bottom",
}: InfoContent & { label: string; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex text-muted-foreground transition hover:text-foreground"
            aria-label={`Informações sobre ${label}`}
          >
            <Info className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent side={side} align="start" sideOffset={8} className={contentClass}>
          <InfoBody
            title={label}
            description={description}
            faixa={faixa}
            exemplo={exemplo}
            dica={dica}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Só o ícone de informação — para títulos de seções (Volante, Créditos, Resultados...). */
export function InfoDot({
  title,
  description,
  faixa,
  exemplo,
  dica,
  side = "bottom",
  align = "start",
}: InfoContent & {
  title: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 text-muted-foreground transition hover:text-foreground"
          aria-label={`Informações sobre ${title}`}
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} align={align} sideOffset={8} className={contentClass}>
        <InfoBody
          title={title}
          description={description}
          faixa={faixa}
          exemplo={exemplo}
          dica={dica}
        />
      </PopoverContent>
    </Popover>
  );
}
