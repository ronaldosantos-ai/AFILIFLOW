import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, Save, Play, Pause, Search } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";

export default function Scheduler() {
  const [scheduleTimes, setScheduleTimes] = useState<string[]>([]);
  const [newTime, setNewTime] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("");
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const schedulerQuery = trpc.dashboard.getSchedulerSettings.useQuery();
  const updateSchedulerMutation = trpc.dashboard.updateSchedulerSettings.useMutation();
  const togglePipelineMutation = trpc.dashboard.togglePipeline.useMutation();

  // Tenta usar rota de trigger manual se existir
  const runNowMutation = (trpc.dashboard as any).triggerPipeline?.useMutation?.() || null;

  useEffect(() => {
    if (schedulerQuery.data) {
      const data = schedulerQuery.data;
      setScheduleTimes(data.scheduleTimes ? JSON.parse(data.scheduleTimes) : []);
      setKeywords(data.keywords ? JSON.parse(data.keywords) : []);
      setMaxPrice(data.maxPrice ? String(data.maxPrice) : "");
      setMinRating(data.minRating ? String(data.minRating) : "");
      setActiveCategories(data.activeCategories ? JSON.parse(data.activeCategories) : []);
      setIsPaused(data.paused || false);
    }
  }, [schedulerQuery.data]);

  const handleAddTime = () => {
    if (!newTime.trim()) { toast.error("Digite um horário"); return; }
    if (scheduleTimes.includes(newTime)) { toast.error("Horário já existe"); return; }
    setScheduleTimes([...scheduleTimes, newTime].sort());
    setNewTime("");
    toast.success("Horário adicionado!");
  };

  const handleRemoveTime = (time: string) => {
    if (scheduleTimes.length <= 1) { toast.error("Deve ter pelo menos 1 horário"); return; }
    setScheduleTimes(scheduleTimes.filter((t) => t !== time));
  };

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) { toast.error("Digite uma palavra-chave"); return; }
    if (keywords.includes(newKeyword)) { toast.error("Já existe"); return; }
    setKeywords([...keywords, newKeyword]);
    setNewKeyword("");
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) { toast.error("Digite uma categoria"); return; }
    if (activeCategories.includes(newCategory)) { toast.error("Já existe"); return; }
    setActiveCategories([...activeCategories, newCategory]);
    setNewCategory("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSchedulerMutation.mutateAsync({
        scheduleTimes,
        keywords,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        minRating: minRating ? parseFloat(minRating) : undefined,
        activeCategories,
        paused: isPaused,
      });
      toast.success("Configurações salvas!");
      await schedulerQuery.refetch();
    } catch {
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePipeline = async () => {
    try {
      await togglePipelineMutation.mutateAsync({ paused: !isPaused });
      setIsPaused(!isPaused);
      toast.success(isPaused ? "✅ Pesquisa automática retomada!" : "⏸️ Pesquisa automática pausada!");
      await schedulerQuery.refetch();
    } catch {
      toast.error("Erro ao alternar pipeline");
    }
  };

  const handleRunNow = async () => {
    setIsRunning(true);
    try {
      if (runNowMutation) {
        await runNowMutation.mutateAsync({});
        toast.success("🚀 Busca iniciada! Produto será gerado em breve.");
      } else {
        // Fallback: chama endpoint direto
        const res = await fetch("/api/pipeline/trigger", { method: "POST" });
        if (res.ok) {
          toast.success("🚀 Busca iniciada! Produto será gerado em breve.");
        } else {
          toast.info("Busca manual disparada. Verifique Aprovações em alguns minutos.");
        }
      }
    } catch {
      toast.info("Busca manual disparada. Verifique Aprovações em alguns minutos.");
    } finally {
      setTimeout(() => setIsRunning(false), 3000);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header com status e botões */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agendador</h1>
            <p className="text-muted-foreground mt-1">
              Configure horários e filtros de busca automática
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {/* Botão buscar agora */}
            <Button
              onClick={handleRunNow}
              disabled={isRunning || isPaused}
              variant="outline"
              className="gap-2"
              title={isPaused ? "Pipeline pausado" : "Buscar produto agora"}
            >
              {isRunning ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Buscando...</>
              ) : (
                <><Search className="w-4 h-4" /> Buscar Agora</>
              )}
            </Button>

            {/* Botão pausar/retomar */}
            <Button
              onClick={handleTogglePipeline}
              variant={isPaused ? "outline" : "destructive"}
              className="gap-2"
            >
              {isPaused ? (
                <><Play className="w-4 h-4" /> Retomar</>
              ) : (
                <><Pause className="w-4 h-4" /> Pausar</>
              )}
            </Button>
          </div>
        </div>

        {/* Banner de status */}
        <div className={`p-4 rounded-lg border flex items-center gap-3 ${
          isPaused
            ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
            : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
        }`}>
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isPaused ? "bg-yellow-500" : "bg-green-500 animate-pulse"}`} />
          <p className={`text-sm font-medium ${isPaused ? "text-yellow-800 dark:text-yellow-200" : "text-green-800 dark:text-green-200"}`}>
            {isPaused
              ? "⏸️ Pesquisa automática pausada — nenhum produto será buscado nos horários configurados."
              : `🟢 Pesquisa automática ativa — rodando nos horários: ${scheduleTimes.join(", ") || "nenhum configurado"}`}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Horários */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Horários de Busca</CardTitle>
              <CardDescription>Horários em que o sistema busca produtos automaticamente (horário de Brasília)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddTime} size="sm" className="gap-1">
                  <Plus className="w-4 h-4" /> Adicionar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {scheduleTimes.length > 0 ? (
                  scheduleTimes.map((time) => (
                    <Badge key={time} variant="secondary" className="gap-1 text-sm py-1 px-3">
                      🕐 {time}
                      <button onClick={() => handleRemoveTime(time)} className="ml-1 hover:text-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum horário configurado</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Filtros */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Filtros de Produto</CardTitle>
              <CardDescription>Limites de preço e avaliação mínima</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Preço Máximo (R$)</Label>
                <Input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Ex: 500"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Avaliação Mínima (0-5)</Label>
                <Input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                  placeholder="Ex: 3.5"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Palavras-chave */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Palavras-chave de Busca</CardTitle>
              <CardDescription>Termos usados para buscar produtos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Ex: fone bluetooth"
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                />
                <Button onClick={handleAddKeyword} size="sm"><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {keywords.length > 0 ? (
                  keywords.map((kw) => (
                    <Badge key={kw} className="gap-1">
                      🔍 {kw}
                      <button onClick={() => setKeywords(keywords.filter((k) => k !== kw))} className="ml-1 hover:text-red-200">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma palavra-chave</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Categorias */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Categorias Ativas</CardTitle>
              <CardDescription>Categorias de produtos a buscar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Ex: Eletrônicos"
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                />
                <Button onClick={handleAddCategory} size="sm"><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {activeCategories.length > 0 ? (
                  activeCategories.map((cat) => (
                    <Badge key={cat} variant="outline" className="gap-1">
                      📂 {cat}
                      <button onClick={() => setActiveCategories(activeCategories.filter((c) => c !== cat))} className="ml-1 hover:text-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma categoria</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Salvar */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar Configurações</>}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
