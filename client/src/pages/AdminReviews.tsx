import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface Review {
  id: string;
  auditId: string;
  userId?: string;
  email: string;
  auditType: 'DISCOVERY' | 'ANABOLIC_BIOSCAN' | 'ULTIMATE_SCAN' | 'BLOOD_ANALYSIS';
  rating: number;
  comment: string;
  status: "pending" | "approved" | "rejected";
  promoCode?: string;
  promoCodeSentAt?: string;
  adminNotes?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

const AUDIT_TYPE_LABELS: Record<string, string> = {
  'DISCOVERY': 'Discovery Scan',
  'ANABOLIC_BIOSCAN': 'Anabolic Bioscan',
  'ULTIMATE_SCAN': 'Ultimate Scan',
  'BLOOD_ANALYSIS': 'Blood Analysis',
};

const PROMO_CODES: Record<string, { code: string; description: string }> = {
  'DISCOVERY': { code: 'DISCOVERY20', description: '-20% coaching' },
  'ANABOLIC_BIOSCAN': { code: 'ANABOLICBIOSCAN', description: '59€ deduits' },
  'ULTIMATE_SCAN': { code: 'ULTIMATESCAN', description: '79€ deduits' },
  'BLOOD_ANALYSIS': { code: 'BLOOD', description: '99€ deduits' },
};

export default function AdminReviews() {
  const [, navigate] = useLocation();
  const [adminKey] = useState<string>(() => sessionStorage.getItem("admin_key") || import.meta.env.VITE_ADMIN_KEY || "");
  const isAuthenticated = sessionStorage.getItem("admin_auth") === "true";
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPendingReviews = async () => {
    if (!isAuthenticated || !adminKey) {
      setIsLoading(false);
      navigate("/admin");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/reviews/pending", {
        headers: { "x-admin-key": adminKey },
      });
      const data = await response.json();
      if (response.status === 401) {
        sessionStorage.removeItem("admin_auth");
        sessionStorage.removeItem("admin_key");
        toast({
          title: "Clé admin invalide",
          description: "Reconnecte-toi avec la bonne clé.",
          variant: "destructive",
        });
        navigate("/admin");
        return;
      }
      if (data.success) {
        setReviews(data.reviews);
      } else {
        throw new Error(data?.error || "Acces admin refuse");
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
    fetchPendingReviews();
  }, [adminKey, isAuthenticated]);

  const handleApprove = async (reviewId: string) => {
    if (!adminKey) return;
    const review = reviews.find(r => r.id === reviewId);
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
        const promoInfo = review ? PROMO_CODES[review.auditType] : null;
        toast({
          title: "Avis approuve",
          description: promoInfo
            ? `Code promo ${promoInfo.code} envoye a ${review?.email}`
            : "L'avis sera affiche sur le site",
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
          title: "Avis rejete",
          description: "L'avis ne sera pas affiche",
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Moderation des Avis</h1>
            <p className="text-muted-foreground mt-1">
              {reviews.length} avis en attente de validation
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchPendingReviews}
            disabled={isLoading}
            data-testid="button-refresh-reviews"
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
                Tous les avis ont ete moderes
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
                <Card data-testid={`card-review-${review.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {renderStars(review.rating)}
                          <Badge variant="outline">
                            <Clock className="w-3 h-3 mr-1" />
                            En attente
                          </Badge>
                          <Badge variant="secondary">
                            {AUDIT_TYPE_LABELS[review.auditType] || review.auditType}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{review.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Audit: {review.auditId.substring(0, 8)}... |{" "}
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

                    {/* Promo code info */}
                    {PROMO_CODES[review.auditType] && (
                      <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-sm">
                          <span className="font-medium text-primary">Code promo:</span>{" "}
                          <code className="font-mono bg-background px-1.5 py-0.5 rounded">
                            {PROMO_CODES[review.auditType].code}
                          </code>
                          <span className="text-muted-foreground ml-2">
                            ({PROMO_CODES[review.auditType].description})
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ce code sera envoye automatiquement a {review.email} apres approbation
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleApprove(review.id)}
                        disabled={processingId === review.id}
                        className="flex-1"
                        data-testid={`button-approve-${review.id}`}
                      >
                        {processingId === review.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                        )}
                        Approuver + Envoyer code
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleReject(review.id)}
                        disabled={processingId === review.id}
                        className="flex-1"
                        data-testid={`button-reject-${review.id}`}
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
      </div>

      <Footer />
    </div>
  );
}
