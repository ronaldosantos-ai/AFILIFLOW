import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, Save, Play, Pause } from "lucide-react";
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

  const schedulerQuery = trpc.dashboard.getSchedulerSettings.useQuery();
  const updateSchedulerMutation = trpc.dashboard.updateSchedulerSettings.useMutation();
  const togglePipelineMutation = trpc.dashboard.togglePipeline.useMutation();

  // Carregar dados quando a query retorna
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
    if (!newTime.trim()) {
      toast.error("Digite um horário");
      return;
    }
    if (scheduleTimes.includes(newTime)) {
      toast.error("Este horário já existe");
      return;
    }
    setScheduleTimes([...scheduleTimes, newTime].sort());
    setNewTime("");
    toast.success("Horário adicionado!");
  };

  const handleRemoveTime = (time: string) => {
    setScheduleTimes(scheduleTimes.filter((t) => t !== time));
  };

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) {
      toast.error("Digite uma palavra-chave");
      return;
    }
    if (keywords.includes(newKeyword)) {
      toast.error("Esta palavra-chave já existe");
      return;
    }
    setKeywords([...keywords, newKeyword]);
    setNewKeyword("");
    toast.success("Palavra-chave adicionada!");
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      toast.error("Digite uma categoria");
      return;
    }
    if (activeCategories.includes(newCategory)) {
      toast.error("Esta categoria já existe");
      return;
    }
    setActiveCategories([...activeCategories, newCategory]);
    setNewCategory("");
    toast.success("Categoria adicionada!");
  };

  const handleRemoveCategory = (category: string) => {
    setActiveCategories(activeCategories.filter((c) => c !== category));
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
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePipeline = async () => {
    try {
      await togglePipelineMutation.mutateAsync({ paused: !isPaused });
      setIsPaused(!isPaused);
      toast.success(isPaused ? "Pipeline retomado!" : "Pipeline pausado!");
      await schedulerQuery.refetch();
    } catch (error) {
      toast.error("Erro ao alternar pipeline");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agendador</h1>
            <p className="text-muted-foreground mt-1">
              Configure horários, palavras-chave e filtros de busca
            </p>
          </div>
          <Button
            onClick={handleTogglePipeline}
            variant={isPaused ? "outline" : "destructive"}
            className="gap-2"
          >
            {isPaused ? (
              <>
                <Play className="w-4 h-4" />
                Retomar
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" />
                Pausar
              </>
            )}
          </Button>
        </div>

        {isPaused && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⏸️ O pipeline está pausado. Nenhum conteúdo será gerado automaticamente.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Horários de Publicação */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Horários de Publicação</CardTitle>
              <CardDescription>
                Defina os horários para publicar automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  placeholder="HH:MM"
                  className="flex-1"
                />
                <Button onClick={handleAddTime} size="sm" className="gap-1">
                  <Plus className="w-4 h-4" />
                  Adicionar
                </Button>
              </div>

              <div className="space-y-2">
                {scheduleTimes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {scheduleTimes.map((time) => (
                      <Badge key={time} variant="secondary" className="gap-1">
                        🕐 {time}
                        <button
                          onClick={() => handleRemoveTime(time)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum horário configurado</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Filtros de Preço e Rating */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>
                Configure limites de preço e avaliação
              </CardDescription>
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
              <CardDescription>
                Produtos a buscar automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Ex: fone bluetooth"
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleAddKeyword();
                  }}
                />
                <Button onClick={handleAddKeyword} size="sm" className="gap-1">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {keywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                      <Badge key={keyword} className="gap-1">
                        🔍 {keyword}
                        <button
                          onClick={() => handleRemoveKeyword(keyword)}
                          className="ml-1 hover:text-red-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma palavra-chave</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Categorias Ativas */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Categorias Ativas</CardTitle>
              <CardDescription>
                Categorias de produtos a buscar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Ex: Eletrônicos"
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleAddCategory();
                  }}
                />
                <Button onClick={handleAddCategory} size="sm" className="gap-1">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {activeCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {activeCategories.map((category) => (
                      <Badge key={category} variant="outline" className="gap-1">
                        📁 {category}
                        <button
                          onClick={() => handleRemoveCategory(category)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma categoria</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botão de Salvar */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
