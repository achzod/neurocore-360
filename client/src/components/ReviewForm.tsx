import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Send, CheckCircle2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ReviewFormProps {
  auditId: string;
  onSubmit?: (review: { rating: number; comment: string }) => Promise<void>;
}

export function ReviewForm({ auditId, onSubmit }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditEmail, setAuditEmail] = useState<string | null>(null);
  const [auditType, setAuditType] = useState<string | null>(null);
  const [auditLoadError, setAuditLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (onSubmit || !auditId) return;

    const loadAudit = async () => {
      try {
        const response = await fetch(`/api/audits/${auditId}?light=1`);
        if (!response.ok) {
          throw new Error("Audit non trouvé");
        }
        const data = await response.json();
        const type = String(data.type || "").toUpperCase();
        const mappedType =
          type === "GRATUIT"
            ? "DISCOVERY"
            : type === "PREMIUM"
            ? "ANABOLIC_BIOSCAN"
            : type === "ELITE"
            ? "ULTIMATE_SCAN"
            : type === "BLOOD_ANALYSIS"
            ? "BLOOD_ANALYSIS"
            : type === "PEPTIDES"
            ? "PEPTIDES"
            : null;

        setAuditEmail(data.email || null);
        setAuditType(mappedType);
      } catch (err) {
        console.error("ReviewForm audit load failed:", err);
        setAuditLoadError("Impossible de charger l'audit.");
      }
    };

    loadAudit();
  }, [auditId, onSubmit]);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Veuillez sélectionner une note");
      return;
    }
    if (comment.length < 10) {
      setError("Le commentaire doit contenir au moins 10 caractères");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (onSubmit) {
        await onSubmit({ rating, comment });
      } else {
        if (!auditEmail || !auditType) {
          throw new Error("Email ou type d'audit manquant");
        }
        const response = await fetch("/api/submit-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auditId, rating, comment, email: auditEmail, auditType }),
        });
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Erreur lors de la soumission");
        }
      }
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la soumission");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="border-primary/20 bg-primary/5" data-testid="card-review-success">
        <CardContent className="py-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex flex-col items-center text-center gap-4"
          >
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Merci pour votre avis !</h3>
              <p className="text-muted-foreground mt-2">
                Votre retour sera examiné et publié prochainement.
              </p>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50" data-testid="card-review-form">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          Donnez votre avis sur cet audit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm font-medium mb-3 block">Votre note</label>
          <div className="flex gap-2" data-testid="rating-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110"
                data-testid={`button-star-${star}`}
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoverRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              {rating === 1 && "Décevant"}
              {rating === 2 && "Peut mieux faire"}
              {rating === 3 && "Correct"}
              {rating === 4 && "Très bien"}
              {rating === 5 && "Excellent !"}
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Votre commentaire
          </label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Partagez votre expérience avec cet audit 360..."
            className="min-h-[120px] resize-none"
            data-testid="textarea-comment"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {comment.length}/10 caractères minimum
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-destructive"
              data-testid="text-error"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
        {auditLoadError && (
          <p className="text-xs text-destructive">{auditLoadError}</p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full"
          data-testid="button-submit-review"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Envoyer mon avis
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export default ReviewForm;
