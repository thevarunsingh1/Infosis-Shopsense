import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const EnrichInput = z.object({
  name: z.string(),
  category: z.string().optional(),
  notes: z.string().optional(),
});

const VisionInput = z.object({
  imageUrl: z.string(),
});

const enrichSchema = z.object({
  seo_description: z.string(),
  tags: z.array(z.string()),
  keywords: z.array(z.string()),
});

const visionSchema = z.object({
  category: z.string(),
  tags: z.array(z.string()),
  summary: z.string(),
});

export const enrichProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EnrichInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured for this project.");

    const { generateText, Output, NoObjectGeneratedError } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = [
      `Product name: ${data.name}`,
      data.category ? `Category: ${data.category}` : "",
      data.notes ? `Seller notes: ${data.notes}` : "",
      "",
      "Write a persuasive, SEO-friendly product description of about 45 words.",
      "Then produce 5 short lowercase tags and 6 search keywords.",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const result = await generateText({
        model: gateway("google/gemini-3.6-flash"),
        output: Output.object({ schema: enrichSchema }),
        prompt,
      });
      const out = result.output;
      return {
        seo_description: out.seo_description.trim(),
        tags: out.tags.slice(0, 6).map((t) => t.toLowerCase()),
        keywords: out.keywords.slice(0, 8),
      };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error) && error.text) {
        try {
          const parsed = enrichSchema.parse(JSON.parse(error.text));
          return parsed;
        } catch {
          /* fall through */
        }
      }
      throw error;
    }
  });

export const analyzeProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VisionInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured for this project.");

    const { generateText, Output, NoObjectGeneratedError } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    try {
      const result = await generateText({
        model: gateway("google/gemini-3.6-flash"),
        output: Output.object({ schema: visionSchema }),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Classify this product image. Return a single retail category, 5 short lowercase visual tags, and a one-sentence summary.",
              },
              { type: "image", image: new URL(data.imageUrl) },
            ],
          },
        ],
      });
      const out = result.output;
      return {
        category: out.category.trim(),
        tags: out.tags.slice(0, 6).map((t) => t.toLowerCase()),
        summary: out.summary.trim(),
      };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error) && error.text) {
        try {
          return visionSchema.parse(JSON.parse(error.text));
        } catch {
          /* fall through */
        }
      }
      throw error;
    }
  });
