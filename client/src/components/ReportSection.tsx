import { Lock, ChevronRight, Star, Stethoscope } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ReportSectionProps {
  title: string;
  content: {
    introduction?: string;
    whatIsWrong?: string;
    personalizedAnalysis?: string;
    recommendations?: string;
    supplements?: Array<{
      name: string;
      dosage: string;
      timing: string;
      duration: string;
      why: string;
      brands?: string[];
      warnings?: string;
    }>;
    actionPlan?: string;
    scienceDeepDive?: string;
  };
  score: number;
  level: "excellent" | "bon" | "moyen" | "faible";
  isLocked: boolean;
  onUnlock?: () => void;
  expertName?: string;
  isNarrative?: boolean;
}

function getLevelConfig(level: string) {
  switch (level) {
    case "excellent":
      return { color: "bg-emerald-500", text: "Excellent", textColor: "text-emerald-700" };
    case "bon":
      return { color: "bg-blue-500", text: "Bon", textColor: "text-blue-700" };
    case "moyen":
      return { color: "bg-amber-500", text: "À optimiser", textColor: "text-amber-700" };
    case "faible":
      return { color: "bg-red-500", text: "Prioritaire", textColor: "text-red-700" };
    default:
      return { color: "bg-gray-500", text: "Non évalué", textColor: "text-gray-700" };
  }
}

function formatTextWithBullets(text: string) {
  if (!text) return null;
  
  const lines = text.split(/[,\n]/).filter(line => line.trim());
  
  if (lines.length <= 1) {
    return <p className="text-foreground/80 leading-relaxed">{text}</p>;
  }
  
  return (
    <ul className="space-y-2">
      {lines.map((line, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
          <span className="text-foreground/80 leading-relaxed">{line.trim().replace(/^[-•]\s*/, '')}</span>
        </li>
      ))}
    </ul>
  );
}

export function ReportSection({ 
  title, 
  content, 
  score, 
  level, 
  isLocked, 
  onUnlock,
  expertName,
  isNarrative
}: ReportSectionProps) {
  const levelConfig = getLevelConfig(level);

  if (isLocked) {
    return (
      <Card className="relative overflow-hidden border-2 border-dashed border-muted-foreground/20">
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 to-background backdrop-blur-sm z-10 flex flex-col items-center justify-center p-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-center mb-2">{title}</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Débloquez cette analyse experte pour découvrir votre protocole personnalisé avec dosages précis et recommandations ciblées.
          </p>
          <Button onClick={onUnlock} className="gap-2">
            <Star className="w-4 h-4" />
            Passer en Premium
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        <CardHeader className="blur-sm select-none pointer-events-none">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{title}</CardTitle>
            <Badge variant="secondary">{score}%</Badge>
          </div>
        </CardHeader>
        <CardContent className="blur-sm select-none pointer-events-none min-h-[200px]">
          <p className="text-muted-foreground">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
            Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/50 shadow-sm">
      <CardHeader className="border-b border-border/30 bg-muted/30">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${levelConfig.color}`} />
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={levelConfig.textColor}>
              {levelConfig.text}
            </Badge>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-background border">
              <span className="text-2xl font-bold">{score}</span>
              <span className="text-muted-foreground text-sm">/100</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {content.introduction && (
          <div className={`${isNarrative ? "" : "bg-primary/5 border-l-4 border-primary p-4 rounded-r-md"}`}>
            {isNarrative ? (
              <div className="space-y-4">
                {content.introduction.split('\n').map((para, i) => {
                  const trimmed = para.trim();
                  if (!trimmed) return null;
                  if (trimmed.startsWith('===') || trimmed.startsWith('---')) return <Separator key={i} className="my-6" />;
                  if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
                    return (
                      <div key={i} className="flex items-start gap-3 pl-2">
                        <span className="text-primary font-bold">✓</span>
                        <p className="text-foreground/80 leading-relaxed">{trimmed.substring(2)}</p>
                      </div>
                    );
                  }
                  return <p key={i} className="text-foreground/90 leading-relaxed text-lg">{trimmed}</p>;
                })}
              </div>
            ) : (
              <p className="text-foreground leading-relaxed font-medium">
                {content.introduction}
              </p>
            )}
          </div>
        )}

        {content.whatIsWrong && (
          <div className="space-y-3">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 text-sm">!</span>
              Points d'attention
            </h4>
            {formatTextWithBullets(content.whatIsWrong)}
          </div>
        )}

        {content.personalizedAnalysis && (
          <div className="space-y-3">
            <h4 className="font-semibold text-lg">Analyse personnalisée</h4>
            <p className="text-foreground/80 leading-relaxed">
              {content.personalizedAnalysis}
            </p>
          </div>
        )}

        {content.recommendations && (
          <div className="space-y-3">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 text-sm">✓</span>
              Recommandations
            </h4>
            {formatTextWithBullets(content.recommendations)}
          </div>
        )}

        {content.supplements && content.supplements.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              Protocole Suppléments
            </h4>
            <div className="grid gap-4">
              {content.supplements.map((supp, i) => (
                <div key={i} className="bg-muted/50 rounded-lg p-4 border border-border/50">
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                    <h5 className="font-semibold text-primary">{supp.name}</h5>
                    <Badge variant="secondary" className="font-mono">{supp.dosage}</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Timing:</span>
                      <span className="ml-2 font-medium">{supp.timing}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Durée:</span>
                      <span className="ml-2 font-medium">{supp.duration}</span>
                    </div>
                    {supp.brands && supp.brands.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Marques:</span>
                        <span className="ml-2 font-medium">{supp.brands.slice(0, 2).join(", ")}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-foreground/70">{supp.why}</p>
                  {supp.warnings && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                      <span>⚠️</span> {supp.warnings}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {content.actionPlan && (
          <div className="space-y-3 bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-lg text-blue-800 dark:text-blue-300">
              Plan d'action Semaine 1
            </h4>
            <p className="text-blue-900/80 dark:text-blue-100/80 leading-relaxed text-sm">
              {content.actionPlan}
            </p>
          </div>
        )}

        {content.scienceDeepDive && (
          <details className="group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
              <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
              Science & Mécanismes
            </summary>
            <div className="mt-3 pl-6 text-sm text-foreground/70 leading-relaxed">
              {content.scienceDeepDive}
            </div>
          </details>
        )}

        {expertName && (
          <div className="flex items-center gap-3 pt-4 border-t border-border/30">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-primary" />
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Analyse par</span>
              <span className="ml-1 font-medium">{expertName}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ReportSection;
