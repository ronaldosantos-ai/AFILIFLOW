// @ts-nocheck
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, Search, Trash2, Copy, Check, Image, ExternalLink, ThumbsUp, X } from "lucide-react";

export default function PublishManual() {
  const [productUrl, setProductUrl] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editHashtags, setEditHashtags] = useState("");

  const createPostMutation = trpc.dashboard.createManualPost.useMutation();
  const getMyPostsQuery = trpc.dashboard.getMyManualPosts.useQuery();
  const updatePostMutation = trpc.dashboard.updateManualPost.useMutation();
  const deletePostMutation = trpc.dashboard.deleteManualPost.useMutation();
  const processUrlMutation = trpc.dashboard.processProductUrl.useMutation();
  const approveContentMutation = trpc.dashboard.approveContent.useMutation();

  const handleSearch = async () => {
    if (!productUrl.trim()) { toast.error("Cole uma URL válida"); return; }
    try { new URL(productUrl); } catch { toast.error("URL inválida"); return; }

    setIsSearching(true);
    try {
      toast.loading("Buscando produto e gerando conteúdo...");
      const contentData = await processUrlMutation.mutateAsync({ url: productUrl });

      const result = await createPostMutation.mutateAsync({
        productUrl,
        productName: contentData.productName,
        productPrice: contentData.productPrice,
        productImage: contentData.productImage,
        productDescription: contentData.productDescription,
      });

      if (result) {
        const postId = (result as any).insertId || 1;
        await updatePostMutation.mutateAsync({
          id: postId,
          aidaDescription: contentData.aidaDescription,
          generatedImage: contentData.generatedImage,
          status: "draft",
        });
        toast.success("Produto processado! Conteúdo gerado com sucesso.");
        setProductUrl("");
        await getMyPostsQuery.refetch();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao processar URL");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (post: any) => {
    setSelected(post);
    setEditTitle(post.generatedTitle || post.title || post.productName || "");
    setEditDescription(post.editedDescription || post.aidaDescription || post.description || "");
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
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
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
      await updatePostMutation.mutateAsync({
        id: selected.id,
        aidaDescription: editDescription,
        status: "draft",
      });
      toast.success("Salvo!");
    } catch { toast.error("Erro ao salvar"); }
  };

  const handleSaveAsApproved = async () => {
    if (!selected) return;
    try {
      await updatePostMutation.mutateAsync({
        id: selected.id,
        aidaDescription: editDescription,
        status: "published",
      });
      toast.success("✅ Salvo como aprovado — aparece em Postagens!");
      setSelected(null);
      await getMyPostsQuery.refetch();
    } catch { toast.error("Erro ao aprovar"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deletar este post?")) return;
    try {
      await deletePostMutation.mutateAsync({ id });
      toast.success("Deletado!");
      setSelected(null);
      await getMyPostsQuery.refetch();
    } catch { toast.error("Erro ao deletar"); }
  };

  const CopyButton = ({ field, value, label }: { field: string; value: string; label: string }) => (
    <Button
      onClick={() => handleCopy(value, field)}
      size="sm"
      variant={copied[field] ? "default" : "outline"}
      className={`gap-1 transition-all ${copied[field] ? "bg-green-600 text-white border-green-600" : ""}`}
    >
      {copied[field]
        ? <><Check className="w-3 h-3" /> Copiado!</>
        : <><Copy className="w-3 h-3" /> {label}</>}
    </Button>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Publicar Manual</h1>
          <p className="text-muted-foreground mt-1">
            Cole o link do produto — o sistema gera o link de afiliado e todo o conteúdo
          </p>
        </div>

        {/* Campo de URL */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Link do Produto</CardTitle>
            <CardDescription>Cole a URL da página do produto na Shopee</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://shopee.com.br/product/..."
                className="flex-1"
                disabled={isSearching}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              {isSearching ? (
                <Button
                  onClick={() => { setIsSearching(false); processUrlMutation.reset(); }}
                  variant="destructive"
                  className="gap-2"
                >
                  <X className="w-4 h-4" /> Cancelar
                </Button>
              ) : (
                <Button
                  onClick={handleSearch}
                  disabled={!productUrl.trim()}
                  className="gap-2"
                >
                  {isSearching
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Search className="w-4 h-4" />}
                  Gerar Conteúdo
                </Button>
              )}
            </div>
            {isSearching && (
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando produto e gerando imagem + texto... pode levar alguns instantes.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Lista de posts manuais */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Posts Gerados</CardTitle>
                <CardDescription>{getMyPostsQuery.data?.length || 0} posts</CardDescription>
              </CardHeader>
              <CardContent>
                {getMyPostsQuery.isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </div>
                ) : getMyPostsQuery.data && getMyPostsQuery.data.length > 0 ? (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {getMyPostsQuery.data.map((post: any) => (
                      <button
                        key={post.id}
                        onClick={() => handleSelect(post)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selected?.id === post.id
                            ? "bg-primary/10 border-primary shadow-md"
                            : "bg-card border-border hover:border-primary/50"
                        }`}
                      >
                        {(post.generatedImage || post.productImage) && (
                          <img
                            src={post.generatedImage || post.productImage}
                            alt={post.productName}
                            className="w-full h-24 object-cover rounded mb-2"
                          />
                        )}
                        <h3 className="font-medium text-sm text-foreground line-clamp-2">
                          {post.productName}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {post.status === "published" ? "✅ Aprovado" : "📝 Rascunho"}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum post gerado ainda
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Painel de conteúdo */}
          {selected ? (
            <div className="lg:col-span-2 space-y-4">

              {/* Imagem gerada */}
              {(selected.generatedImage || selected.productImage) && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Imagem</CardTitle>
                      <Button
                        onClick={() => handleCopyImage(selected.generatedImage || selected.productImage)}
                        size="sm"
                        variant={copied["image"] ? "default" : "outline"}
                        className={`gap-2 ${copied["image"] ? "bg-green-600 text-white border-green-600" : ""}`}
                      >
                        {copied["image"]
                          ? <><Check className="w-4 h-4" /> Copiada!</>
                          : <><Image className="w-4 h-4" /> Copiar Imagem</>}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <img
                      src={selected.generatedImage || selected.productImage}
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

              {/* Ações */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  variant="outline"
                  className="flex-1"
                  disabled={updatePostMutation.isPending}
                >
                  Salvar Edições
                </Button>
                <Button
                  onClick={() => handleDelete(selected.id)}
                  variant="destructive"
                  className="flex-1 gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Deletar
                </Button>
                <Button
                  onClick={handleSaveAsApproved}
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <ThumbsUp className="w-4 h-4" /> Salvar como Aprovado
                </Button>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 flex items-center justify-center text-muted-foreground">
              <p>← Selecione um post ou gere um novo acima</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
