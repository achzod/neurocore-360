import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  MessageSquare,
  FileText,
  Send,
  Eye,
  Calendar,
  Mail,
  UserX,
  AlertTriangle,
  Percent,
  Lock,
  ShieldCheck,
  Tag,
  Plus,
  Power,
  ToggleLeft,
  ToggleRight,
  Megaphone,
  Gift,
  Crown,
  Timer,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Review {
  id: string;
  auditId: string;
  userId?: string;
  email?: string;
  rating: number;
  comment: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

interface Audit {
  id: string;
  email: string;
  type: string;
  status: string;
  reportDeliveryStatus: string;
  reportSentAt?: string;
  createdAt: string;
  completedAt?: string;
}

interface IncompleteQuestionnaire {
  id: string;
  email: string;
  currentSection: number;
  totalSections: number;
  percentComplete: number;
  status: string;
  startedAt: string;
  lastActivityAt: string;
}

interface PromoCode {
  id: string;
  code: string;
  discountPercent: number;
  description: string | null;
  validFor: string;
  maxUses: number | null;
  currentUses: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const ADMIN_ENV_KEY = import.meta.env.VITE_ADMIN_KEY || "";

const getAuditReportUrl = (audit: Audit) => {
  if (audit.type === "GRATUIT") return `/scan/${audit.id}`;
  if (audit.type === "PREMIUM") return `/anabolic/${audit.id}`;
  if (audit.type === "ELITE") return `/ultimate/${audit.id}`;
  if (audit.type === "BLOOD_ANALYSIS") return `/blood-analysis/${audit.id}`;
  if (audit.type === "PEPTIDES") return `/peptides/${audit.id}`;
  return `/dashboard/${audit.id}`;
};

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem("admin_auth") === "true";
  });
  const [password, setPassword] = useState("");
  const [adminKey, setAdminKey] = useState<string | null>(() => sessionStorage.getItem("admin_key"));
  const [passwordError, setPasswordError] = useState(false);
  const [activeTab, setActiveTab] = useState("relances");
  const [audits, setAudits] = useState<Audit[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [incompleteQuestionnaires, setIncompleteQuestionnaires] = useState<IncompleteQuestionnaire[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [newPromo, setNewPromo] = useState({
    code: "",
    discountPercent: 20,
    description: "",
    validFor: "ALL",
    maxUses: "",
    expiresAt: "",
  });
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  const validateAdminKey = async (key: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/admin/reviews/pending", {
        headers: { "x-admin-key": key },
      });
      const data = await response.json();
      return response.ok && data?.success === true;
    } catch {
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(false);
    setIsLoading(true);
    const key = password.trim();
    const ok = key.length > 0 && (await validateAdminKey(key));
    if (ok) {
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_auth", "true");
      sessionStorage.setItem("admin_key", key);
      setAdminKey(key);
    } else {
      setPasswordError(true);
      sessionStorage.removeItem("admin_auth");
      sessionStorage.removeItem("admin_key");
      setAdminKey(null);
    }
    setIsLoading(false);
  };
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showCtaModal, setShowCtaModal] = useState(false);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [ctaSubject, setCtaSubject] = useState("");
  const [ctaMessage, setCtaMessage] = useState("");
  const { toast } = useToast();

  const handleAdminResponse = async (response: Response) => {
    const data = await response.json();
    if (response.status === 401) {
      setIsAuthenticated(false);
      sessionStorage.removeItem("admin_auth");
      sessionStorage.removeItem("admin_key");
      setAdminKey(null);
      toast({
        title: "Clé admin invalide",
        description: "Reconnecte-toi avec la bonne clé.",
        variant: "destructive",
      });
      throw new Error("Unauthorized");
    }
    if (!response.ok || !data.success) {
      throw new Error(data?.error || "Acces admin refuse");
    }
    return data;
  };

  useEffect(() => {
    if (!isAuthenticated || !adminKey) return;
    (async () => {
      const ok = await validateAdminKey(adminKey);
      if (!ok) {
        setIsAuthenticated(false);
        sessionStorage.removeItem("admin_auth");
        sessionStorage.removeItem("admin_key");
        setAdminKey(null);
        toast({
          title: "Clé admin invalide",
          description: "Reconnecte-toi avec la bonne clé.",
          variant: "destructive",
        });
      }
    })();
  }, [adminKey, isAuthenticated, toast]);

  const fetchAudits = async () => {
    if (!adminKey) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/audits", {
        headers: { "x-admin-key": adminKey },
      });
      const data = await handleAdminResponse(response);
      setAudits(data.audits);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les audits",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingReviews = async () => {
    if (!adminKey) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/reviews/pending", {
        headers: { "x-admin-key": adminKey },
      });
      const data = await handleAdminResponse(response);
      setReviews(data.reviews);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les avis",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIncompleteQuestionnaires = async () => {
    if (!adminKey) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/incomplete-questionnaires", {
        headers: { "x-admin-key": adminKey },
      });
      const data = await handleAdminResponse(response);
      setIncompleteQuestionnaires(data.questionnaires);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les questionnaires incomplets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPromoCodes = async () => {
    if (!adminKey) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/promo-codes", {
        headers: { "x-admin-key": adminKey },
      });
      const data = await handleAdminResponse(response);
      setPromoCodes(data.codes);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les codes promo",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePromo = async () => {
    if (!adminKey) {
      toast({
        title: "Clé admin manquante",
        description: "Reconnecte-toi avec la clé admin pour gérer les codes promo.",
        variant: "destructive",
      });
      return;
    }

    if (!newPromo.code || !newPromo.discountPercent) {
      toast({
        title: "Erreur",
        description: "Code et réduction requis",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({
          code: newPromo.code.toUpperCase(),
          discountPercent: newPromo.discountPercent,
          description: newPromo.description || null,
          validFor: newPromo.validFor,
          maxUses: newPromo.maxUses ? parseInt(newPromo.maxUses) : null,
          expiresAt: newPromo.expiresAt || null,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Code promo créé",
          description: `Le code ${newPromo.code.toUpperCase()} a été créé`,
        });
        setShowPromoModal(false);
        setNewPromo({ code: "", discountPercent: 20, description: "", validFor: "ALL", maxUses: "", expiresAt: "" });
        fetchPromoCodes();
      } else {
        toast({
          title: "Erreur",
          description: data.error || "Impossible de créer le code promo",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le code promo",
        variant: "destructive",
      });
    }
  };

  const handleTogglePromo = async (promo: PromoCode) => {
    if (!adminKey) return;
    try {
      const response = await fetch(`/api/admin/promo-codes/${promo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ isActive: !promo.isActive }),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: promo.isActive ? "Code désactivé" : "Code activé",
          description: `Le code ${promo.code} a été ${promo.isActive ? "désactivé" : "activé"}`,
        });
        fetchPromoCodes();
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le code promo",
        variant: "destructive",
      });
    }
  };

  const sendSequenceEmail = async (auditId: string, emailType: string, emailLabel: string) => {
    if (!adminKey) return;
    setSendingEmailId(`${auditId}-${emailType}`);
    try {
      const response = await fetch("/api/admin/send-sequence-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ auditId, emailType }),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Email envoyé !",
          description: data.message,
        });
      } else {
        toast({
          title: "Erreur",
          description: data.error || "Impossible d'envoyer l'email",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'email",
        variant: "destructive",
      });
    } finally {
      setSendingEmailId(null);
    }
  };

  // Helper function to calculate days since report sent
  const getDaysSinceSent = (reportSentAt?: string) => {
    if (!reportSentAt) return null;
    const sentDate = new Date(reportSentAt);
    const now = new Date();
    return Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Fetch all data on mount for tab counts
  useEffect(() => {
    if (isAuthenticated) {
      fetchAudits();
      fetchPendingReviews();
      fetchIncompleteQuestionnaires();
      fetchPromoCodes();
    }
  }, [isAuthenticated, adminKey]);

  // Refresh current tab data when switching
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === "audits") {
      fetchAudits();
    } else if (activeTab === "reviews") {
      fetchPendingReviews();
    } else if (activeTab === "incomplete") {
      fetchIncompleteQuestionnaires();
    } else if (activeTab === "promo") {
      fetchPromoCodes();
    }
  }, [activeTab, isAuthenticated, adminKey]);

  const handleApprove = async (reviewId: string) => {
    if (!adminKey) return;
    setProcessingId(reviewId);
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ reviewedBy: "admin" }),
      });
      const data = await response.json();
      if (data.success) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
        toast({
          title: "Avis approuvé",
          description: "L'avis sera affiché sur le site",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'approuver l'avis",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (reviewId: string) => {
    if (!adminKey) return;
    setProcessingId(reviewId);
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ reviewedBy: "admin" }),
      });
      const data = await response.json();
      if (data.success) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
        toast({
          title: "Avis rejeté",
          description: "L'avis ne sera pas affiché",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de rejeter l'avis",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSendCTA = async () => {
    if (!adminKey) {
      toast({
        title: "Clé admin manquante",
        description: "Reconnecte-toi pour envoyer un message.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedAuditId || !ctaSubject || !ctaMessage) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/admin/send-cta", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey || "" },
        body: JSON.stringify({
          auditId: selectedAuditId,
          subject: ctaSubject,
          message: ctaMessage,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "CTA envoyé",
          description: "Le message a été envoyé avec succès",
        });
        setShowCtaModal(false);
        setCtaSubject("");
        setCtaMessage("");
        setSelectedAuditId(null);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le CTA",
        variant: "destructive",
      });
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      COMPLETED: "default",
      IN_PROGRESS: "secondary",
      PENDING: "outline",
      READY: "default",
      GENERATING: "secondary",
    };
    return (
      <Badge variant={variants[status] || "outline"}>{status}</Badge>
    );
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md px-4"
        >
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Admin Dashboard</CardTitle>
              <p className="text-muted-foreground">Accès réservé</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Entrez le mot de passe"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`pl-10 ${passwordError ? "border-red-500" : ""}`}
                    />
                  </div>
                  {passwordError && (
                    <p className="text-sm text-red-500">Mot de passe incorrect</p>
                  )}
                </div>
                <Button type="submit" className="w-full">
                  Accéder au dashboard
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Dashboard Admin</h1>
          <p className="text-muted-foreground">Gestion des audits et avis</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="relances" className="gap-2">
              <Megaphone className="w-4 h-4" />
              Relances
            </TabsTrigger>
            <TabsTrigger value="audits" className="gap-2">
              <FileText className="w-4 h-4" />
              Analyses envoyées ({audits.filter(a => a.reportDeliveryStatus === "SENT").length})
            </TabsTrigger>
            <TabsTrigger value="incomplete" className="gap-2">
              <UserX className="w-4 h-4" />
              Abandons ({incompleteQuestionnaires.length})
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2">
              <Star className="w-4 h-4" />
              Avis ({reviews.length})
            </TabsTrigger>
            <TabsTrigger value="promo" className="gap-2">
              <Tag className="w-4 h-4" />
              Codes promo
            </TabsTrigger>
          </TabsList>

          {/* Tab: Relances */}
          <TabsContent value="relances">
            <div className="space-y-8">
              {/* Section: Abandons questionnaire */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <UserX className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Abandons questionnaire</h3>
                    <p className="text-sm text-muted-foreground">Relancer avec code ANALYSE20 (-20%)</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">{incompleteQuestionnaires.length}</Badge>
                </div>
                {incompleteQuestionnaires.length === 0 ? (
                  <Card><CardContent className="py-8 text-center text-muted-foreground">Aucun abandon</CardContent></Card>
                ) : (
                  <div className="grid gap-3">
                    {incompleteQuestionnaires.slice(0, 5).map((q) => (
                      <Card key={q.id}>
                        <CardContent className="py-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium">{q.email}</p>
                            <p className="text-sm text-muted-foreground">{q.percentComplete}% complété</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedAuditId(q.id);
                              setCtaSubject("Ton audit APEXLABS t'attend + Code -20% !");
                              setCtaMessage(`Salut !\n\nJ'ai vu que tu avais commencé ton questionnaire APEXLABS mais que tu ne l'as pas terminé.\n\nTu en étais à ${q.percentComplete}% - plus que quelques questions et tu auras accès à ton analyse personnalisée complète !\n\nEn bonus, utilise le code ANALYSE20 pour -20% sur l'analyse Anabolic !\n\nClique ici pour reprendre où tu en étais : ${window.location.origin}/audit-complet/questionnaire\n\nÀ très vite,\nAchzod`);
                              setShowCtaModal(true);
                            }}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Relancer
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Section: GRATUIT - Upsell Anabolic */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Gift className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Analyses GRATUITES</h3>
                    <p className="text-sm text-muted-foreground">Upsell Anabolic avec code ANALYSE20 (-20%)</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {audits.filter(a => a.type === "GRATUIT" && a.reportDeliveryStatus === "SENT").length}
                  </Badge>
                </div>
                {audits.filter(a => a.type === "GRATUIT" && a.reportDeliveryStatus === "SENT").length === 0 ? (
                  <Card><CardContent className="py-8 text-center text-muted-foreground">Aucune analyse gratuite</CardContent></Card>
                ) : (
                  <div className="grid gap-3">
                    {audits.filter(a => a.type === "GRATUIT" && a.reportDeliveryStatus === "SENT").slice(0, 5).map((audit) => {
                      const days = getDaysSinceSent(audit.reportSentAt);
                      return (
                        <Card key={audit.id}>
                          <CardContent className="py-3 flex items-center justify-between">
                            <div>
                              <p className="font-medium">{audit.email}</p>
                              <p className="text-sm text-muted-foreground">
                                {days !== null ? `Envoyé il y a ${days} jour${days > 1 ? 's' : ''}` : 'Envoyé'}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="default"
                              disabled={sendingEmailId === `${audit.id}-GRATUIT_UPSELL`}
                              onClick={() => sendSequenceEmail(audit.id, "GRATUIT_UPSELL", "Upsell")}
                            >
                              {sendingEmailId === `${audit.id}-GRATUIT_UPSELL` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Send className="w-4 h-4 mr-2" />
                                  Envoyer Upsell
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section: PREMIUM J+7 */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Crown className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">PREMIUM J+7</h3>
                    <p className="text-sm text-muted-foreground">Demande avis + CTA coaching NEUROCORE20 (-20%)</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {audits.filter(a => (a.type === "PREMIUM" || a.type === "ELITE") && a.reportDeliveryStatus === "SENT" && getDaysSinceSent(a.reportSentAt) !== null && getDaysSinceSent(a.reportSentAt)! >= 7).length}
                  </Badge>
                </div>
                {(() => {
                  const j7Audits = audits.filter(a =>
                    (a.type === "PREMIUM" || a.type === "ELITE") &&
                    a.reportDeliveryStatus === "SENT" &&
                    getDaysSinceSent(a.reportSentAt) !== null &&
                    getDaysSinceSent(a.reportSentAt)! >= 7
                  );
                  return j7Audits.length === 0 ? (
                    <Card><CardContent className="py-8 text-center text-muted-foreground">Aucun audit Anabolic/Ultimate de +7 jours</CardContent></Card>
                  ) : (
                    <div className="grid gap-3">
                      {j7Audits.slice(0, 5).map((audit) => {
                        const days = getDaysSinceSent(audit.reportSentAt);
                        return (
                          <Card key={audit.id}>
                            <CardContent className="py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge variant={audit.type === "ELITE" ? "default" : "secondary"}>
                                  {audit.type}
                                </Badge>
                                <div>
                                  <p className="font-medium">{audit.email}</p>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Timer className="w-3 h-3" />
                                    J+{days}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-purple-600 hover:bg-purple-700"
                                disabled={sendingEmailId === `${audit.id}-PREMIUM_J7`}
                                onClick={() => sendSequenceEmail(audit.id, "PREMIUM_J7", "J+7")}
                              >
                                {sendingEmailId === `${audit.id}-PREMIUM_J7` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Send className="w-4 h-4 mr-2" />
                                    CTA J+7
                                  </>
                                )}
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Section: PREMIUM J+14 */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">PREMIUM J+14 (Dernière chance)</h3>
                    <p className="text-sm text-muted-foreground">Relance si J+7 non ouvert - NEUROCORE20</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {audits.filter(a => (a.type === "PREMIUM" || a.type === "ELITE") && a.reportDeliveryStatus === "SENT" && getDaysSinceSent(a.reportSentAt) !== null && getDaysSinceSent(a.reportSentAt)! >= 14).length}
                  </Badge>
                </div>
                {(() => {
                  const j14Audits = audits.filter(a =>
                    (a.type === "PREMIUM" || a.type === "ELITE") &&
                    a.reportDeliveryStatus === "SENT" &&
                    getDaysSinceSent(a.reportSentAt) !== null &&
                    getDaysSinceSent(a.reportSentAt)! >= 14
                  );
                  return j14Audits.length === 0 ? (
                    <Card><CardContent className="py-8 text-center text-muted-foreground">Aucun audit Anabolic/Ultimate de +14 jours</CardContent></Card>
                  ) : (
                    <div className="grid gap-3">
                      {j14Audits.slice(0, 5).map((audit) => {
                        const days = getDaysSinceSent(audit.reportSentAt);
                        return (
                          <Card key={audit.id}>
                            <CardContent className="py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge variant={audit.type === "ELITE" ? "default" : "secondary"}>
                                  {audit.type}
                                </Badge>
                                <div>
                                  <p className="font-medium">{audit.email}</p>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Timer className="w-3 h-3" />
                                    J+{days}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-amber-600 hover:bg-amber-700"
                                disabled={sendingEmailId === `${audit.id}-PREMIUM_J14`}
                                onClick={() => sendSequenceEmail(audit.id, "PREMIUM_J14", "J+14")}
                              >
                                {sendingEmailId === `${audit.id}-PREMIUM_J14` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Send className="w-4 h-4 mr-2" />
                                    CTA J+14
                                  </>
                                )}
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audits">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Analyses envoyées</h2>
                <p className="text-muted-foreground text-sm mt-1">Rapports générés et envoyés aux clients</p>
              </div>
              <Button
                variant="outline"
                onClick={fetchAudits}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Actualiser
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : audits.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold">Aucun audit</h3>
                  <p className="text-muted-foreground mt-2">
                    Aucun audit trouvé
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {audits.map((audit, index) => (
                  <motion.div
                    key={audit.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <CardTitle className="text-lg">
                                Audit {audit.id.substring(0, 8)}...
                              </CardTitle>
                              {getStatusBadge(audit.status)}
                              {getStatusBadge(audit.reportDeliveryStatus)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                {audit.email}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(audit.createdAt).toLocaleDateString("fr-FR")}
                              </div>
                              <Badge variant="outline">{audit.type}</Badge>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAuditId(audit.id);
                              setShowCtaModal(true);
                            }}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Envoyer CTA
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(getAuditReportUrl(audit), "_blank")}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Voir le rapport
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Modération des avis</h2>
              <Button
                variant="outline"
                onClick={fetchPendingReviews}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Actualiser
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : reviews.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-primary mb-4" />
                  <h3 className="text-xl font-semibold">Aucun avis en attente</h3>
                  <p className="text-muted-foreground mt-2">
                    Tous les avis ont été modérés
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {reviews.map((review, index) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {renderStars(review.rating)}
                              <Badge variant="outline">
                                <Clock className="w-3 h-3 mr-1" />
                                En attente
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Audit: {review.auditId.substring(0, 8)}... | 
                              {review.email && ` ${review.email} | `}
                              {new Date(review.createdAt).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-start gap-3 mb-4">
                          <MessageSquare className="w-5 h-5 text-muted-foreground mt-0.5" />
                          <p className="text-base">{review.comment}</p>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleApprove(review.id)}
                            disabled={processingId === review.id}
                            className="flex-1"
                          >
                            {processingId === review.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                            )}
                            Approuver
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleReject(review.id)}
                            disabled={processingId === review.id}
                            className="flex-1"
                          >
                            {processingId === review.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4 mr-2" />
                            )}
                            Rejeter
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Questionnaires incomplets */}
          <TabsContent value="incomplete">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Questionnaires abandonnés</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Utilisateurs ayant commencé mais pas terminé le questionnaire
                </p>
              </div>
              <Button
                variant="outline"
                onClick={fetchIncompleteQuestionnaires}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Actualiser
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : incompleteQuestionnaires.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                  <h3 className="text-xl font-semibold">Aucun abandon</h3>
                  <p className="text-muted-foreground mt-2">
                    Tous les utilisateurs ont terminé leur questionnaire
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {incompleteQuestionnaires.map((q, index) => {
                  const lastActive = new Date(q.lastActivityAt);
                  const daysSinceActive = Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
                  const isRecent = daysSinceActive < 1;
                  const isStale = daysSinceActive > 7;

                  return (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className={isRecent ? "border-amber-500/50" : isStale ? "border-red-500/30" : ""}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Mail className="w-4 h-4" />
                                  {q.email}
                                </CardTitle>
                                <Badge variant={isRecent ? "default" : isStale ? "destructive" : "secondary"}>
                                  {isRecent ? "Récent" : isStale ? "Froid" : "Tiède"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  Commencé le {new Date(q.startedAt).toLocaleDateString("fr-FR")}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  Dernière activité: {daysSinceActive === 0 ? "Aujourd'hui" : `il y a ${daysSinceActive}j`}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2 mb-1">
                                <Percent className="w-4 h-4 text-primary" />
                                <span className="text-2xl font-bold text-primary">{q.percentComplete}%</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Section {q.currentSection + 1}/{q.totalSections}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {/* Progress bar */}
                          <div className="mb-4">
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${q.percentComplete}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                setSelectedAuditId(q.id);
                                setCtaSubject("Ton audit APEXLABS t'attend + Code -20% !");
                                setCtaMessage(`Salut !\n\nJ'ai vu que tu avais commencé ton questionnaire APEXLABS mais que tu ne l'as pas terminé.\n\nTu en étais à ${q.percentComplete}% - plus que quelques questions et tu auras accès à ton analyse personnalisée complète !\n\nEn bonus, utilise le code ANALYSE20 pour -20% sur l'analyse Anabolic !\n\nClique ici pour reprendre où tu en étais : ${window.location.origin}/audit-complet/questionnaire\n\nÀ très vite,\nAchzod`);
                                setShowCtaModal(true);
                              }}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Relancer par email
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab: Codes promo */}
          <TabsContent value="promo">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Gestion des codes promo</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Créez et gérez les codes de réduction
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={fetchPromoCodes}
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  Actualiser
                </Button>
                <Button onClick={() => setShowPromoModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau code
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : promoCodes.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Tag className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold">Aucun code promo</h3>
                  <p className="text-muted-foreground mt-2">
                    Créez votre premier code promo
                  </p>
                  <Button className="mt-4" onClick={() => setShowPromoModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer un code
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {promoCodes.map((promo, index) => (
                  <motion.div
                    key={promo.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={!promo.isActive ? "opacity-60" : ""}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <CardTitle className="text-xl font-mono">
                                {promo.code}
                              </CardTitle>
                              <Badge variant={promo.isActive ? "default" : "secondary"}>
                                {promo.isActive ? "Actif" : "Inactif"}
                              </Badge>
                              <Badge variant="outline" className="text-lg font-bold">
                                -{promo.discountPercent}%
                              </Badge>
                            </div>
                            {promo.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {promo.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Tag className="w-4 h-4" />
                                Valide pour: {promo.validFor === "ALL" ? "Tous" : promo.validFor}
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                Utilisations: {promo.currentUses}{promo.maxUses ? `/${promo.maxUses}` : ""}
                              </div>
                              {promo.expiresAt && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  Expire: {new Date(promo.expiresAt).toLocaleDateString("fr-FR")}
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant={promo.isActive ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleTogglePromo(promo)}
                          >
                            {promo.isActive ? (
                              <>
                                <ToggleRight className="w-4 h-4 mr-2" />
                                Désactiver
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-4 h-4 mr-2" />
                                Activer
                              </>
                            )}
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal Nouveau Code Promo */}
      {showPromoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Nouveau code promo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Code *</Label>
                <Input
                  value={newPromo.code}
                  onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                  placeholder="Ex: PROMO2024"
                  className="font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Réduction (%) *</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={newPromo.discountPercent}
                    onChange={(e) => setNewPromo({ ...newPromo, discountPercent: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Valide pour</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newPromo.validFor}
                    onChange={(e) => setNewPromo({ ...newPromo, validFor: e.target.value })}
                  >
                    <option value="ALL">Tous les audits</option>
                    <option value="PREMIUM">Anabolic uniquement</option>
                    <option value="ELITE">Ultimate uniquement</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={newPromo.description}
                  onChange={(e) => setNewPromo({ ...newPromo, description: e.target.value })}
                  placeholder="Description du code promo"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Utilisations max</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newPromo.maxUses}
                    onChange={(e) => setNewPromo({ ...newPromo, maxUses: e.target.value })}
                    placeholder="Illimité"
                  />
                </div>
                <div>
                  <Label>Date d'expiration</Label>
                  <Input
                    type="date"
                    value={newPromo.expiresAt}
                    onChange={(e) => setNewPromo({ ...newPromo, expiresAt: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => {
                  setShowPromoModal(false);
                  setNewPromo({ code: "", discountPercent: 20, description: "", validFor: "ALL", maxUses: "", expiresAt: "" });
                }}>
                  Annuler
                </Button>
                <Button onClick={handleCreatePromo}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer le code
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal CTA */}
      {showCtaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle>Envoyer un CTA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Objet *</Label>
                <Input
                  value={ctaSubject}
                  onChange={(e) => setCtaSubject(e.target.value)}
                  placeholder="Objet du message"
                />
              </div>
              <div>
                <Label>Message *</Label>
                <Textarea
                  value={ctaMessage}
                  onChange={(e) => setCtaMessage(e.target.value)}
                  placeholder="Contenu du message..."
                  rows={8}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCtaModal(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSendCTA}>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Footer />
    </div>
  );
}
