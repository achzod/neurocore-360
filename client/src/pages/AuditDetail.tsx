import { useParams, Link } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ReviewForm } from "@/components/ReviewForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ReportSection } from "@/components/ReportSection";
import { ScoreRadar } from "@/components/ScoreRadar";
import { ScoreGauge } from "@/components/ScoreGauge";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Crown,
  Zap,
  Star,
  TrendingUp,
  TrendingDown,
  Calendar,
  Stethoscope,
  ClipboardCheck,
  Target,
  Pill,
  Clock,
  Sun,
  Moon,
  Coffee,
  CheckCircle2,
  Unlock,
  Camera,
  ImageOff,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { AuditTypeDisplayNames } from "@shared/schema";

interface SupplementProtocol {
  name: string;
  dosage: string;
  timing: string;
  duration: string;
  why: string;
  brands: string[];
  warnings?: string;
}

interface NarrativeSection {
  id: string;
  title: string;
  score: number;
  level: "excellent" | "bon" | "moyen" | "faible";
  isPremium: boolean;
  introduction: string;
  whatIsWrong: string;
  personalizedAnalysis: string;
  recommendations: string;
  supplements: SupplementProtocol[];
  actionPlan: string;
  scienceDeepDive: string;
}

interface PhotoAnalysis {
  summary: string;
  postureAnalysis: string;
  muscularAnalysis: string;
  fatAnalysis: string;
  recommendations: string;
  correctiveProtocol: string;
  score: number;
}

interface NarrativeReport {
  global: number;
  heroSummary: string;
  executiveNarrative: string;
  globalDiagnosis: string;
  sections: NarrativeSection[];
  prioritySections: string[];
  strengthSections: string[];
  supplementStack: SupplementProtocol[];
  lifestyleProtocol: string;
  weeklyPlan: {
    week1: string;
    week2: string;
    weeks3_4: string;
    months2_3: string;
  };
  conclusion: string;
  auditType: "GRATUIT" | "PREMIUM" | "ELITE";
  photoAnalysis?: PhotoAnalysis;
}

const FREE_SECTIONS = ["profil-base", "composition-corporelle", "metabolisme-energie", "nutrition-tracking"];

function getScoreLevel(score: number): "excellent" | "bon" | "moyen" | "faible" {
  if (score >= 80) return "excellent";
  if (score >= 65) return "bon";
  if (score >= 50) return "moyen";
  return "faible";
}

function PhotoAnalysisCard({ photoAnalysis, isPremium }: { photoAnalysis?: PhotoAnalysis; isPremium: boolean }) {
  if (!isPremium) return null;
  
  if (!photoAnalysis) {
    return (
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Analyse Visuelle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Donnees visuelles non disponibles (photos manquantes)</p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                Les mensurations declaratives (tours, %BF, ratio) ne sont pas utilisees car peu fiables. 
                Pour une analyse corporelle precise, soumettez vos photos (face/profil/dos) lors de votre prochain audit.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const scoreLevel = getScoreLevel(photoAnalysis.score);
  const colors = {
    excellent: "bg-emerald-500",
    bon: "bg-blue-500",
    moyen: "bg-amber-500",
    faible: "bg-red-500"
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3 bg-primary/5 rounded-t-md border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5 text-primary" />
            Analyse Visuelle
          </div>
          <Badge className={`${colors[scoreLevel]} text-white`}>{photoAnalysis.score}%</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div>
          <h4 className="font-semibold text-sm mb-2">Synthese</h4>
          <p className="text-sm text-muted-foreground">{photoAnalysis.summary}</p>
        </div>
        <Separator />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-semibold text-sm mb-2">Analyse Posturale</h4>
            <p className="text-sm text-muted-foreground">{photoAnalysis.postureAnalysis}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Analyse Musculaire</h4>
            <p className="text-sm text-muted-foreground">{photoAnalysis.muscularAnalysis}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Analyse Adiposite</h4>
            <p className="text-sm text-muted-foreground">{photoAnalysis.fatAnalysis}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Recommandations</h4>
            <p className="text-sm text-muted-foreground">{photoAnalysis.recommendations}</p>
          </div>
        </div>
        {photoAnalysis.correctiveProtocol && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm mb-2">Protocole Correctif</h4>
              <p className="text-sm text-muted-foreground">{photoAnalysis.correctiveProtocol}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StrengthsWeaknesses({ sections }: { sections: NarrativeSection[] }) {
  const sortedSections = [...sections].sort((a, b) => b.score - a.score);
  const strengths = sortedSections.slice(0, 3);
  const weaknesses = sortedSections.slice(-3).reverse();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardHeader className="pb-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-t-md">
          <CardTitle className="flex items-center gap-2 text-lg text-emerald-700 dark:text-emerald-400">
            <TrendingUp className="h-5 w-5" />
            Points Forts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-4">
          {strengths.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-md bg-emerald-50 dark:bg-emerald-950/20 p-3 border border-emerald-100 dark:border-emerald-900">
              <span className="font-medium text-sm">{s.title}</span>
              <Badge className="bg-emerald-500 text-white">{s.score}%</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-3 bg-amber-50 dark:bg-amber-950/30 rounded-t-md">
          <CardTitle className="flex items-center gap-2 text-lg text-amber-700 dark:text-amber-400">
            <TrendingDown className="h-5 w-5" />
            Axes d'Optimisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-4">
          {weaknesses.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-md bg-amber-50 dark:bg-amber-950/20 p-3 border border-amber-100 dark:border-amber-900">
              <span className="font-medium text-sm">{s.title}</span>
              <Badge className="bg-amber-500 text-white">{s.score}%</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SupplementsTable({ supplements }: { supplements: SupplementProtocol[] }) {
  if (!supplements || supplements.length === 0) return null;

  const uniqueSupplements = supplements.reduce((acc, supp) => {
    const key = supp.name.toLowerCase();
    if (!acc.find(s => s.name.toLowerCase() === key)) {
      acc.push(supp);
    }
    return acc;
  }, [] as SupplementProtocol[]);

  return (
    <Card>
      <CardHeader className="bg-primary/5 rounded-t-md border-b">
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          Stack de Supplements Personnalise
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-semibold">Supplement</th>
                <th className="px-4 py-3 text-left font-semibold">Dosage</th>
                <th className="px-4 py-3 text-left font-semibold">Timing</th>
                <th className="px-4 py-3 text-left font-semibold hidden lg:table-cell">Duree</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {uniqueSupplements.map((supp, idx) => (
                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-4">
                    <div className="font-medium text-primary">{supp.name}</div>
                    {supp.brands && supp.brands.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {supp.brands.slice(0, 2).join(", ")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant="outline" className="font-mono">{supp.dosage}</Badge>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{supp.timing}</td>
                  <td className="px-4 py-4 text-muted-foreground hidden lg:table-cell">{supp.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function DailyProtocol() {
  const protocols = [
    {
      time: "Matin (6h-8h)",
      icon: Sun,
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      items: [
        "Exposition lumiere naturelle 10-15 min",
        "Hydratation : 500ml eau + citron",
        "Supplements : Vitamine D, Omega-3",
        "Mouvement : 5 min mobilite",
      ],
    },
    {
      time: "Midi (12h-14h)",
      icon: Coffee,
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      items: [
        "Repas riche en proteines + legumes",
        "Marche digestive 10-15 min",
        "Pause respiration si stress",
      ],
    },
    {
      time: "Soir (18h-21h)",
      icon: Moon,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      items: [
        "Dernier repas 3h avant coucher",
        "Supplements : Magnesium glycinate",
        "Limiter ecrans (lunettes anti-lumiere bleue)",
        "Routine relaxation : lecture, etirements",
      ],
    },
  ];

  return (
    <Card>
      <CardHeader className="bg-primary/5 rounded-t-md border-b">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Protocole Quotidien Type
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-3">
          {protocols.map((protocol, idx) => (
            <div key={idx} className={`rounded-lg ${protocol.bgColor} p-4 border`}>
              <div className="flex items-center gap-2 mb-3">
                <protocol.icon className={`h-5 w-5 ${protocol.color}`} />
                <span className="font-semibold text-sm">{protocol.time}</span>
              </div>
              <ul className="space-y-2">
                {protocol.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground/80">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyPlan({ weeklyPlan }: { weeklyPlan: NarrativeReport["weeklyPlan"] }) {
  const phases = [
    { title: "Semaine 1", subtitle: "Fondations", content: weeklyPlan.week1, color: "bg-primary" },
    { title: "Semaine 2", subtitle: "Consolidation", content: weeklyPlan.week2, color: "bg-blue-500" },
    { title: "Semaines 3-4", subtitle: "Optimisation", content: weeklyPlan.weeks3_4, color: "bg-purple-500" },
    { title: "Mois 2-3", subtitle: "Maintenance", content: weeklyPlan.months2_3, color: "bg-accent" },
  ];

  return (
    <Card>
      <CardHeader className="bg-primary/5 rounded-t-md border-b">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Plan d'Action 12 Semaines
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {phases.map((phase, idx) => (
          <div key={idx} className="flex gap-4">
            <div className={`w-1 ${phase.color} rounded-full shrink-0`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold">{phase.title}</h4>
                <Badge variant="secondary" className="text-xs">{phase.subtitle}</Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {phase.content}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function AuditDetail() {
  const params = useParams<{ auditId: string }>();
  const auditId = params.auditId;
  const { toast } = useToast();

  const [report, setReport] = useState<NarrativeReport | null>(null);
  const [auditData, setAuditData] = useState<{ type: string; reportDeliveryStatus: string; email: string; scores: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);

  const handleExportPDF = async () => {
    if (!report || !auditId) return;
    setIsExporting(true);
    
    const printWindow = window.open("", "_blank");
    
    if (!printWindow) {
      toast({
        title: "Popup bloque",
        description: "Autorise les popups pour ce site et reessaie.",
        variant: "destructive",
      });
      setIsExporting(false);
      return;
    }
    
    printWindow.document.write("<html><head><title>Chargement...</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;}</style></head><body><p>Chargement du rapport...</p></body></html>");
    
    try {
      const response = await fetch(`/api/audits/${auditId}/export/pdf`);
      if (response.ok) {
        printWindow.close();
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `neurocore-360-rapport-${auditId.slice(0, 8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast({
          title: "Export reussi",
          description: "Ton rapport PDF a ete telecharge.",
        });
      } else {
        const htmlResponse = await fetch(`/api/audits/${auditId}/export/html`);
        if (!htmlResponse.ok) {
          printWindow.close();
          throw new Error("HTML export failed");
        }
        const htmlContent = await htmlResponse.text();
        
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        printWindow.onload = () => {
          printWindow?.focus();
          printWindow?.print();
        };
        
        setTimeout(() => {
          if (printWindow && !printWindow.closed) {
            printWindow.focus();
            printWindow.print();
          }
        }, 1000);
        
        toast({
          title: "Export PDF",
          description: "Utilise 'Enregistrer en PDF' dans la boite de dialogue d'impression.",
        });
      }
    } catch {
      if (printWindow && !printWindow.closed) {
        printWindow.close();
      }
      toast({
        title: "Erreur",
        description: "Impossible de generer le PDF. Reessaie plus tard.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportHTML = async () => {
    if (!report || !auditId) return;
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
        description: "Impossible de generer le HTML. Reessaie plus tard.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

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
          const reportRes = await fetch(`/api/audits/${auditId}/narrative`);
          if (reportRes.ok) {
            const reportData = await reportRes.json();
            if (!reportData.error && !reportData.message) {
              setReport(reportData);
            }
          }
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
            <Button className="mt-6">Retour a l'accueil</Button>
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
              Votre dossier est en cours d'analyse par ACHZOD.
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
                      Votre rapport personnalise sera disponible sous 24 a 48 heures.
                    </p>
                  </div>
                </div>
                {auditData.type === "GRATUIT" && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        setRegenLoading(true);
                        try {
                          const res = await fetch(`/api/discovery-scan/${params.auditId}/regenerate`, {
                            method: "POST",
                          });
                          if (res.ok) {
                            toast({
                              title: "Regeneration lancee",
                              description: "Le rapport Discovery va etre recalculé.",
                            });
                            window.location.reload();
                          } else {
                            toast({
                              title: "Impossible de regenerer",
                              description: "Réessaie dans un instant ou contacte le support.",
                              variant: "destructive",
                            });
                          }
                        } catch {
                          toast({
                            title: "Erreur",
                            description: "Regeneration échouée.",
                            variant: "destructive",
                          });
                        } finally {
                          setRegenLoading(false);
                        }
                      }}
                      disabled={regenLoading}
                    >
                      {regenLoading ? "Recalcul..." : "Forcer la génération"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Link href="/">
              <Button variant="outline" className="mt-8">
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

  if (!report) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement du rapport...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const isPremiumUser = report.auditType === "PREMIUM" || report.auditType === "ELITE";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6" data-testid="button-back-dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Button>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                <div className="flex items-center gap-6">
                  <ScoreGauge score={report.global} size="lg" showLabel={false} />
                  <div>
                    <Badge
                      className={`mb-3 ${
                        report.auditType === "ELITE"
                          ? "bg-gradient-to-r from-amber-400 to-amber-600 text-black"
                          : report.auditType === "PREMIUM"
                          ? "bg-gradient-to-r from-primary to-emerald-400 text-white"
                          : "bg-slate-600"
                      }`}
                    >
                      {report.auditType === "ELITE" && <Zap className="mr-1 h-3 w-3" />}
                      {report.auditType === "PREMIUM" && <Crown className="mr-1 h-3 w-3" />}
                      {report.auditType === "GRATUIT" && <Star className="mr-1 h-3 w-3" />}
                      Bilan {AuditTypeDisplayNames[report.auditType] ?? report.auditType}
                    </Badge>
                    <h1 className="text-3xl font-bold tracking-tight">APEXLABS</h1>
                    <p className="text-slate-300 mt-1">Audit 360 Complet</p>
                  </div>
                </div>
                
                <div className="flex-1" />
                
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    data-testid="button-export-pdf"
                  >
                    {isExporting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Telecharger PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportHTML}
                    disabled={isExporting}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    data-testid="button-export-html"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Version Web
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Synthese Executive
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {report.heroSummary.split('\n').map((para, i) => {
                  const trimmed = para.trim();
                  if (!trimmed) return null;
                  if (trimmed.startsWith('===') || trimmed.startsWith('---')) return <Separator key={i} className="my-4" />;
                  if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || (trimmed.match(/^\d+\./) && trimmed.length < 100)) {
                    return (
                      <div key={i} className="flex items-start gap-3 pl-2">
                        <span className="text-primary font-bold">✓</span>
                        <p className="text-foreground/80 leading-relaxed">{trimmed.replace(/^[-•\d+.]\s*/, '')}</p>
                      </div>
                    );
                  }
                  return <p key={i} className="text-foreground/90 leading-relaxed text-lg">{trimmed}</p>;
                })}
              </div>
            </CardContent>
          </Card>

          <StrengthsWeaknesses sections={report.sections} />

          <PhotoAnalysisCard photoAnalysis={report.photoAnalysis} isPremium={isPremiumUser} />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-lg">Vue Radar - 15 Domaines</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ScoreRadar 
                  scores={report.sections.reduce((acc, s) => {
                    const key = s.id.replace(/-/g, "");
                    acc[key] = s.score;
                    return acc;
                  }, {} as Record<string, number>)} 
                  size="md" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-lg">Scores Detailles</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                  {report.sections.map((s) => {
                    const level = getScoreLevel(s.score);
                    const colors = {
                      excellent: "bg-emerald-500",
                      bon: "bg-blue-500",
                      moyen: "bg-amber-500",
                      faible: "bg-red-500"
                    };
                    return (
                      <div key={s.id} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium truncate">{s.title}</span>
                            <span className="text-sm font-bold">{s.score}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${colors[level]} rounded-full transition-all duration-500`}
                              style={{ width: `${s.score}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator className="my-4" />

          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Analyse Detaillee par Domaine</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {isPremiumUser
                    ? "Acces complet aux 15 domaines d'analyse expert."
                    : "4 sections accessibles. Passez en Anabolic pour debloquer les 11 sections avancees."}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              {report.sections.map((section) => {
                const isFreeSection = FREE_SECTIONS.includes(section.id);
                const canAccess = isFreeSection || isPremiumUser;
                
                return (
                  <ReportSection
                    key={section.id}
                    title={section.title}
                    content={{
                      introduction: section.introduction,
                      whatIsWrong: section.whatIsWrong,
                      personalizedAnalysis: section.personalizedAnalysis,
                      recommendations: section.recommendations,
                      supplements: section.supplements,
                      actionPlan: section.actionPlan,
                      scienceDeepDive: section.scienceDeepDive,
                    }}
                    score={section.score || 0}
                    level={section.level || getScoreLevel(section.score || 0)}
                    isLocked={!canAccess}
                    onUnlock={() => window.location.href = "/audit-complet/checkout"}
                    expertName="ACHZOD"
                    isNarrative={!!section.introduction && !section.personalizedAnalysis}
                  />
                );
              })}
            </div>
          </div>

          {isPremiumUser && (
            <>
              <Separator className="my-4" />
              <SupplementsTable supplements={report.supplementStack} />
              <DailyProtocol />
              <WeeklyPlan weeklyPlan={report.weeklyPlan} />

              <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    Conclusion de l'Audit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base leading-relaxed">{report.conclusion}</p>
                  <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Stethoscope className="w-4 h-4 text-primary" />
                    </div>
                    <span>Analyse realisee par <strong>ACHZOD</strong> - Expert en metabolisme</span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!isPremiumUser && (
            <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-2 border-primary/20">
              <CardContent className="flex flex-col items-center gap-6 p-8 text-center sm:flex-row sm:text-left">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm bg-primary">
                  <Crown className="h-8 w-8 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">Debloquer l'analyse complete</h3>
                  <p className="mt-2 text-muted-foreground">
                    Accedez aux 15 domaines d'analyse, protocoles de supplements personnalises, 
                    et plan d'action sur 12 semaines.
                  </p>
                </div>
                <Link href="/audit-complet/checkout">
                  <Button size="lg" data-testid="button-upgrade-anabolic">
                    <Unlock className="mr-2 h-4 w-4" />
                    Passer Anabolic
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <Separator className="my-6" />
          
          <ReviewForm auditId={auditId || ""} />
          
          <ApprovedReviewsSection />
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}

interface ApprovedReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
}

function ApprovedReviewsSection() {
  const [reviews, setReviews] = useState<ApprovedReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch("/api/reviews");
        const data = await response.json();
        if (data.success && data.reviews) {
          setReviews(data.reviews.slice(0, 6));
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReviews();
  }, []);

  if (isLoading || reviews.length === 0) return null;

  const averageRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );

  return (
    <Card className="mt-6" data-testid="card-approved-reviews">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            Avis clients
          </div>
          <div className="flex items-center gap-2 text-sm font-normal">
            {renderStars(Math.round(averageRating))}
            <span>{averageRating.toFixed(1)}/5</span>
            <span className="text-muted-foreground">({reviews.length} avis)</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {reviews.map((review) => (
            <div 
              key={review.id} 
              className="rounded-lg border border-border/50 p-4"
              data-testid={`review-item-${review.id}`}
            >
              <div className="mb-2 flex items-center justify-between">
                {renderStars(review.rating)}
                <span className="text-xs text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{review.comment}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
