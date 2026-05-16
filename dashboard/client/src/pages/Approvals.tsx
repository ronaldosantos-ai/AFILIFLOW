import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Copy, Check, Trash2, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";

export default function Approvals() {
  const [selectedApproval, setSelectedApproval] = useState<any | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");

  const approvalsQuery = trpc.dashboard.getContentApprovals.useQuery({
    status: "pending",
  });
  const approveContentMutation = trpc.dashboard.approveContent.useMutation();
  const rejectContentMutation = trpc.dashboard.rejectContent.useMutation();
  const updateDescriptionMutation = trpc.dashboard.updateContentDescription.useMutation();

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copiado!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleApprove = async (id: number) => {
    try {
      await approveContentMutation.mutateAsync({ id });
      toast.success("Conteúdo aprovado!");
      setSelectedApproval(null);
      await approvalsQuery.refetch();
    } catch (error) {
      toast.error("Erro ao aprovar conteúdo");
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm("Tem certeza que deseja rejeitar este conteúdo?")) return;

    try {
      await rejectContentMutation.mutateAsync({ id, reason: "Rejeitado pelo usuário" });
      toast.success("Conteúdo rejeitado");
      setSelectedApproval(null);
      await approvalsQuery.refetch();
    } catch (error) {
      toast.error("Erro ao rejeitar conteúdo");
    }
  };

  const handleUpdateDescription = async (id: number) => {
    if (!editDescription.trim()) {
      toast.error("Digite uma descrição");
      return;
    }

    try {
      await updateDescriptionMutation.mutateAsync({
        id,
        description: editDescription,
      });
      toast.success("Descrição atualizada!");
      setSelectedApproval({ ...selectedApproval, description: editDescription });
      setEditDescription("");
    } catch (error) {
      toast.error("Erro ao atualizar descrição");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Aprovações</h1>
          <p className="text-muted-foreground mt-1">
            Conteúdo gerado automaticamente aguardando sua revisão
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Conteúdo Pendente</CardTitle>
                <CardDescription>
                  {approvalsQuery.data?.length || 0} itens aguardando aprovação
                </CardDescription>
              </CardHeader>
              <CardContent>
                {approvalsQuery.isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </div>
                ) : approvalsQuery.data && approvalsQuery.data.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {approvalsQuery.data.map((approval: any) => (
                      <button
                        key={approval.id}
                        onClick={() => {
                          setSelectedApproval(approval);
                          setEditDescription(approval.description || "");
                        }}
                        className={`w-full text-left p-4 rounded-lg border transition ${
                          selectedApproval?.id === approval.id
                            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 shadow-md"
                            : "bg-card border-border hover:border-blue-400"
                        }`}
                      >
                        {approval.productImage && (
                          <img
                            src={approval.productImage}
                            alt={approval.productName}
                            className="w-full h-24 object-cover rounded mb-2"
                          />
                        )}

                        <div className="space-y-1">
                          <h3 className="font-semibold text-sm text-foreground line-clamp-1">
                            {approval.productName}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {approval.description}
                          </p>
                          <div className="flex items-center justify-between pt-2">
                            <Badge variant="outline" className="text-xs">
                              {approval.status === "pending" ? "⏳ Pendente" : approval.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(approval.createdAt).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    ✨ Nenhum conteúdo pendente. Tudo limpo!
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {selectedApproval && (
            <div className="space-y-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Detalhes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {selectedApproval.productImage && (
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground">
                        Imagem Original
                      </Label>
                      <img
                        src={selectedApproval.productImage}
                        alt="Product"
                        className="mt-2 w-full h-20 object-cover rounded"
                      />
                    </div>
                  )}

                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Produto
                    </Label>
                    <p className="text-foreground mt-1">{selectedApproval.productName}</p>
                  </div>

                  {selectedApproval.affiliateUrl && (
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground">
                        Link de Afiliado
                      </Label>
                      <div className="flex gap-1 mt-1">
                        <input
                          type="text"
                          value={selectedApproval.affiliateUrl}
                          readOnly
                          className="flex-1 px-2 py-1 text-xs bg-muted rounded border border-border"
                        />
                        <Button
                          onClick={() => handleCopy(selectedApproval.affiliateUrl, "url")}
                          size="sm"
                          variant="outline"
                          className="h-auto p-1"
                        >
                          {copiedField === "url" ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {selectedApproval && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Editar Conteúdo</CardTitle>
              <CardDescription>Revise e edite antes de aprovar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Descrição</Label>
                  <Button
                    onClick={() => handleCopy(editDescription, "description")}
                    size="sm"
                    variant="ghost"
                    className="h-auto p-1"
                  >
                    {copiedField === "description" ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="min-h-24 text-sm"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => handleUpdateDescription(selectedApproval.id)}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  Salvar Edição
                </Button>

                <Button
                  onClick={() => handleApprove(selectedApproval.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Aprovar
                </Button>

                <Button
                  onClick={() => handleReject(selectedApproval.id)}
                  variant="destructive"
                  className="flex-1 gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Rejeitar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
