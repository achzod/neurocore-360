export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  date: string;
  readTime?: string;
  image?: string;
  featured?: boolean;
  priority?: number;
  imageUrl?: string;
}

export const BLOG_CATEGORIES = [
  { id: "all", label: "Tous" },
  { id: "musculation", label: "Musculation" },
  { id: "sarms", label: "SARMs & PEDs" },
  { id: "supplements", label: "Suppléments" },
  { id: "hormones", label: "Hormones" },
  { id: "sommeil", label: "Sommeil" },
  { id: "stress", label: "Stress & HRV" },
  { id: "nutrition", label: "Nutrition" },
  { id: "performance", label: "Performance" },
  { id: "metabolisme", label: "Métabolisme" },
  { id: "longevite", label: "Longévité" },
  { id: "biohacking", label: "Biohacking" },
  { id: "femmes", label: "Santé Femme" },
] as const;
