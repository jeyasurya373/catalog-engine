import { pool, query } from "../src/db/pool.js";

const sql = `
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  product_id VARCHAR(32) NOT NULL UNIQUE,
  title TEXT NOT NULL,
  brand VARCHAR(120) NOT NULL,
  category JSONB NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
  variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  images TEXT[] DEFAULT '{}',
  enrichment_status VARCHAR(20) DEFAULT 'pending',
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL PRIMARY KEY,
  product_id VARCHAR(32) NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  platform VARCHAR(32) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  currency CHAR(3) DEFAULT 'INR',
  availability VARCHAR(20),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_mappings (
  id BIGSERIAL PRIMARY KEY,
  master_product_id VARCHAR(32) NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  platform VARCHAR(32) NOT NULL,
  platform_sku VARCHAR(64) NOT NULL,
  match_method VARCHAR(40) NOT NULL,
  confidence NUMERIC(4,3) NOT NULL,
  reviewed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crawl_events (
  id BIGSERIAL PRIMARY KEY,
  platform VARCHAR(32) NOT NULL,
  status VARCHAR(20) NOT NULL,
  event_type VARCHAR(40) NOT NULL,
  product_id VARCHAR(32),
  message TEXT,
  latency_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_title_trgm ON products USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_category ON products USING GIN (category jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_products_platforms ON products USING GIN (platforms jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_products_enrichment_work ON products (enrichment_status) WHERE enrichment_status <> 'complete';
CREATE INDEX IF NOT EXISTS idx_price_history_lookup ON price_history (product_id, platform, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawl_events_created ON crawl_events (created_at DESC);
`;

async function main() {
  await query(sql);
  console.log("Migration complete");
}

main().finally(() => pool.end());
