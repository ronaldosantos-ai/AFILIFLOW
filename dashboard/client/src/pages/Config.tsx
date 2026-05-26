// @ts-nocheck
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Clock, Plus, Trash2, Save, Loader2 } from "lucide-react";

export default function Config() {
  const [config, setConfig] = useState({
    scheduleTimes: ["09:00", "15:00", "21:00"],
    minPrice: 10,
    maxPrice: 1000,
    minRating: 3.5,
    minReviews: 50,
    minSalesRanking: 10000,
    keywords: "casa cozinha utilidades, maquiagem cuidados pele, esportes fitness academia, eletronicos celular acessorios",
    excludeKeywords: "fake, cópia, réplica, importado",
  });

  const [newTime, setNewTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const saveConfigMutation = trpc.config.saveSearchConfig.useMutation();

  const handleAddTime = () => {
    if (newTime && !config.scheduleTimes.includes(newTime)) {
      const updated = [...config.scheduleTimes, newTime].sort();
      setConfig({
        ...config,
        scheduleTimes: updated,
      });
      setNewTime("");
      toast.success("Horário adicionado com sucesso");
    }
  };

  const handleRemoveTime = (time: string) => {
    setConfig({
      ...config,
      scheduleTimes: config.scheduleTimes.filter((t) => t !== time),
    });
    toast.success("Horário removido com sucesso");
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await saveConfigMutation.mutateAsync({
        scheduleTimes: config.scheduleTimes,
        minPrice: config.minPrice,
        maxPrice: config.maxPrice,
        minRating: config.minRating,
        minReviews: config.minReviews,
        minSalesRanking: config.minSalesRanking,
        keywords: config.keywords,
        excludeKeywords: config.excludeKeywords,
      });
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações de Busca</h1>
          <p className="text-muted-foreground mt-1">Defina os critérios para busca e filtragem de produtos</p>
        </div>

        {/* Schedule Times */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Horários de Busca
            </CardTitle>
            <CardDescription>Defina os horários em que o sistema buscará produtos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="HH:MM"
                className="max-w-xs"
              />
              <Button onClick={handleAddTime} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {config.scheduleTimes.map((time) => (
                <Badge key={time} variant="secondary" className="px-3 py-2 text-sm">
                  {time}
                  <button
                    onClick={() => handleRemoveTime(time)}
                    className="ml-2 hover:text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Price Range */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Faixa de Preço</CardTitle>
            <CardDescription>Defina o intervalo de preço dos produtos a buscar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minPrice" className="text-sm font-medium">
                  Preço Mínimo (R$)
                </Label>
                <Input
                  id="minPrice"
                  type="number"
                  value={config.minPrice}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      minPrice: parseFloat(e.target.value),
                    })
                  }
                  min="0"
                  step="10"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="maxPrice" className="text-sm font-medium">
                  Preço Máximo (R$)
                </Label>
                <Input
                  id="maxPrice"
                  type="number"
                  value={config.maxPrice}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxPrice: parseFloat(e.target.value),
                    })
                  }
                  min="0"
                  step="10"
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rating and Reviews */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Qualificação de Produtos</CardTitle>
            <CardDescription>Defina os critérios mínimos de qualidade</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="minRating" className="text-sm font-medium">
                  Rating Mínimo (★)
                </Label>
                <Input
                  id="minRating"
                  type="number"
                  value={config.minRating}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      minRating: parseFloat(e.target.value),
                    })
                  }
                  min="0"
                  max="5"
                  step="0.1"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="minReviews" className="text-sm font-medium">
                  Avaliações Mínimas
                </Label>
                <Input
                  id="minReviews"
                  type="number"
                  value={config.minReviews}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      minReviews: parseInt(e.target.value),
                    })
                  }
                  min="0"
                  step="10"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="minSalesRanking" className="text-sm font-medium">
                  Ranking de Vendas Máx.
                </Label>
                <Input
                  id="minSalesRanking"
                  type="number"
                  value={config.minSalesRanking}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      minSalesRanking: parseInt(e.target.value),
                    })
                  }
                  min="0"
                  step="100"
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Keywords */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Palavras-chave para Busca</CardTitle>
            <CardDescription>
              Digite as palavras-chave separadas por vírgula. O sistema buscará produtos com essas palavras.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="keywords" className="text-sm font-medium">
                Palavras-chave (separadas por vírgula)
              </Label>
              <Textarea
                id="keywords"
                value={config.keywords}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    keywords: e.target.value,
                  })
                }
                placeholder="Ex: casa cozinha, maquiagem, esportes, eletrônicos"
                rows={4}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Exemplo: "casa cozinha utilidades, maquiagem cuidados pele"
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Exclude Keywords */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Palavras-chave para Excluir</CardTitle>
            <CardDescription>
              Digite as palavras-chave que você quer EXCLUIR dos resultados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="excludeKeywords" className="text-sm font-medium">
                Palavras-chave a Excluir (separadas por vírgula)
              </Label>
              <Textarea
                id="excludeKeywords"
                value={config.excludeKeywords}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    excludeKeywords: e.target.value,
                  })
                }
                placeholder="Ex: fake, cópia, réplica, importado"
                rows={3}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Exemplo: "fake, cópia, réplica, importado"
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>

        {/* Info */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-sm">ℹ️ Informações</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              • <strong>Horários de Busca:</strong> O sistema executará buscas nos horários configurados
            </p>
            <p>
              • <strong>Faixa de Preço:</strong> Produtos fora dessa faixa serão ignorados
            </p>
            <p>
              • <strong>Rating Mínimo:</strong> Apenas produtos com rating igual ou superior serão considerados
            </p>
            <p>
              • <strong>Avaliações Mínimas:</strong> Produtos com menos avaliações serão ignorados
            </p>
            <p>
              • <strong>Ranking de Vendas:</strong> Quanto menor o número, mais vendido é o produto
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
