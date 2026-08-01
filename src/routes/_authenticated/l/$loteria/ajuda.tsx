import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { LOTERIAS, isLoteriaId, type LoteriaId } from "@/lib/loterias-config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sigma,
  Hash,
  Dice5,
  Repeat,
  Layers,
  Grid3X3,
  Target,
  Sparkles,
  Coins,
  Printer,
  ClipboardCheck,
  Bookmark,
  Lightbulb,
  CheckCircle2,
  XCircle,
  History,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/l/$loteria/ajuda")({
  component: AjudaPage,
  head: () => ({
    meta: [
      { title: "Como usar os filtros | LotoMaster IA" },
      {
        name: "description",
        content:
          "Guia completo dos filtros de estratégia do LotoMaster IA: soma, pares, consecutivas, primos, moldura, miolo e mais.",
      },
      { property: "og:title", content: "Como usar os filtros | LotoMaster IA" },
      {
        property: "og:description",
        content:
          "Entenda cada filtro estatístico do gerador e monte jogos com perfil semelhante ao histórico oficial.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type FiltroDoc = {
  icon: React.ReactNode;
  nome: string;
  descricao: string;
  faixa: (l: LoteriaId) => string;
  exemplo: string;
  dica: string;
};

const FILTROS_BASICOS: FiltroDoc[] = [
  {
    icon: <Dice5 className="h-5 w-5" />,
    nome: "1. Quantidade",
    descricao: "Define quantos jogos serão gerados de uma só vez.",
    faixa: () => "1, 2, 5, 10, 50, 100, 500 ou personalizado",
    exemplo: "Escolher 10 gera 10 jogos diferentes já salvos em Meus jogos.",
    dica: "Mais jogos aumentam suas chances, mas consomem mais créditos e custam mais na lotérica. Respeite seu orçamento.",
  },
  {
    icon: <Hash className="h-5 w-5" />,
    nome: "2. Dezenas por jogo",
    descricao: "Define quantas dezenas cada jogo terá.",
    faixa: (l) => `${LOTERIAS[l].tamanhoMin} a ${LOTERIAS[l].tamanhoMax} dezenas`,
    exemplo: "Na Mega-Sena, passar de 6 para 7 dezenas gera 7 combinações dentro do mesmo jogo.",
    dica: "Mais dezenas aumentam a chance, mas o preço oficial da aposta cresce muito rápido.",
  },
  {
    icon: <Sigma className="h-5 w-5" />,
    nome: "3. Soma",
    descricao:
      "Define o intervalo da soma total das dezenas do jogo. É o filtro que mais aproxima seus jogos do perfil histórico dos sorteios.",
    faixa: (l) =>
      `${LOTERIAS[l].filtrosDefault.somaMin} até ${LOTERIAS[l].filtrosDefault.somaMax}`,
    exemplo: "05 + 12 + 23 + 37 + 45 + 58 = 180 → aprovado na faixa 130–260.",
    dica: "A maioria esmagadora dos concursos cai na faixa intermediária. Veja o estudo completo mais abaixo.",
  },
  {
    icon: <Layers className="h-5 w-5" />,
    nome: "4. Pares",
    descricao: "Define quantos números pares o jogo pode ter (o resto vira ímpar).",
    faixa: (l) =>
      `${LOTERIAS[l].filtrosDefault.paresMin} até ${LOTERIAS[l].filtrosDefault.paresMax} pares`,
    exemplo: "Em um jogo de 6 dezenas, 3 pares e 3 ímpares é o padrão mais frequente.",
    dica: "Equilíbrio entre pares e ímpares é uma das estratégias mais consistentes.",
  },
  {
    icon: <Repeat className="h-5 w-5" />,
    nome: "5. Repetir do anterior",
    descricao:
      "Define quantas dezenas do último concurso sorteado podem aparecer no jogo novo.",
    faixa: (l) =>
      `${LOTERIAS[l].filtrosDefault.repetirAnteriorMin} até ${LOTERIAS[l].filtrosDefault.repetirAnteriorMax} dezenas`,
    exemplo: "Na Lotofácil, é comum repetir de 8 a 10 dezenas do concurso anterior.",
    dica: "Cada loteria tem um comportamento próprio: a Lotofácil repete muito, a Mega-Sena quase nada.",
  },
  {
    icon: <Grid3X3 className="h-5 w-5" />,
    nome: "6. Máx. consecutivas",
    descricao: "Limita a maior sequência de números seguidos dentro do jogo.",
    faixa: (l) => `até ${LOTERIAS[l].filtrosDefault.maxConsecutivas} consecutivas`,
    exemplo: "10-11-12 são 3 consecutivas; com limite 3, 10-11-12-13 seria rejeitado.",
    dica: "Sequências longas são raras nos sorteios reais. De 2 a 3 costuma ser o ideal.",
  },
];

const FILTROS_AVANCADOS: FiltroDoc[] = [
  {
    icon: <Target className="h-5 w-5" />,
    nome: "Primos",
    descricao: "Controla quantos números primos entram no jogo (2, 3, 5, 7, 11, 13...).",
    faixa: () => "geralmente 4 a 6 na Lotofácil",
    exemplo: "07, 11, 13 e 23 são primos.",
    dica: "Jogos sem nenhum primo ou cheios de primos são estatisticamente incomuns.",
  },
  {
    icon: <Target className="h-5 w-5" />,
    nome: "Fibonacci",
    descricao: "Controla a presença de dezenas da sequência de Fibonacci (1, 2, 3, 5, 8, 13, 21, 34, 55).",
    faixa: () => "3 a 5 dezenas",
    exemplo: "Um jogo com 03, 08 e 21 tem 3 dezenas de Fibonacci.",
    dica: "Use como um ajuste fino, não como regra principal.",
  },
  {
    icon: <Target className="h-5 w-5" />,
    nome: "Múltiplos de 3",
    descricao: "Define quantas dezenas divisíveis por 3 o jogo terá.",
    faixa: () => "4 a 6 dezenas",
    exemplo: "03, 09, 18 e 24 são múltiplos de 3.",
    dica: "Ajuda a espalhar as dezenas e evitar concentrações.",
  },
  {
    icon: <Grid3X3 className="h-5 w-5" />,
    nome: "Dezenas por linha / por coluna",
    descricao:
      "Garante distribuição espacial no volante, evitando que as dezenas fiquem amontoadas em uma região.",
    faixa: () => "2 a 4 dezenas por linha e por coluna",
    exemplo: "Um jogo com 5 dezenas na mesma linha é rejeitado com limite 4.",
    dica: "Distribuição espacial equilibrada é típica dos concursos reais.",
  },
  {
    icon: <Layers className="h-5 w-5" />,
    nome: "Moldura e Miolo",
    descricao:
      "Na Lotofácil, a moldura é a borda do volante (16 casas) e o miolo é o centro (9 casas).",
    faixa: () => "moldura 9 a 11 · miolo 4 a 6",
    exemplo: "Um jogo só com dezenas da borda tende a ser rejeitado.",
    dica: "Filtro exclusivo do volante 5x5 da Lotofácil.",
  },
  {
    icon: <History className="h-5 w-5" />,
    nome: "Ausentes do último concurso",
    descricao: "Quantas dezenas que NÃO saíram no último sorteio devem entrar no jogo.",
    faixa: () => "5 a 7 dezenas",
    exemplo: "É o complemento direto do filtro de repetição.",
    dica: "Combine com o filtro de repetição para simular o comportamento real do sorteio.",
  },
  {
    icon: <Repeat className="h-5 w-5" />,
    nome: "Pares consecutivos",
    descricao: "Conta quantos pares de números vizinhos (ex.: 14-15) existem no jogo.",
    faixa: () => "3 a 7 pares",
    exemplo: "07-08 e 19-20 contam como 2 pares consecutivos.",
    dica: "Alguns vizinhos são normais; o excesso é raro.",
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    nome: "Incluir / Excluir sempre",
    descricao:
      "Dezenas fixas que devem sempre aparecer e dezenas que nunca devem aparecer nos jogos gerados.",
    faixa: () => "livre",
    exemplo: "Fixar 10 e excluir 13 em todos os jogos.",
    dica: "Fixar muitas dezenas reduz drasticamente a variedade dos jogos.",
  },
];

const SOMA_MATRIZ = [
  { faixa: "130 a 240", nivel: "Mais restritivo", veredito: "Foco agressivo no núcleo histórico." },
  {
    faixa: "130 a 260",
    nivel: "Equilíbrio perfeito",
    veredito: "Perfil estatístico muito parecido com o histórico dos sorteios.",
    destaque: true,
  },
  { faixa: "120 a 270", nivel: "Mais flexível", veredito: "Permite maior variação nas bordas." },
  { faixa: "100 a 290", nivel: "Pouco restritivo", veredito: "Aceita quase qualquer combinação não extrema." },
];

function AjudaPage() {
  const { loteria } = useParams({ from: "/_authenticated/l/$loteria/ajuda" });
  if (!isLoteriaId(loteria)) return null;
  const cfg = LOTERIAS[loteria];

  return (
    <div className="space-y-6 pb-10">
      <Card
        className="overflow-hidden border-2"
        style={{ borderColor: `${cfg.cor}55`, backgroundColor: `${cfg.cor}0f` }}
      >
        <CardHeader>
          <Badge className="w-fit" style={{ backgroundColor: cfg.cor }}>
            {cfg.nome}
          </Badge>
          <CardTitle className="text-2xl md:text-3xl">Filtros de estratégias</CardTitle>
          <CardDescription className="max-w-2xl text-base">
            Entenda cada filtro e otimize seus jogos. Os filtros ajudam a criar combinações
            inteligentes de dezenas de acordo com a sua estratégia.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild style={{ backgroundColor: cfg.cor }}>
            <Link to="/l/$loteria/gerador" params={{ loteria }}>
              <Dice5 className="mr-2 h-4 w-4" /> Ir para o Gerador
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-primary" /> Filtros básicos
          </CardTitle>
          <CardDescription>
            Faixas sugeridas já ajustadas para {cfg.nome}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {FILTROS_BASICOS.map((f) => (
            <FiltroCard key={f.nome} filtro={f} loteria={loteria} cor={cfg.cor} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sigma className="h-5 w-5 text-primary" /> Estudo: o filtro Soma a fundo
          </CardTitle>
          <CardDescription>
            Como a “zona dourada” concentra a maioria dos concursos da história.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Mecânica de cálculo</p>
            <p className="mt-1 font-mono text-sm md:text-base">
              05 + 12 + 23 + 37 + 45 + 58 = <span className="font-bold text-primary">180</span>
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-emerald-500">
              <CheckCircle2 className="h-4 w-4" /> Aprovado: 180 está entre 130 e 260.
            </p>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <TesteCard ok={false} numeros="01 02 03 04 05 06" motivo="Soma menor que 130" />
            <TesteCard ok numeros="07 18 31 40 48 55" motivo="Soma entre 130 e 260" />
            <TesteCard ok={false} numeros="55 56 57 58 59 60" motivo="Soma maior que 260" />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">A zona dourada</p>
            <div className="overflow-hidden rounded-lg border border-border/60">
              <div className="flex h-8 text-[10px] font-semibold text-white">
                <div className="flex w-[20%] items-center justify-center bg-muted-foreground/50">
                  Extremo baixo
                </div>
                <div
                  className="flex w-[55%] items-center justify-center"
                  style={{ backgroundColor: cfg.cor }}
                >
                  Zona dourada
                </div>
                <div className="flex w-[25%] items-center justify-center bg-muted-foreground/50">
                  Extremo alto
                </div>
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>21</span>
              <span>130</span>
              <span>260</span>
              <span>345</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Somas muito baixas só têm dezenas pequenas; somas muito altas só têm dezenas
              grandes. A esmagadora maioria dos concursos ocorre na região intermediária.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3">Faixa</th>
                  <th className="py-2 pr-3">Restrição</th>
                  <th className="py-2">Veredito estratégico</th>
                </tr>
              </thead>
              <tbody>
                {SOMA_MATRIZ.map((m) => (
                  <tr key={m.faixa} className="border-b border-border/40 last:border-0">
                    <td className="py-2 pr-3 font-semibold">
                      {m.faixa}
                      {m.destaque && (
                        <Badge className="ml-2" style={{ backgroundColor: cfg.cor }}>
                          recomendado
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{m.nivel}</td>
                    <td className="py-2 text-muted-foreground">{m.veredito}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <strong className="text-foreground">Importante:</strong> o filtro Soma não aumenta a
            probabilidade matemática de um jogo ser sorteado. Ele elimina combinações menos
            comuns, concentrando seus jogos na faixa estatisticamente mais frequente. Um jogo
            consistente vem da sinergia de vários filtros, não de uma regra única.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" /> Filtros avançados
          </CardTitle>
          <CardDescription>Ative apenas os que fazem parte da sua estratégia.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {FILTROS_AVANCADOS.map((f) => (
            <FiltroCard key={f.nome} filtro={f} loteria={loteria} cor={cfg.cor} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como funciona o resto do sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="ia">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Botão “IA configurar”
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                A IA analisa o histórico real de {cfg.nome} e a quantidade de jogos escolhida, e
                ajusta automaticamente todos os filtros para as faixas mais frequentes. Você pode
                aceitar ou alterar manualmente depois — nada é gerado sem o seu clique.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="creditos">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Coins className="h-4 w-4" /> Créditos
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Cada jogo gerado consome 0,2 crédito (1 crédito = 5 jogos). O saldo aparece no
                topo da tela e todas as movimentações ficam registradas na página de Créditos.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="jogos">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4" /> Meus jogos
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Os jogos são salvos automaticamente ao gerar, sempre atrelados ao próximo
                concurso. Jogos de concursos já sorteados saem da lista principal e ficam
                organizados no histórico por concurso.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="resultados">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" /> Resultados e conferência
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Os resultados vêm direto da fonte oficial da Caixa. A conferência é automática:
                cada jogo mostra quantos acertos teve no concurso correspondente, e jogos ainda
                não sorteados aparecem como “aguardando sorteio”.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="volante">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Printer className="h-4 w-4" /> Volante para impressão
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Você calibra a posição das marcas sobre o volante físico (margens em centímetros),
                confere a prévia paginada com o número de volantes necessários e imprime direto no
                papel oficial. Dá para incluir jogos de concursos passados escolhendo por
                concurso.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Passo a passo rápido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {[
            "Configure os filtros de acordo com a sua estratégia (ou use a IA configurar).",
            "Clique em Gerar jogos — eles são salvos automaticamente em Meus jogos.",
            "Confira os jogos, gere o volante e imprima. Boa sorte!",
          ].map((t, i) => (
            <div key={t} className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: cfg.cor }}
              >
                {i + 1}
              </span>
              <span className="text-muted-foreground">{t}</span>
            </div>
          ))}
          <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Estratégia + disciplina = resultados · jogue com responsabilidade
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function FiltroCard({
  filtro,
  loteria,
  cor,
}: {
  filtro: FiltroDoc;
  loteria: LoteriaId;
  cor: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4">
      <div className="flex items-center gap-2">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: cor }}
        >
          {filtro.icon}
        </span>
        <p className="font-semibold">{filtro.nome}</p>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{filtro.descricao}</p>
      <p className="mt-2 text-xs">
        <span className="font-semibold text-primary">Faixa sugerida: </span>
        <span className="text-muted-foreground">{filtro.faixa(loteria)}</span>
      </p>
      <p className="mt-1 text-xs">
        <span className="font-semibold">Exemplo: </span>
        <span className="text-muted-foreground">{filtro.exemplo}</span>
      </p>
      <p className="mt-2 flex gap-1.5 rounded-md bg-muted/60 px-2 py-1.5 text-xs text-muted-foreground">
        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
        <span>
          <span className="font-semibold text-foreground">Dica: </span>
          {filtro.dica}
        </span>
      </p>
    </div>
  );
}

function TesteCard({
  ok,
  numeros,
  motivo,
}: {
  ok?: boolean;
  numeros: string;
  motivo: string;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        ok ? "border-emerald-500/40 bg-emerald-500/10" : "border-destructive/40 bg-destructive/10"
      }`}
    >
      <p className="font-mono text-sm">{numeros}</p>
      <p
        className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${
          ok ? "text-emerald-500" : "text-destructive"
        }`}
      >
        {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
        {ok ? "Aprovado" : "Rejeitado"}
      </p>
      <p className="text-xs text-muted-foreground">{motivo}</p>
    </div>
  );
}
