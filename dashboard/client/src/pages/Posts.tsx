import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Copy, Check, Trash2, Image, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";

export default function Posts() {
  const [selected, setSelected] = useState<any | null>(null);
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editHashtags, setEditHashtags] = useState("");

  const postsQuery = trpc.dashboard.getPosts.useQuery({ limit: 50 });
  const deletePostMutation = trpc.dashboard.deletePost.useMutation();
  const updateDescriptionMutation = trpc.dashboard.updateContentDescription.useMutation();

  const handleSelect = (post: any) => {
    setSelected(post);
    setEditTitle(post.generatedTitle || post.title || post.productName || "");
    setEditDescription(post.generatedDescription || post.description || "");
    setEditHashtags(post.generatedHashtags || post.hashtags || "");
    setCopied({});
  };

  const handleCopy = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied((prev) => ({ ...prev, [field]: true }));
    toast.success("Copiado!");
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
      handleCopy(imageUrl, "image");
      toast.info("URL da imagem copiada");
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    try {
      await updateDescriptionMutation.mutateAsync({
        id: selected.id,
        description: editDescription,
      });
      toast.success("Edições salvas!");
    } catch {
      toast.error("Erro ao salvar");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deletar esta postagem?")) return;
    try {
      await deletePostMutation.mutateAsync({ id });
      toast.success("Postagem deletada");
      setSelected(null);
      await postsQuery.refetch();
    } catch {
      toast.error("Erro ao deletar");
    }
  };

  const CopyButton = ({ field, value, label }: { field: string; value: string; label: string }) => (
    <Button
      onClick={() => handleCopy(value, field)}
      size="sm"
      variant={copied[field] ? "default" : "outline"}
      className={`gap-1 transition-all ${copied[field] ? "bg-green-600 text-white border-green-600" : ""}`}
    >
      {copied[field] ? <><Check className="w-3 h-3" /> Copiado!</> : <><Copy className="w-3 h-3" /> {label}</>}
    </Button>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Postagens</h1>
          <p className="text-muted-foreground mt-1">
            Histórico de todo conteúdo aprovado
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Lista */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Histórico</CardTitle>
                <CardDescription>
                  {postsQuery.data?.length || 0} postagens no total
                </CardDescription>
              </CardHeader>
              <CardContent>
                {postsQuery.isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </div>
                ) : postsQuery.data && postsQuery.data.length > 0 ? (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {postsQuery.data.map((post: any) => (
                      <button
                        key={post.id}
                        onClick={() => handleSelect(post)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selected?.id === post.id
                            ? "bg-primary/10 border-primary shadow-md"
                            : "bg-card border-border hover:border-primary/50"
                        }`}
                      >
                        {post.imageUrl && (
                          <img
                            src={post.imageUrl}
                            alt={post.productName}
                            className="w-full h-24 object-cover rounded mb-2"
                          />
                        )}
                        <div className="space-y-1">
                          <h3 className="font-semibold text-sm text-foreground line-clamp-2">
                            {post.generatedTitle || post.title || post.productName}
                          </h3>
                          <div className="flex items-center justify-between pt-1">
                            <Badge variant="outline" className="text-xs">
                              {post.source === "manual" ? "✍️ Manual" : "🤖 Auto"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {post.approvedAt
                                ? new Date(post.approvedAt).toLocaleDateString("pt-BR")
                                : new Date(post.createdAt).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    📭 Nenhuma postagem ainda
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Painel de edição */}
          {selected ? (
            <div className="lg:col-span-2 space-y-4">

              {/* Imagem */}
              {selected.imageUrl && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Imagem</CardTitle>
                      <Button
                        onClick={() => handleCopyImage(selected.imageUrl)}
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
                      src={selected.imageUrl}
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

              {/* Link */}
              {selected.affiliateUrl && (
                <Card className="bg-card border-border">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Link de Afiliado</Label>
                      <div className="flex gap-2">
                        <CopyButton field="link" value={selected.affiliateUrl} label="Copiar" />
                        <a href={selected.affiliateUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="gap-1">
                            <ExternalLink className="w-3 h-3" /> Abrir
                          </Button>
                        </a>
                      </div>
                    </div>
                    <Input value={selected.affiliateUrl} readOnly className="text-sm bg-muted" />
                  </CardContent>
                </Card>
              )}

              {/* Data de aprovação */}
              {selected.approvedAt && (
                <p className="text-xs text-muted-foreground text-center">
                  ✅ Aprovado em {new Date(selected.approvedAt).toLocaleString("pt-BR")}
                </p>
              )}

              {/* Ações */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  variant="outline"
                  className="flex-1"
                  disabled={updateDescriptionMutation.isPending}
                >
                  {updateDescriptionMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : "Salvar Edições"}
                </Button>
                <Button
                  onClick={() => handleDelete(selected.id)}
                  variant="destructive"
                  className="flex-1 gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Deletar
                </Button>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 flex items-center justify-center text-muted-foreground">
              <p>← Selecione uma postagem para ver detalhes</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
