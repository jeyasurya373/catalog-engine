# Rubick Catalog Intelligence Engine

Working prototype for the Rubick AI retail SaaS assignment. It demonstrates catalog search, product detail, price history, product comparison, rule-based enrichment/deduplication, Redis caching, and live price updates through SSE.

## Stack
- Frontend: React, Vite, TanStack Query, Recharts
- Backend: Node.js, Fastify, TypeScript, Zod, PostgreSQL, Redis
- ML service: Python, FastAPI, RapidFuzz
- Local infra: Docker Compose, PostgreSQL, Redis

## Run
```bash
docker-compose up --build
```

Open:
- Dashboard: `http://localhost:5173/products`
- Backend health: `http://localhost:4000/health`
- Swagger docs: `http://localhost:4000/docs`
- ML health: `http://localhost:8000/health`

The backend runs migrations and seeds 50 products automatically on startup.

## Useful Commands
```bash
docker-compose exec backend npm run migrate
docker-compose exec backend npm run seed
docker-compose exec backend npm test
docker-compose exec ml-service pytest
```

## API
```text
GET  /health
GET  /products
GET  /products/:id
GET  /products/:id/price-history
GET  /compare?ids=product_id,product_id
POST /dedup/check
POST /crawl/simulate
GET  /crawl/status
GET  /stream/prices
```

ML service:
```text
GET  /health
POST /normalize
POST /enrich
POST /dedup/check
```

## Demo Flow
1. Open Product Explorer and search/filter products.
2. Open a product detail page to show platform prices and history.
3. Use Comparison Board with comma-separated product IDs.
4. Open Crawl Monitor and click `Simulate price crawl`.
5. Watch the live SSE event and crawl event list update.
6. Test dedup with `Nike Air Max Black EU 42` vs `Nike Airmax Shoes Size 8 Black`.

## Notes
- Live crawling is intentionally simulated.
- Kafka is part of the production architecture path, but Redis pub/sub keeps the prototype lightweight.
- The ML service works without an OpenAI key.
- Auth is out of scope because the assignment defines the dashboard as an internal tool.

See `docs/architecture.md` and `docs/demo-script.md` for the design explanation and walkthrough.

For hosted deployment, see `docs/deployment.md`.
