import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");

  const sendMagicLinkMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/magic-link", { email });
    },
    onSuccess: () => {
      localStorage.setItem("neurocore_email", email);
      navigate("/auth/check-email");
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le lien. Vérifie ton email.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      sendMagicLinkMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="mx-auto max-w-md px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-sm bg-primary/10">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Acces au dossier</CardTitle>
              <p className="mt-2 text-muted-foreground">
                Entre ton email pour recevoir un lien d'acces. Aucun mot de passe requis.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ton@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-login-email"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={sendMagicLinkMutation.isPending}
                  data-testid="button-send-magic-link"
                >
                  {sendMagicLinkMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      Recevoir le lien d'acces
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Lien valable 60 minutes. Si tu n'as pas encore de compte, commence ton audit.
                </p>
                <a
                  href="/audit-complet/questionnaire"
                  className="mt-2 inline-flex text-sm font-medium text-primary hover:underline"
                  data-testid="link-start-audit"
                >
                  Commencer l'audit
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
