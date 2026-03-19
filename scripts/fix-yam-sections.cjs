// Script to add section headings to Yamamoto articles
const fs = require("fs");

let content = fs.readFileSync("client/src/data/yamamotoArticles.ts", "utf8");

// Topic-specific section headings for each article
const articleSections = {
  "yam-1": ["Qu'est-ce que la créatine ?", "Supplémentation et stockage musculaire", "Effets sur les performances", "Dosage et protocoles", "Formes alternatives et timing", "Conclusion"],
  "yam-2": ["Qu'est-ce que la bêta-alanine ?", "Le rôle de la carnosine", "Effets sur la performance", "Protocole de supplémentation", "Conclusion"],
  "yam-3": ["Origines et propriétés", "Effets sur le cortisol et le stress", "Impact sur la récupération", "Dosage et utilisation", "Conclusion"],
  "yam-4": ["Origines du guarana", "Composition et principes actifs", "Bienfaits pour la santé", "Utilisation et dosage", "Précautions"],
  "yam-5": ["Les acides aminés essentiels", "Rôle dans la synthèse protéique", "Sources alimentaires", "Supplémentation en EAA", "Dosage et timing"],
  "yam-6": ["L'écosystème intestinal", "Prébiotiques : nourrir les bonnes bactéries", "Probiotiques : rôle et bienfaits", "Équilibre de la flore intestinale", "Recommandations pratiques"],
  "yam-7": ["L'innovation MCU-20", "Mécanisme d'action", "Biodisponibilité améliorée", "Applications pratiques"],
  "yam-8": ["Importance des glucides pour le sportif", "Types de glucides et index glycémique", "Besoins en glucides selon l'activité", "Timing et stratégie nutritionnelle", "Récupération et recharge glycogénique"],
  "yam-9": ["Rôle des glucides en endurance", "Besoins quantitatifs", "Types de glucides recommandés", "Stratégie pendant l'effort", "Récupération post-effort"],
  "yam-10": ["Protéines et endurance", "Besoins protéiques de l'athlète d'endurance", "Sources de protéines optimales", "Timing et récupération", "Recommandations pratiques"],
  "yam-11": ["Mécanismes de la déshydratation", "Rôle des sels minéraux", "Sodium et potassium", "Magnésium et calcium", "Stratégies d'hydratation"],
  "yam-12": ["Exigences nutritionnelles du cyclisme", "Alimentation avant la sortie", "Nutrition pendant l'effort", "Récupération post-effort", "Hydratation et supplémentation"],
  "yam-13": ["Exigences physiques du tennis", "Besoins énergétiques", "Macronutriments et répartition", "Hydratation sur le court", "Supplémentation recommandée"],
  "yam-14": ["Physiologie du sprint", "Besoins énergétiques du sprinter", "Protéines et masse musculaire", "Glucides et performance explosive", "Supplémentation spécifique"],
  "yam-15": ["Contraintes des sports d'hiver", "Besoins énergétiques en altitude", "Nutrition et thermorégulation", "Hydratation en environnement froid", "Supplémentation adaptée"],
  "yam-16": ["Rôle des barres énergétiques", "Composition nutritionnelle", "Timing de consommation", "Choix de la bonne barre", "Alternatives naturelles"],
  "yam-17": ["Le débat volume vs intensité", "Mécanismes de l'hypertrophie", "Approche orientée volume", "Approche orientée intensité", "Conclusion et recommandations"],
  "yam-18": ["Principes de la méthode SST", "Protocole d'entraînement", "Mécanismes physiologiques", "Variantes de la méthode", "Résultats et applications"],
  "yam-19": ["Anatomie de l'épaule", "Les 5 meilleurs exercices", "Technique et exécution", "Programmation et volume", "Prévention des blessures"],
  "yam-20": ["Pump musculaire : définition", "Volumisation cellulaire", "Différences physiologiques", "Implications pour l'hypertrophie", "Stratégies d'entraînement"],
  "yam-21": ["Les fondamentaux de l'hypertrophie", "Volume d'entraînement", "Intensité et recrutement musculaire", "Périodisation et récupération", "Conclusion"],
  "yam-22": ["Qu'est-ce que le cross training ?", "Structure d'une séance", "Mythes et réalités", "Nutrition du pratiquant", "Supplémentation recommandée"],
  "yam-23": ["Distances et formats du triathlon", "Par où commencer", "Structurer son entraînement", "Conseils pratiques", "Planification hebdomadaire"],
  "yam-24": ["La nage en eau libre", "Défis physiologiques", "Nutrition avant la compétition", "Hydratation pendant l'effort", "Supplémentation et récupération"],
  "yam-25": ["Le padel : un sport en plein essor", "Exigences physiques", "Entraînement spécifique", "Nutrition du joueur de padel", "Récupération et supplémentation"],
  "yam-26": ["Physiologie de l'altitude", "Adaptations de l'organisme", "Besoins nutritionnels en altitude", "Hydratation et électrolytes", "Planification de l'entraînement"],
  "yam-27": ["Sources de stress moderne", "Impact sur la santé", "Gestion du stress au quotidien", "Nutrition anti-stress", "Stratégies de récupération"],
  "yam-28": ["Le vieillissement biologique", "Nutrition et longévité", "Activité physique adaptée", "Supplémentation anti-âge", "Habitudes de vie clés"],
};

// Process each yamamoto article in the file
// Strategy: For each article, split the content paragraphs and insert headings
// at roughly equal intervals

let modified = content;

for (const [articleId, headings] of Object.entries(articleSections)) {
  // Find the content between content: ` and the closing ` for this article
  const idPattern = new RegExp(`id: \`${articleId}\`[\\s\\S]*?content: \`([\\s\\S]*?)\`\\s*,\\s*\\n\\s*author`);
  const match = idPattern.exec(modified);
  if (!match) {
    console.log(`Could not find article ${articleId}`);
    continue;
  }

  const originalContent = match[1];

  // Split by double newlines to get paragraphs
  const paragraphs = originalContent.split("\n\n");

  // Skip the title (first paragraph which is # Title)
  // And skip the CTA block at the end (--- and Anabolic Code blocks)
  let contentStart = 0;
  let contentEnd = paragraphs.length;

  // Find where actual content starts (after # title)
  for (let i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i].trim().startsWith("#")) {
      contentStart = i + 1;
      break;
    }
  }

  // Find where CTA starts (--- block near end)
  for (let i = paragraphs.length - 1; i >= 0; i--) {
    if (paragraphs[i].trim() === "---") {
      contentEnd = i;
      break;
    }
  }

  // Count content paragraphs
  const contentParagraphCount = contentEnd - contentStart;
  if (contentParagraphCount < 2) {
    console.log(`${articleId}: Only ${contentParagraphCount} content paragraphs, skipping`);
    continue;
  }

  // Distribute headings evenly across content paragraphs
  const headingsToInsert = headings.slice(0, Math.min(headings.length, Math.floor(contentParagraphCount / 1.5)));
  if (headingsToInsert.length === 0) continue;

  const interval = Math.max(1, Math.floor(contentParagraphCount / headingsToInsert.length));

  // Build new paragraphs array
  const newParagraphs = [];
  let headingIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    // Insert heading at appropriate content paragraph positions
    if (i >= contentStart && i < contentEnd && headingIndex < headingsToInsert.length) {
      const contentPos = i - contentStart;
      if (contentPos > 0 && contentPos % interval === 0) {
        newParagraphs.push(`## ${headingsToInsert[headingIndex]}`);
        headingIndex++;
      }
    }
    newParagraphs.push(paragraphs[i]);
  }

  const newContent = newParagraphs.join("\n\n");
  modified = modified.replace(originalContent, newContent);

  const addedCount = headingIndex;
  console.log(`${articleId}: Added ${addedCount} section headings (${contentParagraphCount} paragraphs)`);
}

fs.writeFileSync("client/src/data/yamamotoArticles.ts", modified);
console.log("\nDone! Yamamoto articles updated with section headings.");
