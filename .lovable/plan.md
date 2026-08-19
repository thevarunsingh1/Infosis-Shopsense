# ShopSense Milestone 2 — Inventory Intelligence & Customer Analytics

Extends Milestone 1 in place. Same sidebar, cards, tables, status pills, auth flow and design tokens. No existing page is redesigned or removed.

## New navigation items (added after Products)

Inventory Intelligence, Customer Analytics, Sales Analytics, Recommendations, Inventory Forecast, Customer Sentiment. Existing Dashboard, Vendors, Products, Analytics, Reports, Approvals, Settings stay as they are.

## Database work

New columns and tables (migration, with GRANTs + RLS scoped like the current vendor/admin rules):

- `products.low_stock_threshold` (default 10), `products.units_sold` maintained from transactions.
- `inventory_movements` — product, vendor, change, reason (sale, restock, adjustment), timestamp. Gives real historical stock data.
- `product_reviews` — product, customer, rating, review text, created_at; plus cached sentiment fields (label, score, analyzed_at).
- `product_embeddings` — pgvector column for semantic search (enabled if the extension is available on the database; if not, fall back to a stored numeric-array similarity computed server-side, clearly noted in the UI).
- Seed rows flagged with an `is_demo` boolean so demo data is visibly separate from real vendor data.

New SQL functions (all vendor/admin scoped, no hardcoded numbers):

- `inventory_overview()` — totals, low/out-of-stock counts, inventory value, fast movers.
- `inventory_table()` — per product stock, units sold, velocity (units/day over trailing 30d), status bucket, last updated.
- `customer_overview()` and `customer_segments()` — new vs returning, AOV, avg spend, and High/Regular/Occasional/Low value segments derived from actual transaction totals.
- `sales_trends(days)` — revenue, orders, units for 7/30/90-day windows.
- `top_products(limit, category)` — units sold, revenue, category.

## New pages

1. **Inventory Intelligence** — overview cards (products, units, low stock, out of stock, inventory value, fast movers), a filterable/searchable inventory table (product, category, stock, status badge, units sold, velocity, last updated) reusing the existing table toolbar/pagination components, and a Low Stock Alerts panel listing every product under threshold with a message like "Low Stock: Wireless Headphones — only 8 units remaining".
2. **Customer Analytics** — overview cards plus segment cards/charts showing customer count, revenue, average spend, and share of total per segment.
3. **Sales Analytics** — 7/30/90-day toggle driving revenue/orders/units charts, plus Top 5 / Top 10 products with a category filter.
4. **Recommendations** — rule-based: top sellers per category (category selector), plus a "Recommended Products" list derived from purchase frequency and category affinity in real transaction history. No random data.
5. **Inventory Forecast** — server-side forecasting service (moving average + linear trend with seasonality damping over historical sales) returning predicted demand for the next 7/14/30 days and a recommended restock quantity. Line chart shows actuals plus a dashed **Predicted** series, always labelled.
6. **Customer Sentiment** — server-side LLM pipeline over `product_reviews` producing positive/neutral/negative counts, sentiment score, and a summary with top praise, top complaints, common preferences. Results cached in the database; UI has loading, empty ("no reviews yet"), and error states, including a clear message if AI is unavailable.

Vector search: a semantic product search box (on Recommendations) backed by an embeddings server function — embeddings generated server-side for product name + description, similarity search returning related products for queries like "products similar to wireless headphones".

## Validation

A small analytics consistency check (server-side) asserting revenue totals equal the sum of completed transactions, units sold equal recorded sales, per-customer spend equals their orders, and stock equals initial stock plus movements. Surfaced as a "Data integrity" strip on Sales Analytics.

## Technical notes

- All queries via existing `src/lib/data.ts` patterns and typed TanStack Query hooks; new analytics functions in `src/lib/analytics.ts`.
- Forecasting, sentiment, embeddings and vector search run in `createServerFn` handlers (`*.functions.ts`) using the existing auth middleware; the AI key stays server-side via the existing gateway helper.
- Reviews/movements/embeddings seeded with realistic demo rows in the migration so charts are populated immediately, marked `is_demo`.
- Existing routes, auth gate, storage upload, and product CRUD are untouched; verified after implementation.
