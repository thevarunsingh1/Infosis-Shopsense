import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SearchInput = z.object({
  query: z.string().min(2).max(200),
  limit: z.number().int().min(1).max(12).default(6),
});

async function embed(text: string, key: string): Promise<number[]> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({ model: "openai/text-embedding-3-small", input: text }),
  });
  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 429) throw new Error("AI is rate limited right now. Try again shortly.");
    if (response.status === 402) throw new Error("AI credits are exhausted for this workspace.");
    throw new Error(`Embedding request failed (${response.status}): ${detail.slice(0, 180)}`);
  }
  const json = (await response.json()) as { data: { embedding: number[] }[] };
  const vector = json.data?.[0]?.embedding;
  if (!vector) throw new Error("Embedding response was empty.");
  return vector;
}

/** Generates (or refreshes) embeddings for every product the caller can access. */
export const indexProductEmbeddings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured for this project.");
    const { supabase } = context;

    const { data: products, error } = await supabase
      .from("products")
      .select("id, vendor_id, name, category, description, seo_description, tags")
      .limit(200);
    if (error) throw new Error(error.message);
    if (!products || products.length === 0) return { indexed: 0 };

    let indexed = 0;
    for (const product of products) {
      const content = [
        product.name,
        product.category,
        product.description ?? "",
        product.seo_description ?? "",
        (product.tags ?? []).join(", "),
      ]
        .filter(Boolean)
        .join(" · ");

      const embedding = await embed(content, key);
      const { error: upsertError } = await supabase.from("product_embeddings").upsert(
        {
          product_id: product.id,
          vendor_id: product.vendor_id,
          content,
          embedding: JSON.stringify(embedding),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "product_id" },
      );
      if (!upsertError) indexed += 1;
    }

    return { indexed };
  });

/** Semantic product search over stored embeddings. */
export const semanticProductSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SearchInput.parse(input))
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured for this project.");
    const { supabase } = context;

    const { count } = await supabase
      .from("product_embeddings")
      .select("product_id", { count: "exact", head: true })
      .not("embedding", "is", null);

    if (!count) return { indexed: false, results: [] };

    const embedding = await embed(data.query, key);
    const { data: matches, error } = await supabase.rpc("match_products", {
      _embedding: JSON.stringify(embedding),
      _limit: data.limit,
    });
    if (error) throw new Error(error.message);

    return {
      indexed: true,
      results: (matches ?? []).map((row) => ({
        product_id: row.product_id,
        name: row.name,
        category: row.category,
        price: Number(row.price ?? 0),
        image_url: row.image_url,
        similarity: Number(row.similarity ?? 0),
      })),
    };
  });
