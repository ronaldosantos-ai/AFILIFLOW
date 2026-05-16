import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";

export default function Posts() {
  const [selectedPost, setSelectedPost] = useState<any | null>(null);

  const postsQuery = trpc.dashboard.getPosts.useQuery({ limit: 50 });
  const deletePostMutation = trpc.dashboard.deletePost.useMutation();

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja deletar este post?")) return;

    try {
      await deletePostMutation.mutateAsync({ id });
      toast.success("Post deletado!");
      await postsQuery.refetch();
      setSelectedPost(null);
    } catch (error) {
      toast.error("Erro ao deletar post");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return (
          <Badge className="bg-green-600 hover:bg-green-700">
            ✓ Publicado
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            ✗ Falha
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            ⏳ Pendente
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Postagens</h1>
          <p className="text-muted-foreground mt-1">
            Histórico de todas as postagens publicadas
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Histórico de Postagens</CardTitle>
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
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {postsQuery.data.map((post: any) => (
                      <button
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        className={`w-full text-left p-4 rounded-lg border transition ${
                          selectedPost?.id === post.id
                            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 shadow-md"
                            : "bg-card border-border hover:border-blue-400"
                        }`}
                      >
                        {post.imageUrl && (
                          <img
                            src={post.imageUrl}
                            alt={post.productName}
                            className="w-full h-24 object-cover rounded mb-2"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://via.placeholder.com/300x300?text=Sem+Imagem";
                            }}
                          />
                        )}

                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-sm text-foreground line-clamp-1 flex-1">
                              {post.productName}
                            </h3>
                            {getStatusBadge(post.status)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {post.category && `📁 ${post.category}`}
                          </p>
                          {post.price && (
                            <p className="text-xs font-semibold text-foreground">
                              R$ {parseFloat(post.price).toFixed(2)}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex gap-1">
                              {post.publishedChannels?.map((channel: string) => (
                                <span
                                  key={channel}
                                  className="text-xs px-2 py-0.5 bg-muted rounded"
                                >
                                  {channel === "telegram" && "📱"}
                                  {channel === "instagram" && "📷"}
                                  {channel === "facebook" && "👍"}
                                </span>
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {post.createdAt &&
                                new Date(post.createdAt).toLocaleDateString("pt-BR")}
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

          {selectedPost && (
            <div className="space-y-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Detalhes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {selectedPost.imageUrl && (
                    <div>
                      <img
                        src={selectedPost.imageUrl}
                        alt={selectedPost.productName}
                        className="w-full h-32 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://via.placeholder.com/300x300?text=Sem+Imagem";
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Produto</p>
                    <p className="text-foreground mt-1">{selectedPost.productName}</p>
                  </div>

                  {selectedPost.category && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Categoria</p>
                      <p className="text-foreground mt-1">{selectedPost.category}</p>
                    </div>
                  )}

                  {selectedPost.price && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Preço</p>
                      <p className="text-foreground mt-1 font-bold">
                        R$ {parseFloat(selectedPost.price).toFixed(2)}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedPost.status)}</div>
                  </div>

                  {selectedPost.publishedChannels?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">
                        Canais Publicados
                      </p>
                      <div className="flex gap-2 mt-1">
                        {selectedPost.publishedChannels.map((channel: string) => (
                          <Badge key={channel} variant="outline">
                            {channel === "telegram" && "📱 Telegram"}
                            {channel === "instagram" && "📷 Instagram"}
                            {channel === "facebook" && "👍 Facebook"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedPost.affiliateUrl && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Link</p>
                      <a
                        href={selectedPost.affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs mt-1 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Abrir Link
                      </a>
                    </div>
                  )}

                  <Button
                    onClick={() => handleDelete(selectedPost.id)}
                    variant="destructive"
                    className="w-full gap-2 mt-4"
                  >
                    <Trash2 className="w-4 h-4" />
                    Deletar Post
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
