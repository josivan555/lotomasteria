import { useState } from "react";
import { Download, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { LoteriaConfig } from "@/lib/loterias-config";
import { serializarJogos, type JogoExportavel } from "@/lib/jogos-export";

export function ExportarJogos({ cfg, jogos, rotulo = "Exportar jogos" }: {
  cfg: LoteriaConfig;
  jogos: readonly JogoExportavel[];
  rotulo?: string;
}) {
  const [formato, setFormato] = useState<"txt" | "json">("txt");
  let conteudo = "";
  let erro = "";
  try { conteudo = serializarJogos(cfg, jogos, formato); }
  catch (e) { erro = e instanceof Error ? e.message : "Não foi possível preparar os jogos."; }

  function baixar() {
    const blob = new Blob([conteudo], { type: formato === "txt" ? "text/plain;charset=utf-8" : "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lotomasteria-${cfg.id}-${jogos.length}-jogos.${formato}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={!jogos.length}>
          <Download className="mr-2 h-4 w-4" />{rotulo}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Exportar jogos — {cfg.nome}</DialogTitle>
          <DialogDescription>
            {jogos.length} jogo(s), na ordem original. Confira as apostas antes de usar o arquivo.
          </DialogDescription>
        </DialogHeader>
        <label className="space-y-2 text-sm">
          <span>Formato do arquivo</span>
          <select className="block w-full rounded-md border border-border bg-background p-2" value={formato}
            onChange={(e) => setFormato(e.target.value as "txt" | "json")}>
            <option value="txt">TXT — um jogo por linha</option>
            <option value="json">JSON — dados estruturados para integração</option>
          </select>
        </label>
        <p className="text-xs text-muted-foreground">
          O TXT não inclui cabeçalho, numeração dos jogos ou pontuação.
          {cfg.id === "diadesorte" && " O mês acompanha cada linha como | mes=01 até | mes=12."}
          {cfg.id === "timemania" && " O time acompanha cada linha como | time=NOME DO TIME."}
          {cfg.id === "lotomania" && " A dezena 100 do sistema é exportada como 00."}
        </p>
        {erro ? <p role="alert" className="text-sm text-destructive">{erro}</p> : (
          <pre aria-label="Prévia dos jogos exportados" className="max-h-60 overflow-auto whitespace-pre rounded-md border border-border bg-muted p-3 text-xs">{conteudo}</pre>
        )}
        <p className="text-xs text-muted-foreground">
          Este arquivo não registra nem paga apostas. A Caixa não recebe este arquivo diretamente:
          é necessário um importador compatível com o formato. O preenchimento automático ainda precisa
          ser testado no portal da Caixa. Confira também o concurso antes de pagar.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={!!erro} onClick={async () => {
            try { await navigator.clipboard.writeText(conteudo); toast.success("Jogos copiados."); }
            catch { toast.error("Não foi possível copiar. Use a opção Baixar arquivo."); }
          }}><Copy className="mr-2 h-4 w-4" />Copiar jogos</Button>
          <Button type="button" disabled={!!erro} onClick={baixar}><Download className="mr-2 h-4 w-4" />Baixar arquivo</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
