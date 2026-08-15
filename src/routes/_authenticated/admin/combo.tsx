import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { criarBolaoCombo } from "@/lib/boloes.functions";
import { listarJogosSalvos, resumoOficialTodas } from "@/lib/loterias.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOTERIAS, type LoteriaId } from "@/lib/loterias-config";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { 
  Layers, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Sparkles, 
  TrendingUp, 
  Calendar, 
  Clock, 
  DollarSign, 
  AlertCircle 
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/combo")({
  component: AdminComboCreator,
});

function AdminComboCreator() {
  const router = useRouter();
  const criarComboFn = useServerFn(criarBolaoCombo);
  const getJogosSalvos = useServerFn(listarJogosSalvos);
  const getResumoOficial = useServerFn(resumoOficialTodas);

  const [nome, setNome] = useState("MEGA COMBO DA SORTE");
  const [valorCota, setValorCota] = useState(50);
  const [totalCotas, setTotalCotas] = useState(10);
  const [prazoVendas, setPrazoVendas] = useState(new Date().toISOString().split("T")[0]);
  const [horarioEncerramento, setHorarioEncerramento] = useState("18:00");
  
  const [loteriasSelecionadas, setLoteriasSelecionadas] = useState<LoteriaId[]>([]);
  
  const { data: jogosSalvos = [], isLoading: loadingJogos } = useQuery({
    queryKey: ["jogos-salvos-admin"],
    queryFn: () => getJogosSalvos({ data: {} }),
  });

  const { data: resumos = [] } = useQuery({
    queryKey: ["resumo-todas-loterias"],
    queryFn: () => getResumoOficial(),
    staleTime: 60000
  });

  const [jogosPorLoteria, setJogosPorLoteria] = useState<Record<string, string[]>>({});

  const mutationCriar = useMutation({
    mutationFn: (data: any) => criarComboFn({ data }),
    onSuccess: () => {
      toast.success("Combo criado com sucesso!");
      router.navigate({ to: "/admin" });
    },
    onError: (e) => toast.error("Erro ao criar combo: " + e.message),
  });

  const premiosEstimados = useMemo(() => {
    const map: Record<string, number> = {};
    resumos.forEach(r => {
      map[r.loteria] = r.estimativaProximo;
    });
    return map;
  }, [resumos]);

  const concursosProximos = useMemo(() => {
    const map: Record<string, { numero: number, data: string }> = {};
    resumos.forEach(r => {
      map[r.loteria] = { 
        numero: r.proximoConcurso || (r.numero + 1), 
        data: r.proximoData || r.data_apuracao 
      };
    });
    return map;
  }, [resumos]);

  const toggleLoteria = (id: LoteriaId) => {
    if (loteriasSelecionadas.includes(id)) {
      setLoteriasSelecionadas(loteriasSelecionadas.filter(l => l !== id));
      const newJogos = { ...jogosPorLoteria };
      delete newJogos[id];
      setJogosPorLoteria(newJogos);
    } else {
      setLoteriasSelecionadas([...loteriasSelecionadas, id]);
    }
  };

  const toggleJogo = (loteria: string, jogoId: string) => {
    const atuais = jogosPorLoteria[loteria] || [];
    if (atuais.includes(jogoId)) {
      setJogosPorLoteria({
        ...jogosPorLoteria,
        [loteria]: atuais.filter(id => id !== jogoId)
      });
    } else {
      setJogosPorLoteria({
        ...jogosPorLoteria,
        [loteria]: [...atuais, jogoId]
      });
    }
  };

  const handleCriar = () => {
    if (loteriasSelecionadas.length < 2) {
      toast.error("Selecione pelo menos 2 loterias para o combo.");
      return;
    }

    const comboLoterias = loteriasSelecionadas.map(lid => {
      const ids = jogosPorLoteria[lid] || [];
      const jogosParaAdicionar = jogosSalvos
        .filter(j => ids.includes(j.id))
        .map(j => ({ dezenas: j.dezenas, score: j.score }));

      if (jogosParaAdicionar.length === 0) {
        throw new Error(`Selecione pelo menos um jogo para a ${LOTERIAS[lid].nome}`);
      }

      const info = concursosProximos[lid] || { numero: 1, data: new Date().toISOString().split('T')[0] };

      return {
        loteriaId: lid,
        concursoNumero: info.numero,
        dataSorteio: info.data,
        horarioSorteio: "20:00",
        premioEstimado: premiosEstimados[lid] || 0,
        jogos: jogosParaAdicionar
      };
    });

    try {
      mutationCriar.mutate({
        nome,
        prazoVendas,
        horarioEncerramento,
        totalCotas,
        valorCota,
        loterias: comboLoterias
      });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const totalPremio = loteriasSelecionadas.reduce((acc, lid) => acc + (premiosEstimados[lid] || 0), 0);
  const totalJogos = loteriasSelecionadas.reduce((acc, lid) => acc + (jogosPorLoteria[lid]?.length || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin"><ChevronLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
              <Layers className="h-8 w-8 text-primary" />
              Criar Novo Bolão Combo
            </h1>
            <p className="text-muted-foreground">Combine múltiplas loterias em um único bolão inteligente.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card/40 backdrop-blur border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Configurações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label>Nome do Combo</Label>
                <Input 
                  value={nome} 
                  onChange={e => setNome(e.target.value.toUpperCase())}
                  placeholder="EX: SUPER COMBO DA VIRADA"
                  className="font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor da Cota (R$)</Label>
                <Input 
                  type="number" 
                  value={valorCota} 
                  onChange={e => setValorCota(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Total de Cotas</Label>
                <Input 
                  type="number" 
                  value={totalCotas} 
                  onChange={e => setTotalCotas(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Prazo de Vendas</Label>
                <Input 
                  type="date" 
                  value={prazoVendas} 
                  onChange={e => setPrazoVendas(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Horário Encerramento</Label>
                <Input 
                  type="time" 
                  value={horarioEncerramento} 
                  onChange={e => setHorarioEncerramento(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Seleção de Loterias e Jogos</CardTitle>
              <CardDescription>Escolha pelo menos 2 loterias e adicione os jogos salvos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex flex-wrap gap-4">
                {(Object.keys(LOTERIAS) as LoteriaId[]).map(lid => {
                  const cfg = LOTERIAS[lid];
                  const selecionada = loteriasSelecionadas.includes(lid);
                  return (
                    <button
                      key={lid}
                      onClick={() => toggleLoteria(lid)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                        selecionada 
                          ? 'border-primary bg-primary/10 shadow-md' 
                          : 'border-border/40 bg-muted/20 hover:border-border'
                      }`}
                    >
                      <img src={cfg.logo} alt={cfg.nome} className="h-6 w-auto" />
                      <span className="font-bold">{cfg.nome}</span>
                      {selecionada && <Plus className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>

              {loteriasSelecionadas.map(lid => {
                const cfg = LOTERIAS[lid];
                const jogosDestaLoteria = jogosSalvos.filter(j => j.loteria === lid);
                const selecionados = jogosPorLoteria[lid] || [];
                
                return (
                  <div key={lid} className="space-y-4 p-4 rounded-xl bg-muted/20 border border-border/40 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: cfg.cor }} />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={cfg.logo} alt={cfg.nome} className="h-5 w-auto" />
                        <h3 className="font-bold text-sm uppercase tracking-wider">{cfg.nome}</h3>
                        <Badge variant="outline" className="text-[10px]">
                          Conc. {concursosProximos[lid]?.numero || '...'}
                        </Badge>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">
                        {selecionados.length} JOGOS SELECIONADOS
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20">
                      {jogosDestaLoteria.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground italic col-span-2">
                          Nenhum jogo salvo para esta loteria. Salve jogos no Gerador IA primeiro.
                        </p>
                      ) : (
                        jogosDestaLoteria.map(j => {
                          const isSel = selecionados.includes(j.id);
                          return (
                            <button
                              key={j.id}
                              onClick={() => toggleJogo(lid, j.id)}
                              className={`text-left p-2 rounded-lg text-[10px] border transition-all flex items-center justify-between ${
                                isSel ? 'bg-primary/20 border-primary/40' : 'bg-background/40 border-border/40'
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-foreground">
                                  {j.dezenas.join(', ')}
                                </span>
                                {j.score && (
                                  <span className="text-[8px] text-primary font-black">SCORE: {j.score}</span>
                                )}
                              </div>
                              {isSel && <CheckCircle2 className="h-3 w-3 text-primary" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}

              {loteriasSelecionadas.length === 0 && (
                <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-2">
                  <AlertCircle className="h-8 w-8 opacity-20" />
                  <p className="text-sm">Selecione as loterias acima para começar.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card/40 backdrop-blur border-border/60 sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Resumo do Combo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Loterias</span>
                  <span className="font-bold">{loteriasSelecionadas.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total de Jogos IA</span>
                  <span className="font-bold">{totalJogos}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Valor da Cota</span>
                  <span className="font-bold text-primary">R$ {valorCota.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Arrecadação Total</span>
                  <span className="font-bold">R$ {(valorCota * totalCotas).toLocaleString('pt-BR')}</span>
                </div>
                
                <div className="pt-4 border-t border-border/40">
                  <p className="text-[10px] uppercase font-black text-muted-foreground mb-1">Prêmio Total Estimado</p>
                  <p className="text-2xl font-black text-foreground">
                    R$ {totalPremio.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <Button 
                  className="w-full font-black py-6 text-lg" 
                  onClick={handleCriar}
                  disabled={mutationCriar.isPending || loteriasSelecionadas.length < 2 || totalJogos === 0}
                >
                  {mutationCriar.isPending ? "CRIANDO..." : "CRIAR COMBO"}
                </Button>
                <p className="text-[9px] text-center text-muted-foreground uppercase leading-relaxed font-bold">
                  Ao criar, o combo ficará visível na home <br /> como BOLÃO COMBO.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
