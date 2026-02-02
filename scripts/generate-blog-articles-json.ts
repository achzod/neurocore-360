import { writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { BLOG_ARTICLES } from "../client/src/data/blogArticles";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const outputPath = path.resolve(__dirname, "..", "client", "public", "blog-articles.json");
  await writeFile(outputPath, JSON.stringify(BLOG_ARTICLES));
  console.log(`✅ blog-articles.json generated (${BLOG_ARTICLES.length} articles)`);
}

main().catch((err) => {
  console.error("Failed to generate blog articles JSON:", err);
  process.exit(1);
});
