import type { BlogArticle } from "@/data/blogTypes";

/**
 * Blog data loaders.
 *
 * The build writes three files (see script/build.ts):
 * - /blog-index.json: every canonical article WITHOUT its body (listing pages).
 * - /blog-content/<slug>.json: one article body.
 * - /blog-articles.json: legacy full dump (kept for the server and as fallback).
 *
 * Listing pages used to download the full 3.7 MB dump (1.1 MB brotli) just to
 * show cards. They now load the light index; an article page loads the index
 * plus its own body only. The legacy dump remains a fallback so a stale HTML
 * shell or a missing file never breaks the blog.
 */
let indexPromise: Promise<BlogArticle[]> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function fetchLegacyAll(): Promise<BlogArticle[]> {
  return fetchJson<BlogArticle[]>("/blog-articles.json");
}

export function loadBlogIndex(): Promise<BlogArticle[]> {
  if (!indexPromise) {
    indexPromise = fetchJson<BlogArticle[]>("/blog-index.json")
      .then((items) => items.map((item) => ({ ...item, content: item.content ?? "" })))
      .catch(() => fetchLegacyAll())
      .catch((err) => {
        indexPromise = null;
        throw err;
      });
  }
  return indexPromise;
}

/** Index of all articles, with the body of `slug` filled in. */
export async function loadBlogArticleWithIndex(slug: string): Promise<BlogArticle[]> {
  const [index, body] = await Promise.all([
    loadBlogIndex(),
    fetchJson<{ slug: string; content: string }>(`/blog-content/${encodeURIComponent(slug)}.json`).catch(
      () => null,
    ),
  ]);
  if (body && typeof body.content === "string") {
    return index.map((item) => (item.slug === slug ? { ...item, content: body.content } : item));
  }
  // Unknown slug: the page shows its "not found" state, no need for the dump.
  if (!index.some((item) => item.slug === slug)) return index;
  // Body file missing (stale deploy): the legacy dump carries every body.
  return fetchLegacyAll();
}
