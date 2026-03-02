import { writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { getAllArticles } from "../client/src/data/blogArticles";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const articles = getAllArticles();
  const outputPath = path.resolve(__dirname, "..", "client", "public", "blog-articles.json");
  await writeFile(outputPath, JSON.stringify(articles));
  console.log(`✅ blog-articles.json generated (${articles.length} articles)`);
}

main().catch((err) => {
  console.error("Failed to generate blog articles JSON:", err);
  process.exit(1);
});
