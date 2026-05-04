import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Eye, EyeOff, Save, Loader2, AlertCircle, CheckCircle } from "lucide-react";

const INTEGRATIONS = [
  {
    id: "meta",
    name: "Meta API (Instagram & Facebook)",
    description: "Configure acesso à Meta para publicar em Instagram e Facebook",
    icon: "📘",
    fields: [
      { key: "metaAppId", label: "App ID", isSecret: true, required: true },
      { key: "metaAppSecret", label: "App Secret", isSecret: true, required: true },
      { key: "metaPageAccessToken", label: "Page Access Token", isSecret: true, required: true },
      { key: "metaPageId", label: "Page ID", isSecret: false, required: true },
      { key: "metaInstagramAccountId", label: "Instagram Account ID", isSecret: false, required: true },
    ],
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Configure bot do Telegram para publicar ofertas",
    icon: "✈️",
    fields: [
      { key: "telegramBotToken", label: "Bot Token", isSecret: true, required: true },
      { key: "telegramChatId", label: "Chat ID", isSecret: false, required: true },
    ],
  },
  {
    id: "shopee",
    name: "Shopee",
    description: "Configure acesso à API da Shopee para buscar produtos",
    icon: "🛍️",
    fields: [
      { key: "shopeeApiKey", label: "API Key", isSecret: true, required: true },
      { key: "shopeePartnerId", label: "Partner ID", isSecret: false, required: true },
    ],
  },
  {
    id: "gtm",
    name: "Google Tag Manager",
    description: "Configure GTM para rastreamento de eventos (opcional - não ativo ainda)",
    icon: "📊",
    fields: [{ key: "gtmId", label: "GTM ID", isSecret: false, required: false }],
  },
];

export default function Integrations() {
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const updateSettingsMutation = trpc.admin.updateIntegrationSettings.useMutation();
  const runMigrationMutation = trpc.dashboard.runMigration.useMutation();
  const getSettingsQuery = trpc.admin.getIntegrationSettings.useQuery(
    { integrationName: selectedIntegration || "" },
    { enabled: !!selectedIntegration }
  );

  const handleSelectIntegration = (integrationId: string) => {
    setSelectedIntegration(integrationId);
    setFormData({});
    setShowSecrets({});
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleShowSecret = (field: string) => {
    setShowSecrets((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSave = async () => {
    if (!selectedIntegration) return;

    setIsSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({
        integrationName: selectedIntegration,
        settings: formData,
      });
      toast.success(`${selectedIntegration.toUpperCase()} configurado com sucesso!`);
      getSettingsQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunMigration = async () => {
    setIsMigrating(true);
    try {
      const result = await runMigrationMutation.mutateAsync();
      if (result.success) {
        toast.success("Tabela de integrações criada com sucesso!");
      } else {
        toast.error(`Erro na migração: ${result.message}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao executar migração");
    } finally {
      setIsMigrating(false);
    }
  };

  const currentIntegration = INTEGRATIONS.find((i) => i.id === selectedIntegration);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Integrações</h1>
            <p className="text-muted-foreground mt-1">Configure as integrações com serviços externos</p>
          </div>
          <Button
            onClick={handleRunMigration}
            disabled={isMigrating}
            variant="outline"
            className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:bg-purple-100"
          >
            {isMigrating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Migrando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Inicializar Banco
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Integration List */}
          <div className="space-y-2">
            <h2 className="font-semibold text-foreground mb-3">Serviços Disponíveis</h2>
            {INTEGRATIONS.map((integration) => (
              <button
                key={integration.id}
                onClick={() => handleSelectIntegration(integration.id)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  selectedIntegration === integration.id
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 shadow-md"
                    : "bg-card border-border hover:border-blue-400"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{integration.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-foreground truncate">{integration.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {integration.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Configuration Panel */}
          <div className="lg:col-span-2">
            {selectedIntegration && currentIntegration ? (
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{currentIntegration.icon}</span>
                    <div>
                      <CardTitle>{currentIntegration.name}</CardTitle>
                      <CardDescription>{currentIntegration.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Fields */}
                  <div className="space-y-4">
                    {currentIntegration.fields.map((field) => (
                      <div key={field.key}>
                        <Label htmlFor={field.key} className="text-sm font-medium">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            id={field.key}
                            type={
                              field.isSecret && !showSecrets[field.key]
                                ? "password"
                                : "text"
                            }
                            value={formData[field.key] || ""}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            placeholder={`Digite ${field.label.toLowerCase()}`}
                            className="flex-1"
                          />
                          {field.isSecret && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleShowSecret(field.key)}
                              className="px-3"
                            >
                              {showSecrets[field.key] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Save Button */}
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Configuração
                      </>
                    )}
                  </Button>

                  {/* Info */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <div className="flex gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="text-yellow-700 dark:text-yellow-300">
                        <strong>Segurança:</strong> Seus dados sensíveis são criptografados e nunca
                        são exibidos após salvar. Use o ícone de olho para visualizar durante a
                        edição.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <p className="text-muted-foreground">Selecione um serviço à esquerda para configurar</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Integration Status */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm">Status das Integrações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {INTEGRATIONS.map((integration) => (
                <div
                  key={integration.id}
                  className="p-3 border border-border rounded-lg hover:bg-accent/50 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-sm">{integration.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {integration.fields.length} campos
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {integration.id === "gtm" ? "Opcional" : "Requerido"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Help */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-sm">ℹ️ Como Configurar</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <div>
              <strong className="text-blue-700 dark:text-blue-300">Meta API:</strong>
              <p className="mt-1">
                Acesse{" "}
                <a
                  href="https://developers.facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  developers.facebook.com
                </a>
                , crie um app e obtenha suas credenciais.
              </p>
            </div>
            <div>
              <strong className="text-blue-700 dark:text-blue-300">Telegram:</strong>
              <p className="mt-1">
                Converse com{" "}
                <a
                  href="https://t.me/botfather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  @BotFather
                </a>{" "}
                no Telegram para criar um bot.
              </p>
            </div>
            <div>
              <strong className="text-blue-700 dark:text-blue-300">Shopee:</strong>
              <p className="mt-1">
                Acesse{" "}
                <a
                  href="https://partner.shopeemobile.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  partner.shopeemobile.com
                </a>{" "}
                para gerar suas credenciais de API.
              </p>
            </div>
            <div>
              <strong className="text-blue-700 dark:text-blue-300">GTM:</strong>
              <p className="mt-1">
                Acesse{" "}
                <a
                  href="https://tagmanager.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  tagmanager.google.com
                </a>{" "}
                e copie seu GTM ID (formato: GTM-XXXXXX).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
