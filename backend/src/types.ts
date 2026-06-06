export type PlatformEntry = {
  name: string;
  external_id: string;
  url: string;
  price: { current: number; original: number; discount_pct: number; currency: "INR" };
  availability: string;
  rating: { score: number; count: number };
  seller: string;
  last_crawled_at: string;
};

export type Product = {
  id: number;
  product_id: string;
  title: string;
  brand: string;
  category: { l1: string; l2: string; l3: string };
  attributes: Record<string, unknown>;
  platforms: PlatformEntry[];
  variants: Record<string, unknown>[];
  images: string[];
  enrichment_status: string;
  confidence_scores: Record<string, number>;
  created_at: string;
  updated_at: string;
};
