import { useParams, Link } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Download,
  Loader2,
  Stethoscope,
  ClipboardCheck,
  FileText,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface AuditData {
  id: string;
  type: string;
  reportDeliveryStatus: string;
  email: string;
}

export default function AuditDetail() {
  const params = useParams<{ auditId: string }>();
  const auditId = params.auditId;
  const { toast } = useToast();

  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [htmlReady, setHtmlReady] = useState(false);

  useEffect(() => {
    if (!auditId) return;

    const fetchData = async () => {
      try {
        const auditRes = await fetch(`/api/audits/${auditId}`);
        if (!auditRes.ok) {
          setLoading(false);
          return;
        }
        const audit = await auditRes.json();
        setAuditData(audit);

        if (audit.reportDeliveryStatus === "READY" || audit.reportDeliveryStatus === "SENT") {
          setHtmlReady(true);
        }
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [auditId]);

  const handleDownloadHTML = async () => {
    if (!auditId) return;
    setIsExporting(true);
    try {
      const response = await fetch(`/api/audits/${auditId}/export/html`);
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `neurocore-360-rapport-${auditId.slice(0, 8)}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Export reussi",
        description: "Ton rapport HTML a ete telecharge.",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de telecharger le rapport.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenNewTab = () => {
    if (!auditId) return;
    window.open(`/api/audits/${auditId}/view-html`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement de votre dossier...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!auditData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h2 className="text-2xl font-bold">Dossier non trouve</h2>
          <p className="text-muted-foreground mt-2">Ce dossier n'existe pas ou a ete supprime.</p>
          <Link href="/">
            <Button className="mt-6" data-testid="button-back-home">Retour a l'accueil</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (auditData.reportDeliveryStatus !== "READY" && auditData.reportDeliveryStatus !== "SENT") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-2xl px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Stethoscope className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Analyse en cours</h2>
            <p className="text-muted-foreground mb-8">
              Votre dossier est en cours d'analyse par notre IA.
              <br />Vous recevrez une notification des que votre bilan sera disponible.
            </p>
            
            <Card className="text-left">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <ClipboardCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Temps de traitement</h3>
                    <p className="text-sm text-muted-foreground">
                      Votre rapport personnalise sera disponible sous quelques minutes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Link href="/">
              <Button variant="outline" className="mt-8" data-testid="button-back-home-pending">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour a l'accueil
              </Button>
            </Link>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="flex-1 flex flex-col">
        <div className="bg-card border-b px-4 py-4">
          <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" data-testid="button-back-dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-semibold">Rapport NEUROCORE 360</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenNewTab}
                data-testid="button-open-new-tab"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ouvrir dans un nouvel onglet
              </Button>
              <Button
                onClick={handleDownloadHTML}
                disabled={isExporting}
                data-testid="button-download-html"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Telecharger HTML
              </Button>
            </div>
          </div>
        </div>

        {htmlReady ? (
          <div className="flex-1 w-full">
            <iframe
              src={`/api/audits/${auditId}/view-html`}
              className="w-full h-full min-h-[calc(100vh-200px)] border-0"
              title="Rapport NEUROCORE 360"
              data-testid="iframe-report"
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Chargement du rapport...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
