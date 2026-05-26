// @ts-nocheck
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, Clock, Mail, Calendar, Loader2, Shield, Trash2 } from "lucide-react";

export default function AdminUsers() {
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const pendingUsersQuery = trpc.admin.getPendingUsers.useQuery();
  const allUsersQuery = trpc.admin.getAllUsers.useQuery();
  const authorizeMutation = trpc.admin.authorizeUser.useMutation();
  const rejectMutation = trpc.admin.rejectUser.useMutation();
  const promoteAdminMutation = trpc.admin.promoteToAdmin.useMutation();

  const handleAuthorize = async (userId: number) => {
    try {
      await authorizeMutation.mutateAsync({ userId });
      toast.success("Usuário autorizado com sucesso!");
      pendingUsersQuery.refetch();
      allUsersQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao autorizar");
    }
  };

  const handleReject = async (userId: number) => {
    try {
      await rejectMutation.mutateAsync({ userId });
      toast.success("Usuário rejeitado com sucesso!");
      pendingUsersQuery.refetch();
      allUsersQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao rejeitar");
    }
  };

  const handlePromoteAdmin = async (userId: number) => {
    try {
      await promoteAdminMutation.mutateAsync({ userId });
      toast.success("Usuário promovido a admin com sucesso!");
      allUsersQuery.refetch();
      setShowPromoteDialog(false);
      setSelectedUser(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao promover");
    }
  };

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pendingUsers = pendingUsersQuery.data || [];
  const allUsers = allUsersQuery.data || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground mt-1">Aprove, rejeite e gerencie usuários do sistema</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{pendingUsers.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{allUsers.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Autorizados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {allUsers.filter((u: any) => u.isAuthorized).length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {allUsers.filter((u: any) => u.role === "admin").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "pending"
                ? "text-foreground border-b-2 border-blue-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pendentes ({pendingUsers.length})
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "all"
                ? "text-foreground border-b-2 border-blue-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Todos ({allUsers.length})
          </button>
        </div>

        {/* Pending Users */}
        {activeTab === "pending" && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Usuários Pendentes de Aprovação</CardTitle>
              <CardDescription>Novos usuários aguardando aprovação</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingUsersQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingUsers.length > 0 ? (
                <div className="space-y-4">
                  {pendingUsers.map((user: any) => (
                    <div
                      key={user.id}
                      className="p-4 border border-border rounded-lg hover:bg-accent/50 transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{user.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              Pendente
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {formatDate(user.createdAt)}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleAuthorize(user.id)}
                            disabled={authorizeMutation.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(user.id)}
                            disabled={rejectMutation.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Rejeitar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">Nenhum usuário pendente de aprovação</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* All Users */}
        {activeTab === "all" && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Todos os Usuários</CardTitle>
              <CardDescription>Gerencie todos os usuários do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {allUsersQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : allUsers.length > 0 ? (
                <div className="space-y-4">
                  {allUsers.map((user: any) => (
                    <div
                      key={user.id}
                      className="p-4 border border-border rounded-lg hover:bg-accent/50 transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{user.name}</h3>
                            <div className="flex gap-1">
                              {user.role === "admin" && (
                                <Badge className="bg-purple-600 text-xs">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Admin
                                </Badge>
                              )}
                              {user.isAuthorized ? (
                                <Badge variant="default" className="text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Autorizado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Pendente
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {formatDate(user.createdAt)}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {user.role !== "admin" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowPromoteDialog(true);
                              }}
                            >
                              <Shield className="w-4 h-4 mr-1" />
                              Promover Admin
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum usuário encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Promote Admin Dialog */}
        <Dialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Promover para Admin</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Tem certeza que deseja promover <strong>{selectedUser.name}</strong> para admin?
                </p>
                <p className="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
                  ⚠️ Admins têm acesso total ao sistema. Use com cuidado!
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowPromoteDialog(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    onClick={() => handlePromoteAdmin(selectedUser.id)}
                    disabled={promoteAdminMutation.isPending}
                  >
                    {promoteAdminMutation.isPending ? "Promovendo..." : "Confirmar"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
