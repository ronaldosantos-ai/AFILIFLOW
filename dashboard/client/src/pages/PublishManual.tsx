import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, Search, Trash2, Edit2, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PublishManual() {
  const [productUrl, setProductUrl] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const createPostMutation = trpc.dashboard.createManualPost.useMutation();
  const getMyPostsQuery = trpc.dashboard.getMyManualPosts.useQuery();
  const updatePostMutation = trpc.dashboard.updateManualPost.useMutation();
  const deletePostMutation = trpc.dashboard.deleteManualPost.useMutation();
  const processUrlMutation = trpc.dashboard.processProductUrl.useMutation();

  const handleSearchProduct = async () => {
    if (!productUrl.trim()) {
      toast.error("Cole uma URL válida");
      return;
    }

    setIsSearching(true);
    try {
      try {
        new URL(productUrl);
      } catch {
        toast.error("URL inválida");
        return;
      }

      toast.loading("Buscando dados do produto...");
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

        toast.success("Produto processado! Conteúdo gerado com sucesso!");
        setProductUrl("");
        await getMyPostsQuery.refetch();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao buscar produto");
    } finally {
      setIsSearching(false);
    }
  };

  const handleDeletePost = async (id: number) => {
    if (!confirm("Tem certeza que deseja deletar este post?")) return;

    try {
      await deletePostMutation.mutateAsync({ id });
      toast.success("Post deletado");
      setSelectedPost(null);
      await getMyPostsQuery.refetch();
    } catch (error) {
      toast.error("Erro ao deletar post");
    }
  };

  const handleSavePost = async () => {
    if (!selectedPost) return;

    try {
      await updatePostMutation.mutateAsync({
        id: selectedPost.id,
        editedDescription: selectedPost.editedDescription || selectedPost.aidaDescription,
        status: "draft",
      });
      toast.success("Post salvo!");
      setEditMode(false);
      await getMyPostsQuery.refetch();
    } catch (error) {
      toast.error("Erro ao salvar post");
    }
  };

  const handlePublish = async () => {
    if (!selectedPost || !selectedPost.publishChannels?.length) {
      toast.error("Selecione pelo menos um canal de publicação");
      return;
    }

    setIsPublishing(true);
    try {
      await updatePostMutation.mutateAsync({
        id: selectedPost.id,
        status: "pending",
        publishChannels: selectedPost.publishChannels,
      });
      toast.success("Post enviado para aprovação!");
      setSelectedPost(null);
      await getMyPostsQuery.refetch();
    } catch (error) {
      toast.error("Erro ao publicar post");
    } finally {
      setIsPublishing(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      published: "bg-blue-100 text-blue-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Publicar Manualmente</h1>
          <p className="text-muted-foreground mt-1">Cole a URL do produto e gere conteúdo para publicar</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Buscar Produto</CardTitle>
                <CardDescription>Cole a URL de qualquer marketplace ou site de marca</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="productUrl" className="text-sm font-medium">
                    URL do Produto
                  </Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="productUrl"
                      type="url"
                      value={productUrl}
                      onChange={(e) => setProductUrl(e.target.value)}
                      placeholder="https://www.shopee.com.br/product/..."
                      className="flex-1"
                      disabled={isSearching}
                    />
                    <Button
                      onClick={handleSearchProduct}
                      disabled={isSearching || !productUrl.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Buscando...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Buscar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Posts List */}
          <div className="space-y-2">
            <h2 className="font-semibold text-foreground mb-3">Meus Posts</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {getMyPostsQuery.isLoading ? (
                <div className="text-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                </div>
              ) : getMyPostsQuery.data && getMyPostsQuery.data.length > 0 ? (
                getMyPostsQuery.data.map((post: any) => (
                  <button
                    key={post.id}
                    onClick={() => {
                      setSelectedPost(post);
                      setEditMode(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition ${
                      selectedPost?.id === post.id
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 shadow-md"
                        : "bg-card border-border hover:border-blue-400"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-foreground truncate">{post.productName}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{post.productUrl}</p>
                      </div>
                      <Badge className={getStatusColor(post.status)}>{post.status}</Badge>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum post ainda
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Post Details */}
        {selectedPost && (
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{selectedPost.productName}</CardTitle>
                <CardDescription>ID: {selectedPost.id}</CardDescription>
              </div>
              <Button
                onClick={() => handleDeletePost(selectedPost.id)}
                variant="outline"
                size="sm"
                className="gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                Deletar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Preço</Label>
                  <p className="text-lg font-bold text-foreground mt-1">
                    {selectedPost.productPrice ? `R$ ${selectedPost.productPrice}` : "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                  <Badge className={`${getStatusColor(selectedPost.status)} mt-1`}>
                    {selectedPost.status}
                  </Badge>
                </div>
              </div>

              {/* Product Image */}
              {selectedPost.productImage && (
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Imagem do Produto</Label>
                  <img
                    src={selectedPost.productImage}
                    alt={selectedPost.productName}
                    className="mt-2 max-h-48 rounded-lg object-cover"
                  />
                </div>
              )}

              {/* Generated Image */}
              {selectedPost.generatedImage && (
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Imagem Gerada</Label>
                  <img
                    src={selectedPost.generatedImage}
                    alt="Generated"
                    className="mt-2 max-h-48 rounded-lg object-cover"
                  />
                </div>
              )}

              {/* Description */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Descrição {editMode ? "(Editável)" : ""}
                  </Label>
                  {!editMode && (
                    <Button
                      onClick={() => setEditMode(true)}
                      variant="ghost"
                      size="sm"
                      className="gap-1 h-auto p-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      Editar
                    </Button>
                  )}
                </div>
                {editMode ? (
                  <Textarea
                    value={selectedPost.editedDescription || selectedPost.aidaDescription || ""}
                    onChange={(e) =>
                      setSelectedPost({
                        ...selectedPost,
                        editedDescription: e.target.value,
                      })
                    }
                    className="min-h-32"
                    placeholder="Edite a descrição aqui..."
                  />
                ) : (
                  <p className="text-sm text-foreground whitespace-pre-wrap bg-muted p-3 rounded-lg">
                    {selectedPost.editedDescription || selectedPost.aidaDescription || "Aguardando geração..."}
                  </p>
                )}
              </div>

              {/* Publish Channels */}
              <div className="border-t pt-4">
                <Label className="text-xs font-semibold text-muted-foreground mb-3 block">Canais de Publicação</Label>
                <div className="flex gap-2 flex-wrap">
                  {["telegram", "instagram"].map((channel) => (
                    <button
                      key={channel}
                      onClick={() => {
                        const channels = selectedPost.publishChannels || [];
                        if (channels.includes(channel)) {
                          setSelectedPost({
                            ...selectedPost,
                            publishChannels: channels.filter((c: string) => c !== channel),
                          });
                        } else {
                          setSelectedPost({
                            ...selectedPost,
                            publishChannels: [...channels, channel],
                          });
                        }
                      }}
                      className={`px-4 py-2 rounded-lg border transition ${
                        selectedPost.publishChannels?.includes(channel)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-card border-border hover:border-blue-400"
                      }`}
                    >
                      {channel === "telegram" ? "📱 Telegram" : "📷 Instagram"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                {editMode ? (
                  <>
                    <Button
                      onClick={handleSavePost}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      Salvar Alterações
                    </Button>
                    <Button
                      onClick={() => setEditMode(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handlePublish}
                    disabled={isPublishing || !selectedPost.publishChannels?.length}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Publicando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar para Aprovação
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
