import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import type { Audit } from "@shared/schema";
import { RadarChart } from "@/components/RadarChart";
import {
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  Eye,
  Crown,
  Zap,
  Star,
  TrendingUp,
  TrendingDown,
  Activity,
  Brain,
  Heart,
  Flame,
  Moon,
  Utensils,
  Dumbbell,
  FlaskConical,
  Pill,
  Sparkles,
  Target,
  AlertTriangle,
  Award,
  Timer,
  Droplets,
  Wheat,
} from "lucide-react";
import { motion } from "framer-motion";

const sectionConfig: Record<string, { label: string; shortLabel: string; icon: typeof Activity; color: string }> = {
  profilbase: { label: "Profil de Base", shortLabel: "Profil", icon: Target, color: "hsl(160, 84%, 39%)" },
  compositioncorporelle: { label: "Composition Corporelle", shortLabel: "Composition", icon: Activity, color: "hsl(200, 80%, 50%)" },
  metabolismeenergie: { label: "Metabolisme et Energie", shortLabel: "Metabolisme", icon: Flame, color: "hsl(30, 90%, 55%)" },
  nutritiontracking: { label: "Nutrition et Tracking", shortLabel: "Nutrition", icon: Utensils, color: "hsl(120, 60%, 45%)" },
  digestionmicrobiome: { label: "Digestion et Microbiome", shortLabel: "Digestion", icon: FlaskConical, color: "hsl(45, 85%, 50%)" },
  activiteperformance: { label: "Activite et Performance", shortLabel: "Activite", icon: Dumbbell, color: "hsl(280, 70%, 55%)" },
  sommeilrecuperation: { label: "Sommeil et Recuperation", shortLabel: "Sommeil", icon: Moon, color: "hsl(240, 60%, 60%)" },
  hrvcardiaque: { label: "HRV et Sante Cardiaque", shortLabel: "Cardiaque", icon: Heart, color: "hsl(0, 75%, 55%)" },
  analysesbiomarqueurs: { label: "Analyses et Biomarqueurs", shortLabel: "Biomarqueurs", icon: FlaskConical, color: "hsl(180, 70%, 45%)" },
  hormonesstress: { label: "Hormones et Stress", shortLabel: "Hormones", icon: Zap, color: "hsl(50, 90%, 50%)" },
  lifestylesubstances: { label: "Lifestyle et Substances", shortLabel: "Lifestyle", icon: Pill, color: "hsl(320, 65%, 50%)" },
  biomecaniquemobilite: { label: "Biomecanique et Mobilite", shortLabel: "Mobilite", icon: Activity, color: "hsl(170, 75%, 40%)" },
  psychologiemental: { label: "Psychologie et Mental", shortLabel: "Mental", icon: Brain, color: "hsl(260, 70%, 60%)" },
  neurotransmetteurs: { label: "Neurotransmetteurs", shortLabel: "Neuro", icon: Sparkles, color: "hsl(300, 65%, 55%)" },
  hormonessexuelles: { label: "Hormones Sexuelles et Libido", shortLabel: "Libido", icon: Heart, color: "hsl(340, 70%, 50%)" },
};

function getScoreLevel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excellent", color: "text-primary" };
  if (score >= 65) return { label: "Bon", color: "text-chart-3" };
  if (score >= 50) return { label: "Moyen", color: "text-yellow-500" };
  return { label: "A ameliorer", color: "text-destructive" };
}

function AuditTypeLabel({ type }: { type: string }) {
  const config = {
    GRATUIT: { label: "Analyse Gratuite", icon: Star, className: "bg-muted text-muted-foreground" },
    PREMIUM: { label: "Analyse Premium", icon: Crown, className: "bg-primary text-primary-foreground" },
    ELITE: { label: "Analyse Elite", icon: Zap, className: "bg-accent text-accent-foreground" },
  };
  const typeConfig = config[type as keyof typeof config] || config.GRATUIT;
  const Icon = typeConfig.icon;
  
  return (
    <Badge className={`${typeConfig.className} text-sm px-4 py-1`} data-testid={`badge-audit-type-${type}`}>
      <Icon className="mr-2 h-4 w-4" />
      {typeConfig.label}
    </Badge>
  );
}

function GlobalScoreDisplay({ score }: { score: number }) {
  const level = getScoreLevel(score);
  
  return (
    <div className="text-center">
      <div className="relative inline-flex items-center justify-center">
        <svg className="w-32 h-32 transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted"
          />
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${(score / 100) * 352} 352`}
            className="text-primary"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" data-testid="text-global-score">{score}%</span>
          <span className={`text-sm font-medium ${level.color}`}>{level.label}</span>
        </div>
      </div>
    </div>
  );
}

function RadarSection({ scores }: { scores: Record<string, number> }) {
  const radarData = Object.entries(scores)
    .filter(([key]) => key !== "global" && sectionConfig[key])
    .map(([key, score]) => ({
      subject: sectionConfig[key]?.shortLabel || key,
      score: score,
      fullMark: 100,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Vue d'ensemble des 15 domaines
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadarChart data={radarData} size="lg" />
      </CardContent>
    </Card>
  );
}

function StrengthsWeaknessesSection({ scores }: { scores: Record<string, number> }) {
  const sortedSections = Object.entries(scores)
    .filter(([key]) => key !== "global" && sectionConfig[key])
    .sort(([, a], [, b]) => b - a);

  const strengths = sortedSections.filter(([, score]) => score >= 70).slice(0, 3);
  const weaknesses = sortedSections.filter(([, score]) => score < 60).slice(-3).reverse();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5 text-primary" />
            Tes points forts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {strengths.length > 0 ? (
            <div className="space-y-3">
              {strengths.map(([key, score]) => {
                const config = sectionConfig[key];
                if (!config) return null;
                const Icon = config.icon;
                return (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        <Icon className="h-4 w-4" style={{ color: config.color }} />
                      </div>
                      <span className="font-medium">{config.shortLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="font-bold text-primary">{score}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun point fort identifie pour le moment.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Priorites d'amelioration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weaknesses.length > 0 ? (
            <div className="space-y-3">
              {weaknesses.map(([key, score]) => {
                const config = sectionConfig[key];
                if (!config) return null;
                const Icon = config.icon;
                return (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        <Icon className="h-4 w-4" style={{ color: config.color }} />
                      </div>
                      <span className="font-medium">{config.shortLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-destructive" />
                      <span className="font-bold text-destructive">{score}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Tous tes domaines sont au-dessus de 60%. Excellent !</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QuickInsightsSection({ scores }: { scores: Record<string, number> }) {
  const nutritionScore = scores.nutritiontracking || 0;
  const activiteScore = scores.activiteperformance || 0;
  const sommeilScore = scores.sommeilrecuperation || 0;
  const metabolismeScore = scores.metabolismeenergie || 0;

  const insights = [];

  if (nutritionScore < 60) {
    insights.push({
      icon: Utensils,
      title: "Timing nutritionnel",
      description: "Optimise le timing de tes glucides pour maximiser la lipolyse et reduire l'inflammation.",
      color: "hsl(120, 60%, 45%)",
      metric: `${nutritionScore}%`
    });
  }

  if (activiteScore < 60) {
    insights.push({
      icon: Timer,
      title: "Strategie peri-workout",
      description: "Ameliore ta nutrition autour de l'entrainement pour eviter le catabolisme.",
      color: "hsl(280, 70%, 55%)",
      metric: `${activiteScore}%`
    });
  }

  if (sommeilScore < 60) {
    insights.push({
      icon: Moon,
      title: "Recuperation nocturne",
      description: "Ton sommeil impacte directement tes hormones et ta capacite de recuperation.",
      color: "hsl(240, 60%, 60%)",
      metric: `${sommeilScore}%`
    });
  }

  if (metabolismeScore < 60) {
    insights.push({
      icon: Flame,
      title: "Energie metabolique",
      description: "Ton metabolisme energetique peut etre optimise pour plus de vitalite.",
      color: "hsl(30, 90%, 55%)",
      metric: `${metabolismeScore}%`
    });
  }

  if (insights.length === 0) {
    insights.push({
      icon: Award,
      title: "Profil equilibre",
      description: "Tes domaines cles sont bien optimises. Continue ainsi !",
      color: "hsl(160, 84%, 39%)",
      metric: "OK"
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          Insights rapides
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {insights.slice(0, 4).map((insight, index) => {
            const Icon = insight.icon;
            return (
              <div key={index} className="flex items-start gap-3 rounded-lg border p-4">
                <div 
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${insight.color}20` }}
                >
                  <Icon className="h-5 w-5" style={{ color: insight.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{insight.title}</p>
                    <Badge variant="outline">{insight.metric}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function KeyMetricsSection({ scores }: { scores: Record<string, number> }) {
  const globalScore = scores.global || 0;
  const totalSections = Object.keys(scores).filter(k => k !== "global" && sectionConfig[k]).length;
  const strongSections = Object.entries(scores).filter(([k, s]) => k !== "global" && sectionConfig[k] && s >= 70).length;
  const weakSections = Object.entries(scores).filter(([k, s]) => k !== "global" && sectionConfig[k] && s < 50).length;
  const avgScore = Math.round(
    Object.entries(scores)
      .filter(([k]) => k !== "global" && sectionConfig[k])
      .reduce((acc, [, s]) => acc + s, 0) / totalSections
  );

  const metrics = [
    { label: "Score global", value: `${globalScore}%`, icon: Target, color: "primary" },
    { label: "Domaines analyses", value: totalSections.toString(), icon: Activity, color: "chart-3" },
    { label: "Points forts", value: strongSections.toString(), icon: TrendingUp, color: "primary" },
    { label: "A ameliorer", value: weakSections.toString(), icon: AlertTriangle, color: "destructive" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-${metric.color}/10`}>
                  <Icon className={`h-6 w-6 text-${metric.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-bold" data-testid={`metric-${metric.label.replace(/\s/g, '-').toLowerCase()}`}>
                    {metric.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

function SectionScoresGrid({ scores }: { scores: Record<string, number> }) {
  const sortedSections = Object.entries(scores)
    .filter(([key]) => key !== "global" && sectionConfig[key])
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sortedSections.map(([key, score]) => {
        const config = sectionConfig[key];
        if (!config) return null;
        const Icon = config.icon;
        const level = getScoreLevel(score);
        
        return (
          <Card key={key} className="group hover:border-primary/50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div 
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${config.color}20` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: config.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-tight">{config.shortLabel}</p>
                    <p className={`text-xs ${level.color}`}>{level.label}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold" data-testid={`score-${key}`}>{score}%</span>
                </div>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${score}%`,
                    backgroundColor: config.color
                  }}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function AuditCard({ audit, index }: { audit: Audit; index: number }) {
  const isCompleted = audit.status === "COMPLETED";
  const globalScore = audit.scores?.global || 0;
  const level = getScoreLevel(globalScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card className="group hover:border-primary/50">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg">Audit NEUROCORE 360</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date(audit.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <AuditTypeLabel type={audit.type} />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isCompleted ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Analyse completee</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4" />
                <span>En cours de traitement</span>
              </>
            )}
          </div>

          {isCompleted && audit.scores && (
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary" data-testid={`card-score-global-${audit.id}`}>
                    {globalScore}%
                  </div>
                  <p className={`text-xs ${level.color}`}>{level.label}</p>
                </div>
                <div className="h-12 w-px bg-border" />
                <div className="text-sm text-muted-foreground">
                  <p>15 domaines analyses</p>
                  <p className="flex items-center gap-1 text-primary">
                    <TrendingUp className="h-3 w-3" />
                    {Object.values(audit.scores).filter(s => typeof s === 'number' && s >= 70).length} points forts
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6">
            <Link href={`/dashboard/${audit.id}`}>
              <Button className="w-full" data-testid={`button-view-${audit.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                Consulter le rapport complet
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-6 text-lg font-semibold">Aucun audit pour le moment</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Commence ton premier audit NEUROCORE 360 pour decouvrir ton profil metabolique complet.
        </p>
        <Link href="/audit-complet/questionnaire">
          <Button className="mt-6" data-testid="button-start-first-audit">
            <Plus className="mr-2 h-4 w-4" />
            Commencer mon premier audit
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const email = localStorage.getItem("neurocore_email");
    if (!email) {
      navigate("/auth/login");
      return;
    }
    setUserEmail(email);
  }, [navigate]);

  const { data: audits, isLoading } = useQuery<Audit[]>({
    queryKey: [`/api/audits?email=${encodeURIComponent(userEmail || "")}`],
    enabled: !!userEmail,
  });

  const latestAudit = audits?.[0];
  const hasCompletedAudit = latestAudit?.status === "COMPLETED" && latestAudit?.scores;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-muted-foreground">Chargement de tes audits...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Mon Dashboard</h1>
              <p className="mt-1 text-muted-foreground">
                Bienvenue, {userEmail}
              </p>
            </div>
            <Link href="/audit-complet/questionnaire">
              <Button data-testid="button-new-audit">
                <Plus className="mr-2 h-4 w-4" />
                Nouvel audit
              </Button>
            </Link>
          </div>
        </motion.div>

        {!audits || audits.length === 0 ? (
          <div className="mt-8">
            <EmptyState />
          </div>
        ) : (
          <>
            {hasCompletedAudit && latestAudit.scores && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-8"
              >
                <Card className="overflow-hidden">
                  <div className="bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 p-6 sm:p-8">
                    <div className="flex flex-col items-center gap-6 lg:flex-row lg:justify-between">
                      <div className="flex flex-col items-center gap-4 sm:flex-row">
                        <GlobalScoreDisplay score={latestAudit.scores.global || 0} />
                        <div className="text-center sm:text-left">
                          <AuditTypeLabel type={latestAudit.type} />
                          <h2 className="mt-3 text-xl font-semibold">Ton Score Global</h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Base sur l'analyse de 15 domaines metaboliques
                          </p>
                        </div>
                      </div>
                      <Link href={`/dashboard/${latestAudit.id}`}>
                        <Button size="lg" data-testid="button-view-latest">
                          <Eye className="mr-2 h-4 w-4" />
                          Voir le rapport detaille
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {hasCompletedAudit && latestAudit.scores && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="mt-8"
              >
                <KeyMetricsSection scores={latestAudit.scores as Record<string, number>} />
              </motion.div>
            )}

            {hasCompletedAudit && latestAudit.scores && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-8"
              >
                <StrengthsWeaknessesSection scores={latestAudit.scores as Record<string, number>} />
              </motion.div>
            )}

            {hasCompletedAudit && latestAudit.scores && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="mt-8"
              >
                <QuickInsightsSection scores={latestAudit.scores as Record<string, number>} />
              </motion.div>
            )}

            {hasCompletedAudit && latestAudit.scores && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-8"
              >
                <RadarSection scores={latestAudit.scores as Record<string, number>} />
              </motion.div>
            )}

            {hasCompletedAudit && latestAudit.scores && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="mt-8"
              >
                <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Scores par domaine
                </h2>
                <SectionScoresGrid scores={latestAudit.scores as Record<string, number>} />
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-12"
            >
              <h2 className="mb-6 text-xl font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Historique des audits ({audits.length})
              </h2>
              <div className="grid gap-6 lg:grid-cols-2">
                {audits.map((audit, index) => (
                  <AuditCard key={audit.id} audit={audit} index={index} />
                ))}
              </div>
            </motion.div>

            {audits.some((a) => a.type === "GRATUIT") && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="mt-12"
              >
                <Card className="overflow-hidden bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
                  <CardContent className="flex flex-col items-center gap-6 p-8 text-center sm:flex-row sm:text-left">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary">
                      <Crown className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold">Passe au niveau superieur</h3>
                      <p className="mt-2 text-muted-foreground">
                        Debloque toutes les sections de ton rapport et accede a des protocoles supplements detailles.
                      </p>
                    </div>
                    <Link href="/#pricing">
                      <Button size="lg" data-testid="button-upgrade-banner">
                        Voir les offres Premium
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
