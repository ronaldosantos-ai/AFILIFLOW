import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, Check, Trash2, ThumbsUp, Image } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";

export default function Approvals() {
  const [selected, setSelected] = useState<any | null>(null);
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editHashtags, setEditHashtags] = useState("");

  const approvalsQuery = trpc.dashboard.getContentApprovals.useQuery({ status: "pending" });
  const approveContentMutation = trpc.dashboard.approveContent.useMutation();
  const rejectContentMutation = trpc.dashboard.rejectContent.useMutation();
  const updateDescriptionMutation = trpc.dashboard.updateContentDescription.useMutation();

  const handleCopy = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied((prev) => ({ ...prev, [field]: true }));
    toast.success(`${field} copiado!`);
    setTimeout(() => setCopied((prev) => ({ ...prev, [field]: false })), 3000);
  };

  const handleCopyImage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopied((prev) => ({ ...prev, image: true }));
      toast.success("Imagem copiada!");
      setTimeout(() => setCopied((prev) => ({ ...prev, image: false })), 3000);
    } catch {
      // Fallback: copia a URL da imagem
      handleCopy(imageUrl, "image");
      toast.info("URL da imagem copiada (abra e salve a imagem manualmente)");
    }
  };

  const handleSelect = (approval: any) => {
    setSelected(approval);
    setEditTitle(approval.generatedTitle || approval.title || approval.productName || "");
    setEditDescription(approval.generatedDescription || approval.description || "");
    setEditHashtags(approval.generatedHashtags || approval.hashtags || "");
    setCopied({});
  };

  const handleSave = async () => {
    if (!selected) return;
    try {
      await updateDescriptionMutation.mutateAsync({
        id: selected.id,
        description: editDescription,
      });
      toast.success("Conteúdo salvo!");
    } catch {
      toast.error("Erro ao salvar");
    }
  };

  const handleApprove = async () => {
    if (!selected) return;
    try {
      await approveContentMutation.mutateAsync({ id: selected.id });
      toast.success("✅ Aprovado e movido para Postagens!");
      setSelected(null);
      await approvalsQuery.refetch();
    } catch {
      toast.error("Erro ao aprovar");
    }
  };

  const handleDiscard = async () => {
    if (!selected) return;
    if (!confirm("Descartar este conteúdo permanentemente?")) return;
    try {
      await rejectContentMutation.mutateAsync({ id: selected.id, reason: "Descartado pelo admin" });
      toast.success("Conteúdo descartado");
      setSelected(null);
      await approvalsQuery.refetch();
    } catch {
      toast.error("Erro ao descartar");
    }
  };

  const CopyButton = ({ field, value, label }: { field: string; value: string; label?: string }) => (
    <Button
      onClick={() => handleCopy(value, field)}
      size="sm"
      variant={copied[field] ? "default" : "outline"}
      className={`h-auto p-2 gap-1 transition-all ${copied[field] ? "bg-green-600 text-white border-green-600" : ""}`}
    >
      {copied[field] ? (
        <><Check className="w-3 h-3" />{label ? "Copiado!" : ""}</>
      ) : (
        <><Copy className="w-3 h-3" />{label || ""}</>
      )}
    </Button>
  );

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
          {/* Lista de pendentes */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Pendentes</CardTitle>
                <CardDescription>
                  {approvalsQuery.data?.length || 0} itens aguardando
                </CardDescription>
              </CardHeader>
              <CardContent>
                {approvalsQuery.isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </div>
                ) : approvalsQuery.data && approvalsQuery.data.length > 0 ? (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {approvalsQuery.data.map((approval: any) => (
                      <button
                        key={approval.id}
                        onClick={() => handleSelect(approval)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selected?.id === approval.id
                            ? "bg-primary/10 border-primary shadow-md"
                            : "bg-card border-border hover:border-primary/50"
                        }`}
                      >
                        {(approval.imageUrl || approval.productImage) && (
                          <img
                            src={approval.imageUrl || approval.productImage}
                            alt={approval.productName}
                            className="w-full h-28 object-cover rounded mb-2"
                          />
                        )}
                        <div className="space-y-1">
                          <h3 className="font-semibold text-sm text-foreground line-clamp-2">
                            {approval.generatedTitle || approval.title || approval.productName}
                          </h3>
                          <div className="flex items-center justify-between pt-1">
                            <Badge variant="outline" className="text-xs">⏳ Pendente</Badge>
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
                    ✅ Nenhum conteúdo pendente!
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Painel de edição */}
          {selected ? (
            <div className="lg:col-span-2 space-y-4">

              {/* Imagem */}
              {(selected.imageUrl || selected.productImage) && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Imagem</CardTitle>
                      <Button
                        onClick={() => handleCopyImage(selected.imageUrl || selected.productImage)}
                        size="sm"
                        variant={copied["image"] ? "default" : "outline"}
                        className={`gap-2 ${copied["image"] ? "bg-green-600 text-white border-green-600" : ""}`}
                      >
                        {copied["image"] ? (
                          <><Check className="w-4 h-4" /> Copiada!</>
                        ) : (
                          <><Image className="w-4 h-4" /> Copiar Imagem</>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <img
                      src={selected.imageUrl || selected.productImage}
                      alt="Produto"
                      className="w-full max-h-64 object-cover rounded border border-border"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Título */}
              <Card className="bg-card border-border">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Título</Label>
                    <CopyButton field="title" value={editTitle} label="Copiar" />
                  </div>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-sm"
                  />
                </CardContent>
              </Card>

              {/* Descrição */}
              <Card className="bg-card border-border">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Descrição</Label>
                    <CopyButton field="description" value={editDescription} label="Copiar" />
                  </div>
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="min-h-32 text-sm"
                  />
                </CardContent>
              </Card>

              {/* Hashtags */}
              <Card className="bg-card border-border">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Hashtags</Label>
                    <CopyButton field="hashtags" value={editHashtags} label="Copiar" />
                  </div>
                  <Input
                    value={editHashtags}
                    onChange={(e) => setEditHashtags(e.target.value)}
                    className="text-sm"
                  />
                </CardContent>
              </Card>

              {/* Link de afiliado */}
              {selected.affiliateUrl && (
                <Card className="bg-card border-border">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Link de Afiliado</Label>
                      <CopyButton field="link" value={selected.affiliateUrl} label="Copiar" />
                    </div>
                    <Input
                      value={selected.affiliateUrl}
                      readOnly
                      className="text-sm bg-muted"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Ações */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  variant="outline"
                  className="flex-1"
                  disabled={updateDescriptionMutation.isPending}
                >
                  {updateDescriptionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : "Salvar Edições"}
                </Button>
                <Button
                  onClick={handleDiscard}
                  variant="destructive"
                  className="flex-1 gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Descartar
                </Button>
                <Button
                  onClick={handleApprove}
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Aprovar
                </Button>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 flex items-center justify-center text-muted-foreground">
              <p>← Selecione um item para revisar</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
