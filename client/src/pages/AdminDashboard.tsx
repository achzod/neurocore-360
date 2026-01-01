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
  createdAt: string;
  completedAt?: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("audits");
  const [audits, setAudits] = useState<Audit[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showCtaModal, setShowCtaModal] = useState(false);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [ctaSubject, setCtaSubject] = useState("");
  const [ctaMessage, setCtaMessage] = useState("");
  const { toast } = useToast();

  const fetchAudits = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/audits");
      const data = await response.json();
      if (data.success) {
        setAudits(data.audits);
      }
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
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/reviews/pending");
      const data = await response.json();
      if (data.success) {
        setReviews(data.reviews);
      }
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

  useEffect(() => {
    if (activeTab === "audits") {
      fetchAudits();
    } else {
      fetchPendingReviews();
    }
  }, [activeTab]);

  const handleApprove = async (reviewId: string) => {
    setProcessingId(reviewId);
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    setProcessingId(reviewId);
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Dashboard Admin</h1>
          <p className="text-muted-foreground">Gestion des audits et avis</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="audits">Audits</TabsTrigger>
            <TabsTrigger value="reviews">Avis en attente</TabsTrigger>
          </TabsList>

          <TabsContent value="audits">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Liste des audits</h2>
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
                            onClick={() => window.open(`/dashboard/${audit.id}`, "_blank")}
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
        </Tabs>
      </div>

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

