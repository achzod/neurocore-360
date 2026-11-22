/**
 * Guide Peptides : page de retour Stripe. Confirme le paiement sans attendre
 * le webhook (GET /api/guide-peptides/session/:id) et donne le lien de téléchargement.
 */

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Check, Download, Loader2 } from "lucide-react";
import { GP, GuideFooter, GuidePeptidesFonts, GuideTopBar, POPPINS } from "@/pages/offers/GuidePeptides";

type State =
  | { kind: "loading" }
  | { kind: "pending" }
  | { kind: "paid"; email: string; orderNumber: string; downloadUrl: string }
  | { kind: "error"; message: string };

export default function GuidePeptidesMerci() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id") || "";
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
      setState({ kind: "error", message: "Je ne retrouve pas ton paiement sur cette page. Ton lien de téléchargement arrive par email." });
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const check = async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/guide-peptides/session/${encodeURIComponent(sessionId)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data.status === "paid") {
          setState({ kind: "paid", email: data.email, orderNumber: data.orderNumber, downloadUrl: data.downloadUrl });
          return;
        }
        if (res.status === 202 && attempts < 10) {
          setState({ kind: "pending" });
          setTimeout(check, 3000);
          return;
        }
        setState({ kind: "error", message: data.message || "Je n'arrive pas à confirmer le paiement pour le moment. Ton lien de téléchargement arrive par email." });
      } catch {
        if (!cancelled) setState({ kind: "error", message: "Connexion interrompue. Ton lien de téléchargement arrive aussi par email." });
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="gp-root flex min-h-screen flex-col" style={{ backgroundColor: GP.cream, color: GP.ink, fontFamily: POPPINS }}>
      <GuidePeptidesFonts />
      <GuideTopBar showCta={false} />
      <main className="flex-1 px-5 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl">
          {(state.kind === "loading" || state.kind === "pending") && (
            <div className="flex items-center gap-3 text-lg">
              <Loader2 className="h-5 w-5 animate-spin" />
              {state.kind === "loading" ? "Je vérifie ton paiement" : "Paiement en cours de confirmation, encore quelques secondes"}
            </div>
          )}

          {state.kind === "paid" && (
            <div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: GP.yellow }}>
                <Check className="h-6 w-6" />
              </span>
              <h1 className="gp-anton mt-6 text-[44px] leading-[1.02] sm:text-6xl">Merci, ton guide est là.</h1>
              <p className="mt-4 text-[17px] leading-relaxed" style={{ color: GP.muted }}>
                Paiement confirmé. Télécharge ton guide maintenant : le même lien vient aussi de partir à <span className="font-semibold" style={{ color: GP.ink }}>{state.email}</span>.
              </p>
              <a
                href={state.downloadUrl}
                className="mt-8 inline-flex items-center gap-2 rounded-md px-7 py-4 text-base font-semibold"
                style={{ backgroundColor: GP.yellow, color: GP.ink, boxShadow: `0 0 0 2px ${GP.ink}, 4px 4px 0 2px ${GP.ink}` }}
                data-testid="gp-download"
              >
                <Download className="h-5 w-5" /> Télécharger mon guide (PDF)
              </a>
              <p className="mt-4 text-sm" style={{ color: GP.muted }}>Lien privé, valable 30 jours, téléchargeable autant de fois que tu veux.</p>

              <div className="mt-10 rounded-sm border p-6" style={{ borderColor: GP.line, backgroundColor: GP.sand }}>
                <p className="text-sm">Ton numéro de commande : <span className="font-semibold">{state.orderNumber}</span></p>
                <div className="mt-5 space-y-4 text-[15px] leading-relaxed">
                  <p><span className="font-semibold">Bonus 1, l'accès privé à mes sources :</span> écris-moi à <a className="font-semibold underline" href={`mailto:achzodyt@gmail.com?subject=${encodeURIComponent(`Accès aux sources, commande ${state.orderNumber}`)}`}>achzodyt@gmail.com</a> avec ton numéro de commande.</p>
                  <p><span className="font-semibold">Bonus 2, 99 € offerts :</span> ton code <span className="rounded-sm px-1.5 py-0.5 font-semibold tracking-wider" style={{ backgroundColor: GP.yellow }}>BOOKPEPTIDES99</span> te donne 99 € de réduction sur <Link href="/offers/peptides-engine" className="font-semibold underline">Peptides Engine</Link> ou sur un coaching AchZod.</p>
                </div>
              </div>
            </div>
          )}

          {state.kind === "error" && (
            <div>
              <h1 className="gp-anton text-[40px] leading-[1.02] sm:text-5xl">Ton guide arrive par email</h1>
              <p className="mt-4 text-[17px] leading-relaxed" style={{ color: GP.muted }}>{state.message}</p>
              <p className="mt-4 text-[15px]" style={{ color: GP.muted }}>
                Rien reçu dans quelques minutes, même dans les spams ? Redemande ton lien sur <Link href="/offers/guide-peptides#lien" className="font-semibold underline" style={{ color: GP.ink }}>la page du guide</Link>.
              </p>
            </div>
          )}
        </div>
      </main>
      <GuideFooter />
    </div>
  );
}
