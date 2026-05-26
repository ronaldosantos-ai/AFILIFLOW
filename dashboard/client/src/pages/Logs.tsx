// @ts-nocheck
import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  RefreshCw,
  Loader2,
  User,
  FileText,
  Calendar,
} from "lucide-react";

export default function Logs() {
  const [filterType, setFilterType] = useState<string>("");
  const [filterUser, setFilterUser] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");

  const logsQuery = trpc.admin.getAuditLogs.useQuery();
  const logs = logsQuery.data || [];

  // Filter logs based on criteria
  const filteredLogs = useMemo(() => {
    return logs.filter((log: any) => {
      const matchType = !filterType || log.actionType === filterType;
      const matchUser = !filterUser || log.userId?.toString() === filterUser;
      const matchStatus = !filterStatus || log.status === filterStatus;
      const matchSearch =
        !searchText ||
        log.description?.toLowerCase().includes(searchText.toLowerCase()) ||
        log.actionType?.toLowerCase().includes(searchText.toLowerCase());

      return matchType && matchUser && matchStatus && matchSearch;
    });
  }, [logs, filterType, filterUser, filterStatus, searchText]);

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "APPROVE_CONTENT":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "REJECT_CONTENT":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "EDIT_CONTENT":
        return <FileText className="w-4 h-4 text-blue-500" />;
      case "AUTHORIZE_USER":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "REJECT_USER":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "PROMOTE_ADMIN":
        return <User className="w-4 h-4 text-purple-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      APPROVE_CONTENT: "Aprovação de Conteúdo",
      REJECT_CONTENT: "Rejeição de Conteúdo",
      EDIT_CONTENT: "Edição de Conteúdo",
      AUTHORIZE_USER: "Autorização de Usuário",
      REJECT_USER: "Rejeição de Usuário",
      PROMOTE_ADMIN: "Promoção a Admin",
      PUBLISH_TELEGRAM: "Publicação Telegram",
      PUBLISH_INSTAGRAM: "Publicação Instagram",
      SAVE_CONFIG: "Salvamento de Configuração",
      SAVE_INTEGRATION: "Salvamento de Integração",
    };
    return labels[actionType] || actionType;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-600">✓ Sucesso</Badge>;
      case "error":
        return <Badge className="bg-red-600">✗ Erro</Badge>;
      case "pending":
        return <Badge className="bg-yellow-600">⏳ Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const uniqueUsers = Array.from(
    new Set(logs.map((log: any) => log.userId?.toString()).filter(Boolean))
  );
  const uniqueTypes = Array.from(new Set(logs.map((log: any) => log.actionType).filter(Boolean)));

  const handleExportCSV = () => {
    const csv = [
      ["Data", "Usuário", "Ação", "Descrição", "Status"],
      ...filteredLogs.map((log: any) => [
        formatDate(log.createdAt),
        log.userId || "Sistema",
        getActionLabel(log.actionType),
        log.description || "",
        log.status || "N/A",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Auditoria e Logs</h1>
          <p className="text-muted-foreground mt-1">Visualize todas as ações realizadas no sistema</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Ações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{logs.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sucesso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {logs.filter((l: any) => l.status === "success").length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Erros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {logs.filter((l: any) => l.status === "error").length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Filtrados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{filteredLogs.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search" className="text-sm font-medium">
                  Pesquisar
                </Label>
                <Input
                  id="search"
                  placeholder="Descrição ou ação..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="type" className="text-sm font-medium">
                  Tipo de Ação
                </Label>
                <select
                  id="type"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm"
                >
                  <option value="">Todas</option>
                  {uniqueTypes.map((type) => (
                    <option key={type} value={type}>
                      {getActionLabel(type as string)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="status" className="text-sm font-medium">
                  Status
                </Label>
                <select
                  id="status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm"
                >
                  <option value="">Todos</option>
                  <option value="success">Sucesso</option>
                  <option value="error">Erro</option>
                  <option value="pending">Pendente</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logsQuery.refetch()}
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Atualizar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Histórico de Ações</CardTitle>
            <CardDescription>Todas as ações realizadas no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {logsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredLogs.map((log: any, index: number) => (
                  <div
                    key={log.id || index}
                    className="p-3 border border-border rounded-lg hover:bg-accent/50 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="mt-1">{getActionIcon(log.actionType)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">
                              {getActionLabel(log.actionType)}
                            </span>
                            {getStatusBadge(log.status)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {log.description || "Sem descrição"}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(log.createdAt)}
                            </div>
                            {log.userId && (
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                Usuário ID: {log.userId}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum log encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-sm">ℹ️ Informações</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              • <strong>Auditoria Completa:</strong> Todas as ações são registradas automaticamente
            </p>
            <p>
              • <strong>Rastreabilidade:</strong> Você pode ver quem fez o quê e quando
            </p>
            <p>
              • <strong>Exportação:</strong> Baixe os logs em formato CSV para análise externa
            </p>
            <p>
              • <strong>Filtros:</strong> Use os filtros para encontrar ações específicas
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
