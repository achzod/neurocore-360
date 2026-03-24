import React, { useState, useEffect } from 'react';
import { Zap, Check, X, Clock, TrendingUp, Star, AlertTriangle, Target } from 'lucide-react';
import { Theme, SectionContent } from './ultrahuman/types';

// ═══════════════════════════════════════════════════════════════════════════════
// SCAN RECOMMENDATION LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

type ScanRecommendation = 'ultimate' | 'anabolic' | 'default';

interface RecommendationAnalysis {
  type: ScanRecommendation;
  hasHormonalIssues: boolean;
  hasMultipleWeakAreas: boolean;
  weakDomains: string[];
}

const HORMONAL_KEYWORDS = [
  'hormonal', 'hormone', 'testostérone', 'testosterone', 'cortisol',
  'anabolique', 'anabolic', 'métabolisme', 'metabolism', 'thyroïde', 'thyroid',
  'insuline', 'insulin', 'oestrogène', 'estrogen', 'androgène', 'androgen',
  'libido', 'récupération musculaire', 'muscle', 'masse musculaire',
  'prise de masse', 'perte de poids', 'adipeux', 'adiposité', 'gras',
  'énergie matinale', 'fatigue chronique'
];

const MULTI_WEAK_KEYWORDS = [
  'sommeil', 'sleep', 'stress', 'digestion', 'intestin', 'microbiome',
  'posture', 'biomécanique', 'entraînement', 'training', 'récupération',
  'nutrition', 'hydratation', 'mental', 'mindset', 'cognition'
];

function analyzeWeakAreas(sections: SectionContent[], globalScore: number): RecommendationAnalysis {
  const allText = sections
    .map(s => `${s.title} ${s.subtitle ?? ''} ${s.content}`.toLowerCase())
    .join(' ');

  const hasHormonalIssues = HORMONAL_KEYWORDS.some(kw => allText.includes(kw.toLowerCase()));

  const weakDomains = MULTI_WEAK_KEYWORDS.filter(kw => allText.includes(kw.toLowerCase()));
  const hasMultipleWeakAreas = weakDomains.length >= 3 || globalScore < 5;

  let type: ScanRecommendation = 'default';
  if (globalScore < 5 || hasMultipleWeakAreas) {
    type = 'ultimate';
  } else if (hasHormonalIssues) {
    type = 'anabolic';
  } else {
    type = 'ultimate';
  }

  return { type, hasHormonalIssues, hasMultipleWeakAreas, weakDomains };
}

function getHeroText(analysis: RecommendationAnalysis, globalScore: number): {
  label: string;
  headline: string;
  subline: string;
  primaryCta: string;
  primaryLink: string;
  secondaryCta: string;
  secondaryLink: string;
  features: string[];
} {
  if (analysis.type === 'anabolic') {
    return {
      label: 'Déséquilibre hormonal détecté',
      headline: 'Ton profil hormonal suggère des blocages anaboliques',
      subline: "L'Anabolic Bioscan identifie exactement ton potentiel anabolique, tes axes hormonaux et tes protocoles de correction.",
      primaryCta: 'Anabolic Bioscan - 59€ (acompte coaching)',
      primaryLink: '/offers/anabolic-bioscan',
      secondaryCta: 'Ultimate Scan - 79€ (acompte coaching)',
      secondaryLink: '/offers/ultimate-scan',
      features: ['Profil hormonal complet', 'Stack suppléments personnalisé', 'Protocoles Matin/Soir anti-cortisol', 'Plan 30-60-90j']
    };
  }

  if (analysis.type === 'ultimate' && globalScore < 5) {
    return {
      label: 'Blocages multiples détectés',
      headline: `Ton score global (${globalScore}/10) révèle des blocages sur plusieurs fronts`,
      subline: "L'Ultimate Scan est le plus adapté : 18 domaines analysés + posture 3D + wearables + dashboard temps réel.",
      primaryCta: 'Ultimate Scan - 79€ (acompte coaching)',
      primaryLink: '/offers/ultimate-scan',
      secondaryCta: 'Anabolic Bioscan - 59€ (acompte coaching)',
      secondaryLink: '/offers/anabolic-bioscan',
      features: ['18 sections d\'analyse', 'Analyse posturale 3D', 'Wearables Apple/Garmin', 'Dashboard temps réel à vie']
    };
  }

  return {
    label: 'Upgrade Disponible',
    headline: 'Ton Discovery a détecté tes blocages',
    subline: 'Tu veux les corriger avec des protocoles exacts + analyse en temps réel ?',
    primaryCta: 'Ultimate Scan - 79€ (acompte coaching)',
    primaryLink: '/offers/ultimate-scan',
    secondaryCta: 'Anabolic Bioscan - 59€ (acompte coaching)',
    secondaryLink: '/offers/anabolic-bioscan',
    features: ['Protocoles personnalisés', 'Wearables (Apple/Garmin)', 'Posture 3D']
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPGRADE HERO - CTA en haut du rapport avant le contenu
// ═══════════════════════════════════════════════════════════════════════════════

interface UpgradeHeroProps {
  theme: Theme;
  sections?: SectionContent[];
  globalScore?: number;
}

export const UpgradeHero: React.FC<UpgradeHeroProps> = ({ theme, sections = [], globalScore = 5 }) => {
  const analysis = analyzeWeakAreas(sections, globalScore);
  const text = getHeroText(analysis, globalScore);

  return (
    <div
      className="rounded-sm p-6 md:p-8 mb-12 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.primary}20 0%, ${theme.colors.surface} 100%)`,
        border: `1px solid ${theme.colors.primary}40`
      }}
    >
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(to right, ${theme.colors.primary} 1px, transparent 1px), linear-gradient(to bottom, ${theme.colors.primary} 1px, transparent 1px)`,
          backgroundSize: '30px 30px'
        }}
      />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            {analysis.type === 'ultimate' && globalScore < 5
              ? <AlertTriangle size={20} style={{ color: theme.colors.primary }} />
              : <Zap size={20} style={{ color: theme.colors.primary }} />
            }
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: theme.colors.primary }}
            >
              {text.label}
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-bold mb-2" style={{ color: theme.colors.text }}>
            {text.headline}
          </h3>
          <p className="text-sm md:text-base" style={{ color: theme.colors.textMuted }}>
            {text.subline}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-4 text-xs" style={{ color: theme.colors.textMuted }}>
            {text.features.map((feature, i) => (
              <span key={i} className="flex items-center gap-1">
                <Check size={14} style={{ color: theme.colors.primary }} /> {feature}
              </span>
            ))}
          </div>
          <p className="text-xs mt-3 font-medium" style={{ color: theme.colors.textMuted }}>
            100% déduit de ton coaching Achzod
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <a
            href={text.primaryLink}
            className="px-6 py-3 rounded font-bold text-sm transition-all hover:scale-105 text-center whitespace-nowrap"
            style={{
              backgroundColor: theme.colors.primary,
              color: theme.type === 'dark' ? '#000' : '#FFF'
            }}
          >
            {text.primaryCta}
          </a>
          <a
            href={text.secondaryLink}
            className="px-6 py-3 rounded font-bold text-sm transition-all hover:scale-105 text-center whitespace-nowrap"
            style={{
              backgroundColor: 'transparent',
              border: `1px solid ${theme.colors.border}`,
              color: theme.colors.text
            }}
          >
            {text.secondaryCta}
          </a>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARISON TABLE - Tableau comparatif Discovery vs Anabolic vs Ultimate
// ═══════════════════════════════════════════════════════════════════════════════

interface ComparisonTableProps {
  theme: Theme;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ theme }) => {
  const features = [
    { label: 'Problèmes détectés', discovery: true, anabolic: true, ultimate: true },
    { label: 'Recommandations', discovery: 'Générales', anabolic: 'Précises', ultimate: 'Précises' },
    { label: 'Stack Suppléments', discovery: false, anabolic: 'Personnalisé', ultimate: 'Personnalisé' },
    { label: 'Protocoles Matin/Soir', discovery: false, anabolic: true, ultimate: true },
    { label: 'Reset Digestif 14j', discovery: false, anabolic: true, ultimate: true },
    { label: 'Intégration Wearables', discovery: false, anabolic: false, ultimate: 'Apple/Garmin' },
    { label: 'Analyse Posturale 3D', discovery: false, anabolic: false, ultimate: true },
    { label: 'Dashboard Temps Réel', discovery: false, anabolic: false, ultimate: 'À vie' },
    { label: 'Rapport PDF', discovery: '10 pages', anabolic: '20+ pages', ultimate: '25+ pages' },
    { label: 'Plan 30-60-90j', discovery: false, anabolic: true, ultimate: true },
    { label: 'Support Email', discovery: false, anabolic: false, ultimate: 'Prioritaire' },
  ];

  const renderCell = (value: boolean | string) => {
    if (value === true) return <Check size={16} style={{ color: theme.colors.primary }} />;
    if (value === false) return <X size={16} style={{ color: theme.colors.textMuted, opacity: 0.3 }} />;
    return <span className="text-xs font-medium" style={{ color: theme.colors.text }}>{value}</span>;
  };

  return (
    <div className="mb-16">
      <div className="text-center mb-8">
        <h3 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: theme.colors.text }}>
          Compare les scans
        </h3>
        <p className="text-sm md:text-base max-w-2xl mx-auto" style={{ color: theme.colors.textMuted }}>
          Choisis le niveau d'analyse qui correspond à tes objectifs
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className="text-left p-4 text-xs font-bold uppercase tracking-wider" style={{ color: theme.colors.textMuted }}>
                Fonctionnalité
              </th>
              <th className="text-center p-4" style={{ backgroundColor: theme.colors.surface }}>
                <div className="text-sm font-bold mb-1" style={{ color: theme.colors.text }}>Discovery</div>
                <div className="text-xs" style={{ color: theme.colors.textMuted }}>Gratuit</div>
              </th>
              <th className="text-center p-4" style={{ backgroundColor: theme.colors.surface }}>
                <div className="text-sm font-bold mb-1" style={{ color: theme.colors.text }}>Anabolic</div>
                <div className="text-xs font-bold" style={{ color: theme.colors.primary }}>59€</div>
              </th>
              <th className="text-center p-4 relative" style={{ backgroundColor: theme.colors.surface }}>
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase" style={{ backgroundColor: theme.colors.primary, color: theme.type === 'dark' ? '#000' : '#FFF' }}>
                  Recommandé
                </div>
                <div className="text-sm font-bold mb-1" style={{ color: theme.colors.text }}>Ultimate</div>
                <div className="text-xs font-bold" style={{ color: theme.colors.primary }}>79€</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature, idx) => (
              <tr key={idx} style={{ borderTop: `1px solid ${theme.colors.border}` }}>
                <td className="p-4 text-sm" style={{ color: theme.colors.text }}>
                  {feature.label}
                </td>
                <td className="p-4 text-center" style={{ backgroundColor: theme.colors.surface }}>
                  {renderCell(feature.discovery)}
                </td>
                <td className="p-4 text-center" style={{ backgroundColor: theme.colors.surface }}>
                  {renderCell(feature.anabolic)}
                </td>
                <td className="p-4 text-center" style={{ backgroundColor: theme.colors.surface }}>
                  {renderCell(feature.ultimate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
        <a
          href="/offers/ultimate-scan"
          className="px-8 py-4 rounded font-bold text-base transition-all hover:scale-105 text-center"
          style={{
            backgroundColor: theme.colors.primary,
            color: theme.type === 'dark' ? '#000' : '#FFF'
          }}
        >
          <div className="flex items-center justify-center gap-2">
            <Zap size={18} />
            <span>Passer à Ultimate (79€)</span>
          </div>
        </a>
        <a
          href="/offers/anabolic-bioscan"
          className="px-8 py-4 rounded font-bold text-base transition-all hover:scale-105 text-center"
          style={{
            backgroundColor: 'transparent',
            border: `2px solid ${theme.colors.border}`,
            color: theme.colors.text
          }}
        >
          Passer à Anabolic (59€)
        </a>
      </div>

      <p className="text-center text-xs mt-4" style={{ color: theme.colors.textMuted }}>
        💰 100% déductible de ton coaching Achzod
      </p>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SOCIAL PROOF BLOCK - Témoignage client contextuel
// ═══════════════════════════════════════════════════════════════════════════════

interface SocialProofBlockProps {
  theme: Theme;
  quote: string;
  author: string;
  context?: string;
}

export const SocialProofBlock: React.FC<SocialProofBlockProps> = ({ theme, quote, author, context }) => {
  return (
    <div
      className="rounded-sm p-6 my-8 relative"
      style={{
        backgroundColor: `${theme.colors.primary}10`,
        border: `1px solid ${theme.colors.primary}30`
      }}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: theme.colors.primary }}
          >
            <Star size={20} style={{ color: theme.type === 'dark' ? '#000' : '#FFF' }} />
          </div>
        </div>
        <div className="flex-1">
          {context && (
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.colors.primary }}>
              {context}
            </p>
          )}
          <blockquote className="text-sm md:text-base mb-3 leading-relaxed" style={{ color: theme.colors.text }}>
            "{quote}"
          </blockquote>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold" style={{ color: theme.colors.text }}>
              — {author}
            </p>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} size={12} className="fill-yellow-400 text-yellow-400" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// UPGRADE TEASER - Bloc entre les sections
// ═══════════════════════════════════════════════════════════════════════════════

type TeaserContext = 'energy' | 'training' | 'generic';

interface UpgradeTeaserProps {
  theme: Theme;
  title: string;
  description: string;
  features: string[];
  ctaText?: string;
  ctaLink?: string;
  sections?: SectionContent[];
  globalScore?: number;
  context?: TeaserContext;
}

export const UpgradeTeaser: React.FC<UpgradeTeaserProps> = ({
  theme,
  title,
  description,
  features,
  ctaText,
  ctaLink,
  sections = [],
  globalScore = 5,
  context = 'generic'
}) => {
  // Derive smart CTA based on context + scores when no explicit override is provided
  const analysis = analyzeWeakAreas(sections, globalScore);

  let resolvedCtaText: string;
  let resolvedCtaLink: string;
  let secondaryCtaText: string;
  let secondaryCtaLink: string;
  let contextNote: string;

  if (context === 'energy') {
    // After energy/metabolism sections → lean toward Anabolic
    const preferAnabolic = analysis.hasHormonalIssues || analysis.type === 'anabolic';
    resolvedCtaText = ctaText ?? (preferAnabolic ? 'Anabolic Bioscan - 59€ (acompte coaching)' : 'Ultimate Scan - 79€ (acompte coaching)');
    resolvedCtaLink = ctaLink ?? (preferAnabolic ? '/offers/anabolic-bioscan' : '/offers/ultimate-scan');
    secondaryCtaText = preferAnabolic ? 'Ultimate Scan - 79€ (acompte coaching)' : 'Anabolic Bioscan - 59€ (acompte coaching)';
    secondaryCtaLink = preferAnabolic ? '/offers/ultimate-scan' : '/offers/anabolic-bioscan';
    contextNote = 'Ton profil hormonal détaillé avec l\'Anabolic Bioscan';
  } else if (context === 'training') {
    // After training/recovery sections → lean toward Ultimate
    resolvedCtaText = ctaText ?? 'Ultimate Scan - 79€ (acompte coaching)';
    resolvedCtaLink = ctaLink ?? '/offers/ultimate-scan';
    secondaryCtaText = 'Anabolic Bioscan - 59€ (acompte coaching)';
    secondaryCtaLink = '/offers/anabolic-bioscan';
    contextNote = 'Analyse posturale 3D + wearables avec l\'Ultimate Scan';
  } else {
    // Generic: use analysis-driven recommendation
    const primaryIsUltimate = analysis.type !== 'anabolic';
    resolvedCtaText = ctaText ?? (primaryIsUltimate ? 'Débloquer Ultimate (79€)' : 'Anabolic Bioscan - 59€ (acompte coaching)');
    resolvedCtaLink = ctaLink ?? (primaryIsUltimate ? '/offers/ultimate-scan' : '/offers/anabolic-bioscan');
    secondaryCtaText = primaryIsUltimate ? 'Anabolic (59€)' : 'Ultimate (79€)';
    secondaryCtaLink = primaryIsUltimate ? '/offers/anabolic-bioscan' : '/offers/ultimate-scan';
    contextNote = '';
  }

  return (
    <div
      className="rounded-sm p-6 md:p-8 my-12"
      style={{
        backgroundColor: theme.colors.surface,
        border: `2px solid ${theme.colors.primary}40`
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={20} style={{ color: theme.colors.primary }} />
        <h4 className="text-lg font-bold" style={{ color: theme.colors.text }}>
          {title}
        </h4>
      </div>

      <p className="text-sm mb-6" style={{ color: theme.colors.textMuted }}>
        {description}
      </p>

      {contextNote && (
        <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: theme.colors.primary }}>
          {contextNote}
        </p>
      )}

      <div className="space-y-2 mb-6">
        {features.map((feature, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm" style={{ color: theme.colors.text }}>
            <Check size={16} style={{ color: theme.colors.primary }} />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={resolvedCtaLink}
          className="flex-1 px-6 py-3 rounded font-bold text-sm transition-all hover:scale-105 text-center"
          style={{
            backgroundColor: theme.colors.primary,
            color: theme.type === 'dark' ? '#000' : '#FFF'
          }}
        >
          {resolvedCtaText}
        </a>
        <a
          href={secondaryCtaLink}
          className="px-6 py-3 rounded font-bold text-sm transition-all hover:scale-105 text-center whitespace-nowrap"
          style={{
            backgroundColor: 'transparent',
            border: `1px solid ${theme.colors.border}`,
            color: theme.colors.text
          }}
        >
          {secondaryCtaText}
        </a>
      </div>

      <p className="text-xs mt-4" style={{ color: theme.colors.textMuted }}>
        100% déduit de ton coaching Achzod
      </p>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SMART RECOMMENDATION - Boîte de recommandation personnalisée
// ═══════════════════════════════════════════════════════════════════════════════

interface SmartRecommendationProps {
  theme: Theme;
  sections?: SectionContent[];
  globalScore?: number;
}

export const SmartRecommendation: React.FC<SmartRecommendationProps> = ({
  theme,
  sections = [],
  globalScore = 5
}) => {
  const analysis = analyzeWeakAreas(sections, globalScore);

  let headline: string;
  let bodyText: string;
  let primaryCta: string;
  let primaryLink: string;
  let secondaryCta: string;
  let secondaryLink: string;
  let icon: React.ReactNode;

  if (globalScore < 5 || analysis.hasMultipleWeakAreas) {
    headline = 'Analyse complète recommandée';
    bodyText = `Tes résultats montrent des blocages importants sur plusieurs fronts. L'Ultimate Scan (79€) est le plus adapté car il couvre les 18 domaines + posture + wearables + biomécanique.`;
    primaryCta = 'Ultimate Scan - 79€ (acompte coaching)';
    primaryLink = '/offers/ultimate-scan';
    secondaryCta = 'Anabolic Bioscan - 59€ (acompte coaching)';
    secondaryLink = '/offers/anabolic-bioscan';
    icon = <AlertTriangle size={22} style={{ color: theme.colors.primary }} />;
  } else if (analysis.hasHormonalIssues) {
    headline = 'Profil hormonal à optimiser';
    bodyText = "Ton profil suggère un déséquilibre hormonal. L'Anabolic Bioscan (59€) va identifier ton potentiel anabolique, tes axes hormonaux et les protocoles de correction associés.";
    primaryCta = 'Anabolic Bioscan - 59€ (acompte coaching)';
    primaryLink = '/offers/anabolic-bioscan';
    secondaryCta = 'Ultimate Scan - 79€ (acompte coaching)';
    secondaryLink = '/offers/ultimate-scan';
    icon = <Target size={22} style={{ color: theme.colors.primary }} />;
  } else {
    headline = "Choisis l'analyse adaptée";
    bodyText = "Pour aller plus loin, choisis l'analyse adaptée à tes besoins. L'Ultimate Scan couvre 18 domaines pour une vue complète. L'Anabolic Bioscan cible spécifiquement ton profil hormonal et ton potentiel.";
    primaryCta = 'Ultimate Scan - 79€ (acompte coaching)';
    primaryLink = '/offers/ultimate-scan';
    secondaryCta = 'Anabolic Bioscan - 59€ (acompte coaching)';
    secondaryLink = '/offers/anabolic-bioscan';
    icon = <Zap size={22} style={{ color: theme.colors.primary }} />;
  }

  return (
    <div
      className="rounded-sm p-6 md:p-8 my-10 relative overflow-hidden"
      style={{
        backgroundColor: theme.colors.surface,
        border: `2px solid ${theme.colors.primary}`
      }}
    >
      {/* Accent top line */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: theme.colors.primary }}
      />

      <div className="flex items-start gap-4 mb-5">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${theme.colors.primary}20` }}
        >
          {icon}
        </div>
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-1"
            style={{ color: theme.colors.primary }}
          >
            Recommandation personnalisée — basée sur tes résultats Discovery
          </p>
          <h4 className="text-lg font-bold" style={{ color: theme.colors.text }}>
            {headline}
          </h4>
        </div>
      </div>

      <p className="text-sm mb-6 leading-relaxed" style={{ color: theme.colors.textMuted }}>
        {bodyText}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <a
          href={primaryLink}
          className="flex-1 px-6 py-3 rounded font-bold text-sm transition-all hover:scale-105 text-center"
          style={{
            backgroundColor: theme.colors.primary,
            color: theme.type === 'dark' ? '#000' : '#FFF'
          }}
        >
          <span className="flex items-center justify-center gap-2">
            <Zap size={16} />
            {primaryCta}
          </span>
        </a>
        <a
          href={secondaryLink}
          className="flex-1 px-6 py-3 rounded font-bold text-sm transition-all hover:scale-105 text-center"
          style={{
            backgroundColor: 'transparent',
            border: `1px solid ${theme.colors.border}`,
            color: theme.colors.text
          }}
        >
          {secondaryCta}
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: theme.colors.textMuted }}>
        <span className="flex items-center gap-1">
          <Check size={12} style={{ color: theme.colors.primary }} />
          100% déduit de ton coaching Achzod
        </span>
        <span className="flex items-center gap-1">
          <Check size={12} style={{ color: theme.colors.primary }} />
          Rapport livré en 24-48h
        </span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STICKY CTA - Bouton fixe en bas
// ═══════════════════════════════════════════════════════════════════════════════

interface StickyCTAProps {
  theme: Theme;
  show: boolean;
}

export const StickyCTA: React.FC<StickyCTAProps> = ({ theme, show }) => {
  if (!show) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 backdrop-blur-md transition-transform duration-300"
      style={{
        backgroundColor: `${theme.colors.background}cc`,
        borderTop: `1px solid ${theme.colors.border}`,
        transform: show ? 'translateY(0)' : 'translateY(100%)'
      }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <div className="hidden md:block">
          <p className="text-sm font-bold" style={{ color: theme.colors.text }}>
            Prêt à débloquer tes protocoles ?
          </p>
          <p className="text-xs" style={{ color: theme.colors.textMuted }}>
            Ultimate (79€) ou Anabolic (59€)
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <a
            href="/offers/ultimate-scan"
            className="flex-1 md:flex-initial px-6 py-3 rounded font-bold text-sm transition-all hover:scale-105 text-center whitespace-nowrap"
            style={{
              backgroundColor: theme.colors.primary,
              color: theme.type === 'dark' ? '#000' : '#FFF'
            }}
          >
            <span className="flex items-center justify-center gap-2">
              <Zap size={16} />
              Ultimate 79€
            </span>
          </a>
          <a
            href="/offers/anabolic-bioscan"
            className="flex-1 md:flex-initial px-6 py-3 rounded font-bold text-sm transition-all hover:scale-105 text-center whitespace-nowrap"
            style={{
              backgroundColor: 'transparent',
              border: `1px solid ${theme.colors.border}`,
              color: theme.colors.text
            }}
          >
            Anabolic 59€
          </a>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// FINAL CTA - CTA final amélioré avec urgency/timer
// ═══════════════════════════════════════════════════════════════════════════════

interface FinalCTAProps {
  theme: Theme;
  auditId?: string;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ theme, auditId }) => {
  const OFFER_DURATION_MS = 48 * 60 * 60 * 1000; // 48 hours

  const getOrInitStartTime = (): number => {
    const key = `apexlabs_offer_start_${auditId || 'default'}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return parseInt(stored, 10);
    }
    const now = Date.now();
    localStorage.setItem(key, String(now));
    return now;
  };

  const computeTimeLeft = (startTime: number) => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, OFFER_DURATION_MS - elapsed);
    const totalSeconds = Math.floor(remaining / 1000);
    return {
      hours: Math.floor(totalSeconds / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
      expired: remaining === 0,
    };
  };

  const [startTime] = useState<number>(() => getOrInitStartTime());
  const [timeLeft, setTimeLeft] = useState(() => computeTimeLeft(startTime));

  useEffect(() => {
    if (timeLeft.expired) return;

    const timer = setInterval(() => {
      const next = computeTimeLeft(startTime);
      setTimeLeft(next);
      if (next.expired) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, timeLeft.expired]);

  return (
    <div
      className="rounded-sm p-8 md:p-12 mb-16 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.primary}25 0%, ${theme.colors.surface} 50%, ${theme.colors.background} 100%)`,
        border: `2px solid ${theme.colors.primary}`
      }}
    >
      {/* Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[100px] opacity-20"
        style={{ backgroundColor: theme.colors.primary }}
      />

      <div className="relative z-10 text-center max-w-3xl mx-auto">
        {/* Timer */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
          style={{
            backgroundColor: `${theme.colors.primary}20`,
            border: `1px solid ${theme.colors.primary}`
          }}
        >
          <Clock size={16} style={{ color: theme.colors.primary }} />
          {timeLeft.expired ? (
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.colors.primary }}>
              Offre expirée
            </span>
          ) : (
            <>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.colors.primary }}>
                Offre spéciale - Expire dans
              </span>
              <span className="font-mono font-bold" style={{ color: theme.colors.primary }}>
                {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
              </span>
            </>
          )}
        </div>

        {/* Title */}
        <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{ color: theme.colors.text }}>
          Prêt à passer au niveau Elite ?
        </h2>

        <p className="text-base md:text-lg mb-8" style={{ color: theme.colors.textMuted }}>
          Tu as vu tes blocages dans ce Discovery Scan.<br />
          Maintenant tu as 2 options.
        </p>

        {/* Options */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Option 1 */}
          <div
            className="p-6 rounded-sm text-left"
            style={{
              backgroundColor: theme.colors.surface,
              border: `1px solid ${theme.colors.border}`,
              opacity: 0.6
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <X size={20} style={{ color: theme.colors.textMuted }} />
              <h4 className="font-bold" style={{ color: theme.colors.textMuted }}>Option 1</h4>
            </div>
            <p className="text-sm" style={{ color: theme.colors.textMuted }}>
              Tu restes avec ce rapport gratuit → Tu sais ce qui cloche → Mais pas comment le corriger précisément → Tu continues à essayer au hasard
            </p>
          </div>

          {/* Option 2 */}
          <div
            className="p-6 rounded-sm text-left relative"
            style={{
              backgroundColor: theme.colors.surface,
              border: `2px solid ${theme.colors.primary}`
            }}
          >
            <div className="absolute -top-3 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase" style={{ backgroundColor: theme.colors.primary, color: theme.type === 'dark' ? '#000' : '#FFF' }}>
              Recommandé
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Check size={20} style={{ color: theme.colors.primary }} />
              <h4 className="font-bold" style={{ color: theme.colors.text }}>Option 2</h4>
            </div>
            <p className="text-sm mb-4" style={{ color: theme.colors.text }}>
              Tu passes à Ultimate ou Anabolic → Protocoles exacts → Stack suppléments → Plan d'action 30-60-90j → Dashboard temps réel
            </p>
            <div className="flex items-center gap-2 text-xs" style={{ color: theme.colors.textMuted }}>
              <Star size={12} className="fill-yellow-400 text-yellow-400" />
              <span>52 personnes ont upgradé cette semaine</span>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <a
            href="/offers/ultimate-scan"
            className="px-10 py-5 rounded font-bold text-lg transition-all hover:scale-105 shadow-lg"
            style={{
              backgroundColor: theme.colors.primary,
              color: theme.type === 'dark' ? '#000' : '#FFF',
              boxShadow: `0 10px 40px ${theme.colors.primary}40`
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <Zap size={22} />
              <div className="text-left">
                <div className="text-xs opacity-80 uppercase tracking-wider">Ultimate Scan</div>
                <div className="font-black">59€ au lieu de 79€</div>
              </div>
            </div>
          </a>
          <a
            href="/offers/anabolic-bioscan"
            className="px-10 py-5 rounded font-bold text-lg transition-all hover:scale-105"
            style={{
              backgroundColor: 'transparent',
              border: `2px solid ${theme.colors.border}`,
              color: theme.colors.text
            }}
          >
            <div className="text-left">
              <div className="text-xs opacity-60 uppercase tracking-wider">Anabolic Bioscan</div>
              <div className="font-black">59€</div>
            </div>
          </a>
        </div>

        {/* Footer info */}
        <div className="space-y-2">
          <p className="text-xs" style={{ color: theme.colors.textMuted }}>
            💰 100% déductible de ton coaching Achzod
          </p>
          <p className="text-xs" style={{ color: theme.colors.textMuted }}>
            🎁 Livraison garantie en 24-48h
          </p>
          <p className="text-xs" style={{ color: theme.colors.textMuted }}>
            ⭐ 6 avis, tous 5 étoiles • 100% de satisfaction
          </p>
        </div>
      </div>
    </div>
  );
};
