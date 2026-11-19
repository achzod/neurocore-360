import React from "react";
import { ArrowRight, Check } from "lucide-react";
import type { Theme } from "./ultrahuman/types";
import { DiscoveryWhatsAppLink } from "./DiscoveryWhatsAppCTA";
import { getDeductionAmount } from "./ultrahuman/coachingOffers";
import { trackDiscoveryOfferClick, type DiscoveryOfferClickPlacement } from "@/lib/analytics";
import { useStickyOfferBarVisibility } from "@/lib/stickyOfferBar";
import {
  DISCOVERY_OFFER_DESCRIPTIONS,
  DISCOVERY_OFFER_LABELS,
  discoveryOfferCtaLabel,
  discoveryOfferDeduction,
  discoveryOfferHref,
  discoveryOfferWhy,
  discoveryOfferWindowFrom,
  discoveryOtherFormulasHref,
  isDiscoveryOfferWindowOpen,
  type DiscoveryOfferRecommendation,
  type DiscoveryOfferWindow,
} from "@shared/discoveryOfferRecommendation";

export interface DiscoveryOfferView {
  recommendation: DiscoveryOfferRecommendation;
  label: string;
  description: string;
  why: string;
  deduction: ReturnType<typeof discoveryOfferDeduction>;
  ctaLabel: string;
  href: string;
  stickyHref: string;
  otherFormulasHref: string;
}

/** Tout ce que la page affiche pour l'offre recommandée, calculé une fois. */
export function buildDiscoveryOfferView(
  recommendation: DiscoveryOfferRecommendation,
  generatedAt: string | undefined,
  now: Date = new Date(),
): DiscoveryOfferView {
  const offerWindow: DiscoveryOfferWindow | null = discoveryOfferWindowFrom(generatedAt);
  const openWindow = isDiscoveryOfferWindowOpen(offerWindow, now) ? offerWindow : null;
  const deduction = discoveryOfferDeduction(recommendation.offer, {
    openWindow,
    anabolicDeductionEuros: getDeductionAmount("ANABOLIC_BIOSCAN"),
  });
  return {
    recommendation,
    label: DISCOVERY_OFFER_LABELS[recommendation.offer],
    description: DISCOVERY_OFFER_DESCRIPTIONS[recommendation.offer],
    why: discoveryOfferWhy(recommendation),
    deduction,
    ctaLabel: discoveryOfferCtaLabel(recommendation.offer, Boolean(deduction?.code)),
    href: discoveryOfferHref(recommendation.offer, { openWindow, medium: "report", content: "offer_card" }),
    stickyHref: discoveryOfferHref(recommendation.offer, { openWindow, medium: "report", content: "sticky" }),
    otherFormulasHref: discoveryOtherFormulasHref({ openWindow, medium: "report", content: "other_formulas" }),
  };
}

function isExternal(href: string): boolean {
  return /^https?:\/\//.test(href);
}

function OfferLink({
  view,
  href,
  placement,
  className,
  style,
  children,
  testId,
}: {
  view: DiscoveryOfferView;
  href: string;
  placement: DiscoveryOfferClickPlacement;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  testId: string;
}) {
  const external = isExternal(href);
  return (
    <a
      href={href}
      data-testid={testId}
      data-offer-id={view.recommendation.offer}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={className}
      style={style}
      onClick={() => trackDiscoveryOfferClick(view.recommendation.offer, view.recommendation.reason, placement, href)}
    >
      {children}
    </a>
  );
}

export const DiscoveryRecommendedOffer: React.FC<{ theme: Theme; view: DiscoveryOfferView; clientName: string }> = ({
  theme,
  view,
  clientName,
}) => {
  const onPrimary = theme.type === "dark" ? "#000" : "#fff";
  return (
    <section
      id="offre-recommandee"
      data-testid="discovery-recommended-offer"
      className="scroll-mt-32 rounded-2xl p-6 md:p-10 relative overflow-hidden"
      style={{ backgroundColor: theme.colors.surface, border: `2px solid ${theme.colors.primary}` }}
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: theme.colors.primary }} />

      <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: theme.colors.primary }}>
        Ma recommandation pour toi, {clientName}
      </p>
      <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-3" style={{ color: theme.colors.text }}>
        {view.label}
      </h2>
      <p className="text-base leading-relaxed mb-2" style={{ color: theme.colors.text }}>
        {view.why}
      </p>
      <p className="text-sm leading-relaxed mb-6" style={{ color: theme.colors.textMuted }}>
        {view.description}
      </p>

      {view.deduction && (
        <div
          data-testid="discovery-offer-deduction"
          className="rounded-xl p-4 md:p-5 mb-6"
          style={{ backgroundColor: `${theme.colors.primary}1f`, border: `1px solid ${theme.colors.primary}66` }}
        >
          <p className="flex items-center gap-2 text-sm md:text-base font-bold" style={{ color: theme.colors.primary }}>
            <Check size={18} aria-hidden="true" />
            {view.deduction.title}
          </p>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: theme.colors.text }}>
            {view.deduction.detail}
          </p>
          {view.deduction.code && (
            <p className="text-sm mt-3" style={{ color: theme.colors.textMuted }}>
              Ton code :{" "}
              <strong className="font-mono tracking-widest" style={{ color: theme.colors.primary }}>
                {view.deduction.code}
              </strong>
            </p>
          )}
        </div>
      )}

      <OfferLink
        view={view}
        href={view.href}
        placement="report_offer"
        testId="discovery-offer-cta"
        className="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-center text-base font-bold transition-all hover:opacity-90 md:w-auto md:inline-flex"
        style={{ backgroundColor: theme.colors.primary, color: onPrimary }}
      >
        {view.ctaLabel}
        <ArrowRight size={18} aria-hidden="true" />
      </OfferLink>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <OfferLink
          view={view}
          href={view.otherFormulasHref}
          placement="report_other_formulas"
          testId="discovery-other-formulas"
          className="text-xs underline underline-offset-4 opacity-70 hover:opacity-100"
          style={{ color: theme.colors.textMuted }}
        >
          Voir les autres formules
        </OfferLink>
        <p className="text-xs" style={{ color: theme.colors.textMuted }}>
          Un doute ? Écris-moi, je te réponds personnellement.
        </p>
      </div>
    </section>
  );
};

export const DiscoveryOfferStickyBar: React.FC<{ theme: Theme; view: DiscoveryOfferView; show: boolean; clientName?: string }> = ({
  theme,
  view,
  show,
  clientName,
}) => {
  useStickyOfferBarVisibility(show);
  if (!show) return null;
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 backdrop-blur-md"
      style={{ backgroundColor: `${theme.colors.background}cc`, borderTop: `1px solid ${theme.colors.border}` }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <div className="hidden md:block">
          <p className="text-sm font-bold" style={{ color: theme.colors.text }}>Ma recommandation : {view.label}</p>
          {view.deduction && (
            <p className="text-xs" style={{ color: theme.colors.textMuted }}>{view.deduction.title}</p>
          )}
        </div>
        <div className="flex gap-2 sm:gap-3 w-full md:w-auto">
          <DiscoveryWhatsAppLink
            placement="report_sticky"
            clientName={clientName}
            label="WhatsApp"
            className="flex-1 px-4 py-3 text-center whitespace-nowrap md:flex-initial"
          />
          <OfferLink
            view={view}
            href={view.stickyHref}
            placement="report_sticky"
            testId="discovery-offer-sticky"
            className="flex-1 md:flex-initial inline-flex items-center justify-center rounded-xl px-4 sm:px-6 py-3 text-sm font-bold text-center whitespace-nowrap transition-all hover:opacity-90"
            style={{ backgroundColor: theme.colors.primary, color: theme.type === "dark" ? "#000" : "#fff" }}
          >
            {view.label}
          </OfferLink>
        </div>
      </div>
    </div>
  );
};
