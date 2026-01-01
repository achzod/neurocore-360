import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { PRICING_PLANS } from "@shared/schema";
import {
  Check,
  Lock,
  Star,
  Shield,
  Zap,
  Gift,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Checkout() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [responses, setResponses] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const savedEmail = localStorage.getItem("neurocore_email");
    const savedResponses = localStorage.getItem("neurocore_responses");

    if (!savedEmail || !savedResponses) {
      navigate("/audit-complet/questionnaire");
      return;
    }

    setEmail(savedEmail);
    setResponses(JSON.parse(savedResponses));
  }, [navigate]);

  const STRIPE_PRICE_IDS: Record<string, string> = {
    premium: "price_1SisNBRDE5WXnLZXF6QIJuh4",
    elite: "price_1SisNCRDE5WXnLZXTk4obahF",
  };

  const createAuditMutation = useMutation({
    mutationFn: async (planId: string) => {
      const type = planId.toUpperCase() as "GRATUIT" | "PREMIUM" | "ELITE";
      
      if (planId === "gratuit") {
        return apiRequest("POST", "/api/audit/create", {
          email,
          type,
          responses,
        });
      } else {
        const response = await apiRequest("POST", "/api/stripe/create-checkout-session", {
          priceId: STRIPE_PRICE_IDS[planId],
          email,
          planType: type,
          responses,
        });
        return response.json();
      }
    },
    onSuccess: (data: any) => {
      if (selectedPlan === "gratuit") {
        toast({
          title: "Audit créé avec succès !",
          description: "Tu vas recevoir un email avec tes résultats.",
        });
        localStorage.removeItem("neurocore_responses");
        localStorage.removeItem("neurocore_section");
        navigate("/auth/check-email");
      } else if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue. Réessaie.",
        variant: "destructive",
      });
    },
  });

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleConfirm = () => {
    if (selectedPlan) {
      createAuditMutation.mutate(selectedPlan);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="mx-auto max-w-5xl px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <Badge variant="secondary" className="mb-4">
            Questionnaire complété
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Choisis ton niveau d'analyse
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Felicitations ! Tu as repondu aux 180 questions. Selectionne maintenant le niveau
            d'analyse qui te convient.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PRICING_PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
                  <Badge className="gap-1 px-3 py-1">
                    <Star className="h-3 w-3" />
                    Le + populaire
                  </Badge>
                </div>
              )}
              {"bestValue" in plan && plan.bestValue && (
                <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
                  <Badge variant="secondary" className="gap-1 bg-accent px-3 py-1 text-accent-foreground">
                    Best Value
                  </Badge>
                </div>
              )}
              <Card
                className={`h-full cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? "border-primary ring-2 ring-primary"
                    : plan.popular
                    ? "border-primary/50"
                    : ""
                }`}
                onClick={() => handleSelectPlan(plan.id)}
                data-testid={`card-plan-${plan.id}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    {selectedPlan === plan.id && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">{plan.priceLabel}</span>
                  </div>

                  {"coachingNote" in plan && plan.coachingNote && (
                    <div className="mb-6 rounded-md bg-primary/10 px-3 py-2">
                      <p className="text-xs font-medium text-primary">{plan.coachingNote}</p>
                    </div>
                  )}

                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                    {plan.lockedFeatures.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-muted-foreground"
                      >
                        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12"
        >
          <Card className="bg-muted/30">
            <CardContent className="flex flex-col items-center gap-6 p-8 sm:flex-row sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {selectedPlan
                    ? `Tu as sélectionné : ${PRICING_PLANS.find((p) => p.id === selectedPlan)?.name}`
                    : "Sélectionne un plan pour continuer"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedPlan === "gratuit"
                    ? "Tu recevras un email avec un lien vers ton rapport de base."
                    : selectedPlan
                    ? "Tu seras redirigé vers le paiement sécurisé."
                    : "Clique sur l'une des offres ci-dessus."}
                </p>
              </div>
              <Button
                size="lg"
                disabled={!selectedPlan || createAuditMutation.isPending}
                onClick={handleConfirm}
                className="w-full sm:w-auto"
                data-testid="button-confirm-plan"
              >
                {createAuditMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    Confirmer
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Paiement sécurisé
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Résultats instantanés
          </div>
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Garantie satisfait
          </div>
        </div>
      </div>
    </div>
  );
}
