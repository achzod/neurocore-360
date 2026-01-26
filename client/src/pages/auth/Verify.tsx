import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function Verify() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("token");
    const emailParam = params.get("email");

    if (!token || !emailParam) {
      setStatus("error");
      return;
    }

    fetch("/api/auth/verify-magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, email: emailParam }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.me?.email && data.token) {
          setEmail(data.me.email);
          localStorage.setItem("neurocore_email", data.me.email);
          localStorage.setItem("apexlabs_token", data.token);
          setStatus("success");
          const next = localStorage.getItem("apexlabs_post_login_redirect") || "";
          if (next) {
            localStorage.removeItem("apexlabs_post_login_redirect");
            navigate(next);
          } else {
            navigate("/dashboard");
          }
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        setStatus("error");
      });
  }, [search, navigate]);

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
              {status === "loading" && (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
                  >
                    <Loader2 className="h-10 w-10 text-primary" />
                  </motion.div>
                  <CardTitle className="text-2xl">Verification en cours...</CardTitle>
                  <p className="mt-2 text-muted-foreground">
                    Nous confirmons ton acces
                  </p>
                </>
              )}

              {status === "success" && (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
                  >
                    <CheckCircle2 className="h-10 w-10 text-primary" />
                  </motion.div>
                  <CardTitle className="text-2xl">Acces confirme</CardTitle>
                  <p className="mt-2 text-muted-foreground">
                    Bienvenue {email}. Redirection vers ton espace...
                  </p>
                </>
              )}

              {status === "error" && (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10"
                  >
                    <XCircle className="h-10 w-10 text-destructive" />
                  </motion.div>
                  <CardTitle className="text-2xl">Lien invalide</CardTitle>
                  <p className="mt-2 text-muted-foreground">
                    Ce lien a expire ou est invalide. Demande un nouveau lien.
                  </p>
                </>
              )}
            </CardHeader>
            {status === "error" && (
              <CardContent>
                <Link href="/auth/login">
                  <Button className="w-full" data-testid="button-retry-login">
                    Demander un nouveau lien
                  </Button>
                </Link>
              </CardContent>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
