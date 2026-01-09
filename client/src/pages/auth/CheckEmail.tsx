import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Mail, ArrowLeft, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

export default function CheckEmail() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem("neurocore_email");
    setEmail(savedEmail);
  }, []);

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
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
              >
                <Mail className="h-10 w-10 text-primary" />
              </motion.div>
              <CardTitle className="text-2xl">Vérifie ta boîte mail</CardTitle>
              <p className="mt-2 text-muted-foreground">
                Nous avons envoyé un lien de connexion à{" "}
                <span className="font-medium text-foreground">{email || "ton email"}</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="mb-2 font-medium">Que faire maintenant ?</h4>
                <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
                  <li>Ouvre ta boîte mail</li>
                  <li>Cherche un email de APEXLABS°</li>
                  <li>Clique sur le lien pour accéder à ton dashboard</li>
                </ol>
              </div>

              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Tu n'as pas reçu l'email ?
                </p>
                <Button variant="ghost" className="mt-1" data-testid="button-resend">
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Renvoyer l'email
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Vérifie aussi tes spams si tu ne trouves pas l'email.
              </p>

              <div className="pt-4">
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full" data-testid="button-back-login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour à la connexion
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
