import fs from "fs";
import Anthropic from "@anthropic-ai/sdk";

// Load .env
const envPath = ".env";
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !line.startsWith("#")) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

async function quickTest() {
  console.log("🧪 Test rapide de génération...\n");

  const anthropic = new Anthropic();

  const prompt = `Génère un court rapport d'analyse sanguine (2000 caractères max) pour un homme de 32 ans avec les marqueurs suivants:
- Testostérone: 450 ng/dL (normal: 300-1000, optimal: 600-900)
- Vitamine D: 32 ng/mL (normal: 30-100, optimal: 50-80)
- CRP: 1.8 mg/L (normal: <3, optimal: <1)

Format: Synthèse + 3 recommandations courtes.`;

  console.log("⏱️  Temps de génération avec Opus 4.6...");
  const startTime = Date.now();

  const stream = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2000,
    system: "Tu es un expert en analyse sanguine. Sois concis et direct.",
    messages: [{ role: "user", content: prompt }],
    stream: true,
  });

  let output = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      output += event.delta.text;
      process.stdout.write(".");
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n✅ Généré en ${elapsed}s`);
  console.log(`📏 Taille: ${output.length} caractères\n`);
  console.log("📄 Contenu:\n");
  console.log(output);

  process.exit(0);
}

quickTest().catch(err => {
  console.error("❌ Erreur:", err.message);
  process.exit(1);
});
