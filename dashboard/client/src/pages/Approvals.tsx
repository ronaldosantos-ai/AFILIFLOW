import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle, XCircle, Loader2, Eye, Edit2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";

export default function Approvals() {
  const [selectedApproval, setSelectedApproval] = useState<any | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showEditChat, setShowEditChat] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [editPrompt, setEditPrompt] = useState("");

  const approvalsQuery = trpc.admin.getPendingApprovals.useQuery();
  const approveChannelMutation = trpc.admin.approveContentChannel.useMutation();
  const rejectMutation = trpc.admin.rejectContent.useMutation();
  const editMutation = trpc.admin.editContent.useMutation();

  const handleApproveChannel = async (approvalId: number, channel: "telegram" | "instagram") => {
    try {
      await approveChannelMutation.mutateAsync({ approvalId, channel });
      toast.success(`Conteúdo aprovado para ${channel}!`);
      approvalsQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Erro ao aprovar para ${channel}`);
    }
  };

  const handleReject = async (approvalId: number) => {
    if (!rejectionReason.trim()) {
      toast.error("Por favor, forneça um motivo para rejeição");
      return;
    }
    try {
      await rejectMutation.mutateAsync({ approvalId, reason: rejectionReason });
      toast.success("Conteúdo rejeitado com sucesso!");
      approvalsQuery.refetch();
      setSelectedApproval(null);
      setShowRejectDialog(false);
      setRejectionReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao rejeitar");
    }
  };

  const handleEdit = async (approvalId: number) => {
    if (!editPrompt.trim()) {
      toast.error("Por favor, digite um prompt para Gemini");
      return;
    }
    try {
      await editMutation.mutateAsync({ approvalId, newDescription: editPrompt });
      toast.success("Conteúdo editado com sucesso!");
      approvalsQuery.refetch();
      setShowEditChat(false);
      setEditPrompt("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao editar");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Aprovação de Conteúdo</h1>
          <p className="text-muted-foreground mt-1">Revise, edite e aprove conteúdo antes de publicar</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {approvalsQuery.data?.length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Conteúdo Pendente</CardTitle>
            <CardDescription>Produtos aguardando aprovação para publicação</CardDescription>
          </CardHeader>
          <CardContent>
            {approvalsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : approvalsQuery.data && approvalsQuery.data.length > 0 ? (
              <div className="space-y-4">
                {approvalsQuery.data.map((approval: any) => (
                  <div
                    key={approval.id}
                    className="p-4 border border-border rounded-lg hover:bg-accent/50 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {approval.productImage && (
                          <img
                            src={approval.productImage}
                            alt={approval.productName}
                            className="w-16 h-16 rounded object-cover mb-2"
                          />
                        )}
                        <h3 className="font-semibold text-foreground">{approval.productName}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {approval.description || "Sem descrição"}
                        </p>
                        
                        {/* Channel Status */}
                        <div className="flex gap-2 mt-2">
                          <Badge
                            variant={approval.telegramApproved ? "default" : "outline"}
                            className="flex items-center gap-1 text-xs"
                          >
                            {approval.telegramApproved ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <MessageSquare className="w-3 h-3" />
                            )}
                            Telegram
                          </Badge>
                          <Badge
                            variant={approval.instagramApproved ? "default" : "outline"}
                            className="flex items-center gap-1 text-xs"
                          >
                            {approval.instagramApproved ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <MessageSquare className="w-3 h-3" />
                            )}
                            Instagram
                          </Badge>
                        </div>
                        
                        <a
                          href={approval.affiliateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-500 hover:underline mt-2 inline-block"
                        >
                          Ver Produto
                        </a>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedApproval(approval);
                            setShowPreview(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Visualizar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedApproval(approval);
                            setShowEditChat(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedApproval(approval);
                            setShowRejectDialog(true);
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>

                    {/* Approval Buttons */}
                    <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                      {!approval.telegramApproved && (
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleApproveChannel(approval.id, "telegram")}
                          disabled={approveChannelMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Aprovar Telegram
                        </Button>
                      )}
                      {!approval.instagramApproved && (
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleApproveChannel(approval.id, "instagram")}
                          disabled={approveChannelMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Aprovar Instagram
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-muted-foreground">Nenhum conteúdo pendente de aprovação</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedApproval?.productName}</DialogTitle>
            </DialogHeader>
            {selectedApproval && (
              <div className="space-y-4">
                {selectedApproval.productImage && (
                  <img
                    src={selectedApproval.productImage}
                    alt={selectedApproval.productName}
                    className="w-full h-96 object-cover rounded-lg"
                  />
                )}
                <div>
                  <h4 className="font-semibold mb-2">Descrição</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedApproval.description || "Sem descrição"}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Link do Produto</h4>
                  <a
                    href={selectedApproval.affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline truncate"
                  >
                    {selectedApproval.affiliateUrl}
                  </a>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Chat Dialog */}
        <Dialog open={showEditChat} onOpenChange={setShowEditChat}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Conteúdo com Gemini</DialogTitle>
            </DialogHeader>
            {selectedApproval && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Descrição Atual</label>
                  <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded">
                    {selectedApproval.description || "Sem descrição"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Seu Prompt para Gemini</label>
                  <Textarea
                    placeholder="Ex: Mude a cor para azul, Reescreva focando em durabilidade..."
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    className="mt-1"
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEdit(selectedApproval.id)}
                    disabled={editMutation.isPending || !editPrompt.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {editMutation.isPending ? "Processando..." : "Enviar para Gemini"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowEditChat(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeitar Conteúdo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja rejeitar este conteúdo? Você pode adicionar um motivo.
              </p>
              <Textarea
                placeholder="Motivo da rejeição (opcional)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRejectDialog(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedApproval?.id)}
                  disabled={rejectMutation.isPending}
                  className="flex-1"
                >
                  {rejectMutation.isPending ? "Rejeitando..." : "Rejeitar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
