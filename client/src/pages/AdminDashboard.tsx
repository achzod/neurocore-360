import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Users,
  FileText,
  Mail,
  Star,
  RefreshCw,
  Eye,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  Megaphone,
  Shield,
  ArrowLeft,
} from "lucide-react";
import type { Audit } from "@shared/schema";

interface AdminReview {
  id: string;
  auditId: string;
  userId?: string;
  rating: number;
  comment: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface AdminStats {
  totalAudits: number;
  pendingReports: number;
  sentReports: number;
  failedReports: number;
  totalReviews: number;
  pendingReviews: number;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [adminKey, setAdminKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ctaSubject, setCtaSubject] = useState("");
  const [ctaMessage, setCtaMessage] = useState("");
  const [ctaTargetType, setCtaTargetType] = useState<string>("all");

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats", adminKey],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch("/api/admin/stats", {
        headers: { "x-admin-key": adminKey },
      });
      if (!res.ok) throw new Error("Erreur de chargement");
      return res.json();
    },
  });

  const { data: audits, isLoading: auditsLoading, refetch: refetchAudits } = useQuery<Audit[]>({
    queryKey: ["/api/admin/audits", adminKey],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch("/api/admin/audits", {
        headers: { "x-admin-key": adminKey },
      });
      if (!res.ok) throw new Error("Erreur de chargement");
      return res.json();
    },
  });

  const { data: pendingReviews, isLoading: reviewsLoading, refetch: refetchReviews } = useQuery<AdminReview[]>({
    queryKey: ["/api/admin/reviews/pending", adminKey],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch("/api/admin/reviews/pending", {
        headers: { "x-admin-key": adminKey },
      });
      if (!res.ok) throw new Error("Erreur de chargement");
      return res.json();
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async (auditId: string) => {
      return apiRequest("POST", `/api/admin/audits/${auditId}/regenerate`, { adminKey });
    },
    onSuccess: () => {
      toast({ title: "Regénération lancée", description: "Le rapport est en cours de génération" });
      refetchAudits();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de relancer la génération", variant: "destructive" });
    },
  });

  const resendEmailMutation = useMutation({
    mutationFn: async (auditId: string) => {
      return apiRequest("POST", `/api/admin/audits/${auditId}/resend-email`, { adminKey });
    },
    onSuccess: () => {
      toast({ title: "Email renvoyé", description: "L'email a été envoyé avec succès" });
      refetchAudits();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de renvoyer l'email", variant: "destructive" });
    },
  });

  const approveReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      return apiRequest("POST", `/api/admin/reviews/${reviewId}/approve`, { adminKey, reviewedBy: "admin" });
    },
    onSuccess: () => {
      toast({ title: "Avis approuvé", description: "L'avis est maintenant visible publiquement" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews/pending", adminKey] });
    },
  });

  const rejectReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      return apiRequest("POST", `/api/admin/reviews/${reviewId}/reject`, { adminKey, reviewedBy: "admin" });
    },
    onSuccess: () => {
      toast({ title: "Avis rejeté", description: "L'avis a été supprimé" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews/pending", adminKey] });
    },
  });

  const sendCtaMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/cta/send", {
        adminKey,
        subject: ctaSubject,
        message: ctaMessage,
        targetType: ctaTargetType,
      });
      return res.json();
    },
    onSuccess: (data: { sentCount: number }) => {
      toast({
        title: "CTA envoyé",
        description: `Email envoyé à ${data.sentCount} destinataires`,
      });
      setCtaSubject("");
      setCtaMessage("");
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'envoyer le CTA", variant: "destructive" });
    },
  });

  const handleLogin = async () => {
    try {
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey }),
      });
      if (response.ok) {
        setIsAuthenticated(true);
        toast({ title: "Connecté", description: "Bienvenue dans l'admin" });
      } else {
        toast({ title: "Erreur", description: "Clé admin invalide", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur de connexion", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: JSX.Element }> = {
      PENDING: { color: "bg-yellow-500/20 text-yellow-600", icon: <Clock className="h-3 w-3" /> },
      GENERATING: { color: "bg-blue-500/20 text-blue-600", icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
      READY: { color: "bg-green-500/20 text-green-600", icon: <CheckCircle className="h-3 w-3" /> },
      SENT: { color: "bg-primary/20 text-primary", icon: <Mail className="h-3 w-3" /> },
      FAILED: { color: "bg-red-500/20 text-red-600", icon: <XCircle className="h-3 w-3" /> },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <Badge variant="outline" className={`gap-1 ${config.color}`}>
        {config.icon}
        {status}
      </Badge>
    );
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-primary" />
            <CardTitle>Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Clé admin"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              data-testid="input-admin-key"
            />
            <Button className="w-full" onClick={handleLogin} data-testid="button-admin-login">
              Connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">NEUROCORE Admin</h1>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary">
            Connecté
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4">
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalAudits || 0}</p>
                <p className="text-sm text-muted-foreground">Total Audits</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pendingReports || 0}</p>
                <p className="text-sm text-muted-foreground">En attente</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-green-500/10 p-3">
                <Mail className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.sentReports || 0}</p>
                <p className="text-sm text-muted-foreground">Rapports envoyés</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-yellow-500/10 p-3">
                <Star className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pendingReviews || 0}</p>
                <p className="text-sm text-muted-foreground">Avis en attente</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="audits" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="audits" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Audits
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2">
              <Star className="h-4 w-4" />
              Avis
            </TabsTrigger>
            <TabsTrigger value="cta" className="gap-2">
              <Megaphone className="h-4 w-4" />
              CTA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audits" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-lg">Liste des Audits</CardTitle>
                <Button variant="outline" size="sm" onClick={() => refetchAudits()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualiser
                </Button>
              </CardHeader>
              <CardContent>
                {auditsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Chargement...</div>
                ) : !audits?.length ? (
                  <div className="py-8 text-center text-muted-foreground">Aucun audit</div>
                ) : (
                  <div className="space-y-3">
                    {audits.map((audit) => (
                      <div
                        key={audit.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                        data-testid={`audit-row-${audit.id}`}
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{audit.email}</span>
                            <Badge variant="outline">{audit.type}</Badge>
                            {getStatusBadge(audit.reportDeliveryStatus)}
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span>Créé: {formatDate(audit.createdAt)}</span>
                            {audit.reportGeneratedAt && (
                              <span>Généré: {formatDate(audit.reportGeneratedAt)}</span>
                            )}
                            {audit.reportSentAt && (
                              <span>Envoyé: {formatDate(audit.reportSentAt)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/dashboard/${audit.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="mr-2 h-4 w-4" />
                              Voir
                            </Button>
                          </Link>
                          {audit.reportDeliveryStatus === "FAILED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => regenerateMutation.mutate(audit.id)}
                              disabled={regenerateMutation.isPending}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Regénérer
                            </Button>
                          )}
                          {(audit.reportDeliveryStatus === "READY" || audit.reportDeliveryStatus === "SENT") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resendEmailMutation.mutate(audit.id)}
                              disabled={resendEmailMutation.isPending}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              Renvoyer
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-lg">Avis en attente de validation</CardTitle>
                <Button variant="outline" size="sm" onClick={() => refetchReviews()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualiser
                </Button>
              </CardHeader>
              <CardContent>
                {reviewsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Chargement...</div>
                ) : !pendingReviews?.length ? (
                  <div className="py-8 text-center text-muted-foreground">Aucun avis en attente</div>
                ) : (
                  <div className="space-y-4">
                    {pendingReviews.map((review) => (
                      <div
                        key={review.id}
                        className="rounded-lg border p-4"
                        data-testid={`review-row-${review.id}`}
                      >
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Audit: {review.auditId.slice(0, 8)}...</span>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-3 w-3 ${star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => approveReviewMutation.mutate(review.id)}
                              disabled={approveReviewMutation.isPending}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approuver
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => rejectReviewMutation.mutate(review.id)}
                              disabled={rejectReviewMutation.isPending}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Rejeter
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cta" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Envoyer une campagne CTA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cible</label>
                  <Select value={ctaTargetType} onValueChange={setCtaTargetType}>
                    <SelectTrigger data-testid="select-cta-target">
                      <SelectValue placeholder="Sélectionner la cible" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les utilisateurs</SelectItem>
                      <SelectItem value="premium">Clients Premium</SelectItem>
                      <SelectItem value="gratuit">Utilisateurs Gratuit (conversion)</SelectItem>
                      <SelectItem value="abandoned">Questionnaires abandonnés</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sujet de l'email</label>
                  <Input
                    placeholder="Ex: Votre transformation commence maintenant"
                    value={ctaSubject}
                    onChange={(e) => setCtaSubject(e.target.value)}
                    data-testid="input-cta-subject"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    placeholder="Rédigez votre message marketing..."
                    value={ctaMessage}
                    onChange={(e) => setCtaMessage(e.target.value)}
                    rows={6}
                    data-testid="input-cta-message"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => sendCtaMutation.mutate()}
                  disabled={sendCtaMutation.isPending || !ctaSubject || !ctaMessage}
                  data-testid="button-send-cta"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {sendCtaMutation.isPending ? "Envoi en cours..." : "Envoyer la campagne"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Templates CTA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className="hover-elevate cursor-pointer rounded-lg border p-4"
                  onClick={() => {
                    setCtaSubject("Votre audit NEUROCORE vous attend");
                    setCtaMessage(
                      `Bonjour,\n\nVous avez commencé votre Audit Métabolique NEUROCORE mais ne l'avez pas terminé.\n\nVos réponses sont sauvegardées et vous attendent. Finalisez votre questionnaire en moins de 10 minutes pour recevoir votre rapport personnalisé.\n\nReprenez là où vous vous êtes arrêté :\nhttps://neurocore360.replit.app/audit-complet/questionnaire\n\nÀ très vite,\nL'équipe NEUROCORE`
                    );
                    setCtaTargetType("abandoned");
                  }}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <div>
                      <div className="font-medium">Relance questionnaire abandonné</div>
                      <div className="text-sm text-muted-foreground">
                        Rappel pour terminer le questionnaire
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className="hover-elevate cursor-pointer rounded-lg border p-4"
                  onClick={() => {
                    setCtaSubject("Passez au niveau supérieur avec Premium");
                    setCtaMessage(
                      `Bonjour,\n\nVotre audit gratuit NEUROCORE vous a donné un aperçu de votre potentiel métabolique.\n\nPour aller plus loin et recevoir votre plan d'action personnalisé complet avec :\n- Analyse détaillée de vos 15 domaines de santé\n- Protocoles de suppléments optimisés\n- Plan d'action sur 30 jours\n\nPassez à Premium pour seulement 79€ :\nhttps://neurocore360.replit.app/audit-complet/checkout\n\nOffre limitée : -20% avec le code TRANSFORM20\n\nL'équipe NEUROCORE`
                    );
                    setCtaTargetType("gratuit");
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Star className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">Conversion Gratuit vers Premium</div>
                      <div className="text-sm text-muted-foreground">
                        Inciter à passer au plan payant
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
