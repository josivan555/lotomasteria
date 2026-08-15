import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { criarBolaoCombo } from "@/lib/boloes.functions";
import { listarTodosBoloes } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOTERIAS, type LoteriaId } from "@/lib/loterias-config";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Layers, ChevronLeft, AlertCircle, Calendar, Clock, DollarSign, Search } from "lucide-react";

import { toast } from "sonner";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/_authenticated/admin/combo")({
  component: AdminComboCreator,
});

function AdminComboCreator() {
  const router = useRouter();
  const criarComboFn = useServerFn(criarBolaoCombo);
  const getBoloes = useServerFn(listarTodosBoloes);

  const [nome, setNome] = useState("MEGA COMBO DA SORTE");
  const [valorCota, setValorCota] = useState(50);
  const [totalCotas, setTotalCotas] = useState(10);
  const [prazoVendas, setPrazoVendas] = useState(new Date().toISOString().split("T")[0]);
  const [horarioEncerramento, setHorarioEncerramento] = useState("18:00");
  const [searchTerm, setSearchTerm] = useState("");
  const [loteriaFilter, setLoteriaFilter] = useState<LoteriaId | "all">("all");
  
  const [boloesSelecionados, setBoloesSelecionados] = useState<string[]>([]);
  
  const { data: todosBoloes = [], isLoading: loadingBoloes } = useQuery({
    queryKey: ["admin-boloes-para-combo"],
    queryFn: () => getBoloes(),
  });

  const boloesDisponiveis = useMemo(() => {
    // Apenas bolões individuais que não são combos e estão ativos ou em vendas
    return todosBoloes.filter((b: any) => 
      !b.is_combo && 
      (b.status === 'em_vendas' || b.status === 'publicado') &&
      (loteriaFilter === "all" || b.loteria_id === loteriaFilter) &&
      (b.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
       b.concurso_numero.toString().includes(searchTerm))
    );
  }, [todosBoloes, searchTerm]);

  const mutationCriar = useMutation({
    mutationFn: (data: any) => criarComboFn({ data }),
    onSuccess: () => {
      toast.success("Combo criado com sucesso!");
      router.navigate({ to: "/admin" });
    },
    onError: (e) => toast.error("Erro ao criar combo: " + e.message),
  });

  const toggleBolao = (id: string) => {
    if (boloesSelecionados.includes(id)) {
      setBoloesSelecionados(boloesSelecionados.filter(bid => bid !== id));
    } else {
      if (boloesSelecionados.length >= 10) {
        toast.error("Máximo de 10 bolões por combo.");
        return;
      }
      setBoloesSelecionados([...boloesSelecionados, id]);
    }
  };

  const boloesEscohidos = useMemo(() => {
    return todosBoloes.filter((b: any) => boloesSelecionados.includes(b.id));
  }, [todosBoloes, boloesSelecionados]);

  const totalPremio = boloesEscohidos.reduce((acc, b) => acc + (b.premio_estimado || 0), 0);
  const totalJogos = boloesEscohidos.reduce((acc, b) => acc + (b.total_jogos || 0), 0);

  const handleCriar = () => {
    if (boloesSelecionados.length < 2) {
      toast.error("Selecione pelo menos 2 bolões para criar um combo.");
      return;
    }

    mutationCriar.mutate({
      nome,
      prazoVendas,
      horarioEncerramento,
      totalCotas,
      valorCota,
      bolaoIds: boloesSelecionados
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4 md:px-0">
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
            <p className="text-muted-foreground">Junte bolões existentes em um único pacote promocional.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card/40 backdrop-blur border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Configurações do Combo</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label>Nome do Combo</Label>
                <Input 
                  value={nome} 
                  onChange={e => setNome(e.target.value.toUpperCase())}
                  placeholder="EX: TRIO DA SORTE"
                  className="font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor da Cota Unificada (R$)</Label>
                <Input 
                  type="number" 
                  value={valorCota} 
                  onChange={e => setValorCota(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Total de Cotas do Combo</Label>
                <Input 
                  type="number" 
                  value={totalCotas} 
                  onChange={e => setTotalCotas(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Prazo Final de Vendas</Label>
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
              <div className="flex flex-col gap-4">
                <div>
                  <CardTitle className="text-lg">Selecionar Bolões</CardTitle>
                  <CardDescription>Escolha os bolões individuais para compor o combo.</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex p-1 bg-secondary/50 rounded-lg overflow-x-auto no-scrollbar whitespace-nowrap">
                    <button
                      onClick={() => setLoteriaFilter("all")}
                      className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${loteriaFilter === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      TODAS
                    </button>
                    {Object.entries(LOTERIAS).map(([id, cfg]) => (
                      <button
                        key={id}
                        onClick={() => setLoteriaFilter(id as LoteriaId)}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${loteriaFilter === id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {cfg.nome}
                      </button>
                    ))}
                  </div>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar por nome ou concurso..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-9 h-10 text-xs bg-muted/20 border-border/40"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                {loadingBoloes ? (
                  <div className="col-span-2 py-10 text-center text-muted-foreground uppercase text-[10px] font-black tracking-widest">Carregando bolões...</div>
                ) : boloesDisponiveis.length === 0 ? (
                  <div className="col-span-2 py-10 text-center text-muted-foreground italic text-sm">Nenhum bolão disponível para combo no momento.</div>
                ) : (
                  boloesDisponiveis.map((b: any) => {
                    const cfg = LOTERIAS[b.loteria_id as LoteriaId] || LOTERIAS.lotofacil;
                    const selecionado = boloesSelecionados.includes(b.id);
                    return (
                      <button
                        key={b.id}
                        onClick={() => toggleBolao(b.id)}
                        className={`text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden group ${
                          selecionado 
                            ? 'border-primary bg-primary/10 shadow-md shadow-primary/20' 
                            : 'border-border/40 bg-muted/20 hover:border-primary/40'
                        }`}
                      >
                        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: cfg.cor }} />
                        <div className="flex items-center justify-between mb-2">
                          <img src={cfg.logo} alt={cfg.nome} className="h-5 w-auto" />
                          {selecionado && <CheckCircle2 className="h-5 w-5 text-primary" />}
                        </div>
                        <h4 className="font-black text-xs uppercase tracking-tight mb-1 truncate">{b.nome}</h4>
                        <div className="flex flex-wrap gap-2 items-center">
                          <Badge variant="outline" className="text-[9px] font-black uppercase">Conc. {b.concurso_numero}</Badge>
                          <span className="text-[10px] font-bold text-muted-foreground">{b.total_jogos} JOGOS</span>
                        </div>
                        <div className="mt-2 text-[10px] font-black text-primary">
                          PRÊMIO: R$ {b.premio_estimado?.toLocaleString('pt-BR')}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
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
                  <span className="text-muted-foreground">Bolões Selecionados</span>
                  <span className="font-bold">{boloesSelecionados.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total de Jogos IA</span>
                  <span className="font-bold">{totalJogos}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Valor da Cota Única</span>
                  <span className="font-bold text-primary">R$ {valorCota.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Arrecadação Total</span>
                  <span className="font-bold">R$ {(valorCota * totalCotas).toLocaleString('pt-BR')}</span>
                </div>
                
                <div className="pt-4 border-t border-border/40">
                  <p className="text-[10px] uppercase font-black text-muted-foreground mb-1">Prêmio Total Acumulado</p>
                  <p className="text-2xl font-black text-foreground">
                    R$ {totalPremio.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <Button 
                  className="w-full font-black py-6 text-lg" 
                  onClick={handleCriar}
                  disabled={mutationCriar.isPending || boloesSelecionados.length < 2}
                >
                  {mutationCriar.isPending ? "CRIANDO..." : "CRIAR COMBO AGORA"}
                </Button>
                <p className="text-[9px] text-center text-muted-foreground uppercase leading-relaxed font-bold">
                  Os bolões originais selecionados serão <br /> movidos para o combo.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
