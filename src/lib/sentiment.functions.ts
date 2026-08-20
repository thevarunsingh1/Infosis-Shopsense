import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SentimentInput = z.object({
  productId: z.string().uuid().optional(),
});

const sentimentSchema = z.object({
  reviews: z.array(
    z.object({
      id: z.string(),
      label: z.enum(["positive", "neutral", "negative"]),
      score: z.number().min(-1).max(1),
    }),
  ),
  summary: z.object({
    headline: z.string(),
    positive_points: z.array(z.string()),
    negative_points: z.array(z.string()),
    common_complaints: z.array(z.string()),
    common_preferences: z.array(z.string()),
  }),
});

export const analyzeReviewSentiment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SentimentInput.parse(input))
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured for this project.");

    const { supabase } = context;
    let query = supabase
      .from("product_reviews")
      .select("id, body, title, rating, product_id, products(name)")
      .order("created_at", { ascending: false })
      .limit(60);
    if (data.productId) query = query.eq("product_id", data.productId);

    const { data: reviews, error } = await query;
    if (error) throw new Error(error.message);
    if (!reviews || reviews.length === 0) {
      return { analyzed: 0, summary: null };
    }

    const { generateText, Output, NoObjectGeneratedError } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = [
      "Classify the sentiment of each customer review and summarise the feedback.",
      "Return a sentiment score from -1 (very negative) to 1 (very positive) per review.",
      "Keep every summary bullet under 12 words and grounded in the reviews.",
      "",
      ...reviews.map(
        (r) =>
          `id: ${r.id} | product: ${r.products?.name ?? "unknown"} | rating: ${r.rating} | "${r.title ?? ""} ${r.body}"`,
      ),
    ].join("\n");

    let parsed: z.infer<typeof sentimentSchema>;
    try {
      const result = await generateText({
        model: gateway("google/gemini-3.6-flash"),
        output: Output.object({ schema: sentimentSchema }),
        prompt,
      });
      parsed = result.output;
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err) && err.text) {
        parsed = sentimentSchema.parse(JSON.parse(err.text));
      } else {
        throw err;
      }
    }

    const valid = new Set(reviews.map((r) => r.id));
    const now = new Date().toISOString();
    let analyzed = 0;
    for (const item of parsed.reviews) {
      if (!valid.has(item.id)) continue;
      const { error: updateError } = await supabase
        .from("product_reviews")
        .update({ sentiment_label: item.label, sentiment_score: item.score, analyzed_at: now })
        .eq("id", item.id);
      if (!updateError) analyzed += 1;
    }

    return { analyzed, summary: parsed.summary };
  });
