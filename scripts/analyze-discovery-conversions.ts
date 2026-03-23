/**
 * Analyse des 200 Discovery scans pour stratégie de conversion
 *
 * Objectif: Identifier tous les Discovery envoyés et leur statut de relance
 * pour maximiser les conversions vers Ultimate/Anabolic
 */

import { db } from "../server/db";
import { audits } from "../shared/drizzle-schema";
import { eq, gte, and } from "drizzle-orm";
import { storage } from "../server/storage";

async function analyzeDiscoveryConversions() {
  console.log("🔍 ANALYSE DES 200 DISCOVERY SCANS\n");

  // Récupérer tous les audits GRATUIT depuis le 17 mars
  const startDate = new Date("2026-03-17");

  const discoveryAudits = await db
    .select()
    .from(audits)
    .where(
      and(
        eq(audits.type, "GRATUIT"),
        gte(audits.createdAt, startDate)
      )
    );

  console.log(`✅ Total Discovery scans depuis le 17/03: ${discoveryAudits.length}\n`);

  // Analyser chaque audit
  const stats = {
    total: discoveryAudits.length,
    sent: 0,
    scheduled: 0,
    failed: 0,
    daysSinceCreation: {} as Record<string, number>,
    needsJ2Relance: [] as any[],
    needsJ3Relance: [] as any[],
    needsJ7Relance: [] as any[],
    alreadyUpgraded: 0,
  };

  for (const audit of discoveryAudits) {
    const createdAt = new Date(audit.createdAt);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    // Status du rapport
    if (audit.reportDeliveryStatus === "SENT") {
      stats.sent++;
    } else if (audit.reportDeliveryStatus === "SCHEDULED") {
      stats.scheduled++;
    } else if (audit.reportDeliveryStatus === "FAILED") {
      stats.failed++;
    }

    // Compter par ancienneté
    const daysKey = `J+${daysSince}`;
    stats.daysSinceCreation[daysKey] = (stats.daysSinceCreation[daysKey] || 0) + 1;

    // Vérifier si des emails de relance ont été envoyés (ancien système)
    let hasJ2Email = false;
    let hasJ3Email = false;
    let hasJ7Email = false;

    try {
      const emailTracking = await storage.getEmailTrackingForAudit(audit.id);
      hasJ2Email = emailTracking.some(t => t.emailType === "GRATUIT_UPSELL");
      // hasJ3Email = emailTracking.some(t => t.emailType === "GRATUIT_J3");
      // hasJ7Email = emailTracking.some(t => t.emailType === "GRATUIT_J7");
    } catch (e) {
      // Pas de tracking ancien système
    }

    // Déterminer quels emails de relance envoyer
    const reportSentAt = (audit as any).reportSentAt;
    if (reportSentAt) {
      const sentDate = new Date(reportSentAt);
      const daysSinceSent = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));

      // J+2: Upsell Discovery → Ultimate/Anabolic
      if (daysSinceSent >= 2 && daysSinceSent < 30 && !hasJ2Email) {
        stats.needsJ2Relance.push({
          id: audit.id,
          email: audit.email,
          daysSinceSent,
          createdAt: audit.createdAt,
        });
      }

      // J+3: Social proof + urgence
      if (daysSinceSent >= 3 && daysSinceSent < 30 && !hasJ3Email) {
        stats.needsJ3Relance.push({
          id: audit.id,
          email: audit.email,
          daysSinceSent,
          createdAt: audit.createdAt,
        });
      }

      // J+7: Dernière chance + code promo
      if (daysSinceSent >= 7 && daysSinceSent < 30 && !hasJ7Email) {
        stats.needsJ7Relance.push({
          id: audit.id,
          email: audit.email,
          daysSinceSent,
          createdAt: audit.createdAt,
        });
      }
    }
  }

  // Afficher les résultats
  console.log("📊 RÉSULTATS:\n");
  console.log(`Total Discovery scans: ${stats.total}`);
  console.log(`  - Envoyés: ${stats.sent}`);
  console.log(`  - Programmés: ${stats.scheduled}`);
  console.log(`  - Échoués: ${stats.failed}\n`);

  console.log("📅 RÉPARTITION PAR ANCIENNETÉ:");
  Object.entries(stats.daysSinceCreation)
    .sort((a, b) => {
      const daysA = parseInt(a[0].replace("J+", ""));
      const daysB = parseInt(b[0].replace("J+", ""));
      return daysB - daysA;
    })
    .forEach(([days, count]) => {
      console.log(`  ${days}: ${count} audits`);
    });

  console.log("\n🎯 OPPORTUNITÉS DE RELANCE:");
  console.log(`  - J+2 Upsell (Discovery → Ultimate/Anabolic): ${stats.needsJ2Relance.length} emails à envoyer`);
  console.log(`  - J+3 Social Proof: ${stats.needsJ3Relance.length} emails à envoyer`);
  console.log(`  - J+7 Dernière Chance: ${stats.needsJ7Relance.length} emails à envoyer`);

  const totalOpportunities = stats.needsJ2Relance.length + stats.needsJ3Relance.length + stats.needsJ7Relance.length;
  console.log(`\n💰 TOTAL EMAILS DE RELANCE À ENVOYER: ${totalOpportunities}`);

  // Estimation conversions
  const estimatedConversionRate = 0.05; // 5% conversion conservatrice
  const avgOrderValue = 69; // Moyenne entre Anabolic (59€) et Ultimate (79€)
  const estimatedRevenue = totalOpportunities * estimatedConversionRate * avgOrderValue;

  console.log(`\n💵 ESTIMATION REVENUE POTENTIEL:`);
  console.log(`  - Taux conversion estimé: ${(estimatedConversionRate * 100).toFixed(1)}%`);
  console.log(`  - Valeur panier moyenne: ${avgOrderValue}€`);
  console.log(`  - Revenue potentiel: ${Math.round(estimatedRevenue)}€\n`);

  // Sauvegarder les listes pour envoi
  const fs = await import("fs/promises");
  await fs.writeFile(
    "/tmp/discovery_j2_relance.json",
    JSON.stringify(stats.needsJ2Relance, null, 2)
  );
  await fs.writeFile(
    "/tmp/discovery_j3_relance.json",
    JSON.stringify(stats.needsJ3Relance, null, 2)
  );
  await fs.writeFile(
    "/tmp/discovery_j7_relance.json",
    JSON.stringify(stats.needsJ7Relance, null, 2)
  );

  console.log("✅ Listes sauvegardées:");
  console.log("   - /tmp/discovery_j2_relance.json");
  console.log("   - /tmp/discovery_j3_relance.json");
  console.log("   - /tmp/discovery_j7_relance.json\n");

  return stats;
}

// Exécuter l'analyse
analyzeDiscoveryConversions()
  .then(() => {
    console.log("✅ Analyse terminée");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erreur:", error);
    process.exit(1);
  });
