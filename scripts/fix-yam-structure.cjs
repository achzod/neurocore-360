// Script to properly structure Yamamoto articles:
// 1. Break long wall-of-text paragraphs into proper paragraphs
// 2. Insert section headings at appropriate positions
const fs = require("fs");

let content = fs.readFileSync("client/src/data/yamamotoArticles.ts", "utf8");

// Section headings for each article
const articleSections = {
  "yam-1": ["Qu'est-ce que la créatine ?", "Supplémentation et stockage musculaire", "Effets sur les performances", "Dosage et protocoles", "Conclusion"],
  "yam-2": ["Qu'est-ce que la bêta-alanine ?", "Le rôle de la carnosine", "Effets sur la performance", "Protocole de supplémentation"],
  "yam-3": ["Origines et propriétés", "Effets sur le cortisol et le stress", "Impact sur la récupération", "Dosage et utilisation"],
  "yam-4": ["Origines du guarana", "Composition et principes actifs", "Bienfaits pour la santé", "Utilisation et précautions"],
  "yam-5": ["Les acides aminés essentiels", "Rôle dans la synthèse protéique", "Sources et supplémentation", "Dosage et timing"],
  "yam-6": ["L'écosystème intestinal", "Prébiotiques et probiotiques", "Équilibre de la flore", "Recommandations pratiques"],
  "yam-7": ["L'innovation MCU-20", "Mécanisme d'action", "Applications pratiques"],
  "yam-8": ["Importance des glucides", "Types et index glycémique", "Besoins selon l'activité", "Timing nutritionnel", "Récupération et recharge"],
  "yam-9": ["Rôle des glucides en endurance", "Besoins quantitatifs", "Stratégie pendant l'effort", "Récupération post-effort"],
  "yam-10": ["Protéines et endurance", "Besoins de l'athlète", "Sources et timing", "Recommandations pratiques"],
  "yam-11": ["Mécanismes de la déshydratation", "Rôle des sels minéraux", "Sodium et électrolytes", "Stratégies d'hydratation"],
  "yam-12": ["Exigences du cyclisme", "Avant la sortie", "Pendant l'effort", "Récupération"],
  "yam-13": ["Exigences physiques du tennis", "Besoins énergétiques", "Hydratation et nutrition", "Supplémentation"],
  "yam-14": ["Physiologie du sprint", "Besoins énergétiques", "Protéines et masse musculaire", "Supplémentation spécifique"],
  "yam-15": ["Contraintes des sports d'hiver", "Besoins en altitude", "Thermorégulation", "Supplémentation adaptée"],
  "yam-16": ["Rôle des barres énergétiques", "Composition nutritionnelle", "Timing de consommation", "Choix et alternatives"],
  "yam-17": ["Le débat volume vs intensité", "Mécanismes de l'hypertrophie", "Approches d'entraînement", "Conclusion"],
  "yam-18": ["Principes de la méthode SST", "Protocole d'entraînement", "Variantes et résultats"],
  "yam-19": ["Anatomie de l'épaule", "Les meilleurs exercices", "Technique et prévention"],
  "yam-20": ["Pump musculaire", "Volumisation cellulaire", "Implications pour l'hypertrophie", "Stratégies d'entraînement"],
  "yam-21": ["Fondamentaux de l'hypertrophie", "Volume d'entraînement", "Intensité et recrutement", "Périodisation", "Conclusion"],
  "yam-22": ["Qu'est-ce que le cross training ?", "Structure d'une séance", "Mythes et réalités", "Nutrition du pratiquant"],
  "yam-23": ["Distances et formats", "Par où commencer", "Conseils pratiques", "Planification"],
  "yam-24": ["La nage en eau libre", "Défis physiologiques", "Nutrition de compétition", "Hydratation et supplémentation"],
  "yam-25": ["Le padel en plein essor", "Entraînement spécifique", "Nutrition du joueur", "Récupération"],
  "yam-26": ["Physiologie de l'altitude", "Adaptations de l'organisme", "Nutrition en altitude", "Planification"],
  "yam-27": ["Sources de stress moderne", "Impact sur la santé", "Gestion au quotidien", "Nutrition et récupération"],
  "yam-28": ["Le vieillissement biologique", "Nutrition et longévité", "Activité physique adaptée", "Habitudes de vie clés"],
};

function breakLongParagraph(text, minSentences) {
  // Split by sentences (period followed by space and capital letter)
  // This handles French text
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-ZÀÂÆÇÉÈÊËÏÎÔÙÛÜŸŒ])/);

  if (sentences.length <= minSentences) {
    return [text]; // Not enough sentences to split
  }

  // Group sentences into paragraphs of 3-5 sentences each
  const paragraphs = [];
  const targetSize = Math.ceil(sentences.length / Math.ceil(sentences.length / 4));

  for (let i = 0; i < sentences.length; i += targetSize) {
    const chunk = sentences.slice(i, i + targetSize);
    paragraphs.push(chunk.join(" "));
  }

  return paragraphs;
}

let processedCount = 0;

for (const [articleId, headings] of Object.entries(articleSections)) {
  const idEscaped = articleId.replace("-", "\\-");
  const regex = new RegExp(`(id: \`${articleId}\`[\\s\\S]*?content: \`)([\\s\\S]*?)(\`\\s*,\\s*\\n\\s*author)`);
  const match = regex.exec(content);

  if (!match) {
    console.log(`Could not find article ${articleId}`);
    continue;
  }

  const originalContent = match[2];
  const parts = originalContent.split("\n\n");

  // Separate title, body, and CTA
  let title = "";
  let body = [];
  let cta = [];
  let inCTA = false;

  for (let i = 0; i < parts.length; i++) {
    const trimmed = parts[i].trim();
    if (i === 0 && trimmed.startsWith("#")) {
      title = trimmed;
      continue;
    }
    if (trimmed === "---" || inCTA) {
      inCTA = true;
      cta.push(parts[i]);
      continue;
    }
    // Remove existing h2 headings that we previously inserted
    if (trimmed.startsWith("## ")) {
      continue;
    }
    body.push(parts[i]);
  }

  // Break long body paragraphs into smaller ones
  const allParagraphs = [];
  for (const para of body) {
    if (para.length > 800) {
      const broken = breakLongParagraph(para, 3);
      allParagraphs.push(...broken);
    } else {
      allParagraphs.push(para);
    }
  }

  // Filter out empty paragraphs
  const filteredParagraphs = allParagraphs.filter(p => p.trim().length > 0);

  if (filteredParagraphs.length === 0) {
    console.log(`${articleId}: No body paragraphs found, skipping`);
    continue;
  }

  // Insert headings at evenly spaced positions
  const numHeadings = Math.min(headings.length, Math.floor(filteredParagraphs.length / 2));
  if (numHeadings === 0) {
    console.log(`${articleId}: Not enough paragraphs (${filteredParagraphs.length}) for headings, skipping`);
    continue;
  }

  const interval = Math.floor(filteredParagraphs.length / numHeadings);
  const result = [title, ""];
  let headingIdx = 0;

  for (let i = 0; i < filteredParagraphs.length; i++) {
    // Insert heading before certain paragraphs
    if (headingIdx < numHeadings && i === headingIdx * interval && i > 0) {
      result.push(`## ${headings[headingIdx]}`);
      result.push("");
      headingIdx++;
    } else if (headingIdx === 0 && i === 0) {
      // First heading goes before first paragraph
      result.push(`## ${headings[0]}`);
      result.push("");
      headingIdx++;
    }
    result.push(filteredParagraphs[i]);
    result.push("");
  }

  // Add CTA back
  if (cta.length > 0) {
    result.push(...cta);
  }

  const newContent = result.join("\n\n").replace(/\n{4,}/g, "\n\n");

  // Replace in the file
  content = content.replace(originalContent, newContent);
  processedCount++;

  // Count resulting h2s
  const h2Count = (newContent.match(/^## /gm) || []).length;
  const paraCount = filteredParagraphs.length;
  console.log(`${articleId}: ${h2Count} headings, ${paraCount} paragraphs`);
}

fs.writeFileSync("client/src/data/yamamotoArticles.ts", content);
console.log(`\nProcessed ${processedCount} articles`);
