const API_URL = import.meta.env.VITE_API_URL ?? (
  import.meta.env.PROD
    ? "https://backend-production-bec0.up.railway.app"
    : "http://localhost:4000"
);

export type Product = {
  id: number;
  product_id: string;
  title: string;
  brand: string;
  category: { l1: string; l2: string; l3: string };
  attributes: Record<string, string>;
  platforms: Array<{
    name: string;
    price: { current: number; original: number; discount_pct: number; currency: string };
    availability: string;
    rating: { score: number; count: number };
    seller: string;
  }>;
  variants: Array<Record<string, string | number>>;
  images: string[];
  enrichment_status: string;
};

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) }
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export const api = {
  products: (params: URLSearchParams) => json<{ items: Product[]; nextCursor: number | null }>(`/products?${params}`),
  product: (id: string) => json<Product>(`/products/${id}`),
  priceHistory: (id: string) => json<{ points: Array<{ platform: string; price: number; recorded_at: string }> }>(`/products/${id}/price-history`),
  compare: (ids: string[]) => json<{ items: Product[] }>(`/compare?ids=${ids.join(",")}`),
  crawlStatus: () => json<{ events: Array<Record<string, string | number>> }>("/crawl/status"),
  simulateCrawl: () => json<Record<string, unknown>>("/crawl/simulate", { method: "POST", body: "{}" }),
  dedup: (left: string, right: string) => json<Record<string, unknown>>("/dedup/check", { method: "POST", body: JSON.stringify({ left, right }) }),
  streamUrl: `${API_URL}/stream/prices`
};
