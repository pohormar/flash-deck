import { z } from "zod";
import type { APIRoute } from "astro";
import { startGeneration } from "../../../lib/services/generation.service";
import type { StartGenerationRequestDto } from "../../../types";
import { DEFAULT_USER_ID } from "../../../db/supabase.client";

// Source text schema for validation
const sourceTextSchema = z.object({
  source_text: z.string().min(1000).max(10000),
});

// Handler for POST /api/generations
export const POST: APIRoute = async ({ request, locals }) => {
  // Get Supabase client from context
  const supabase = locals.supabase;

  try {
    // Parse and validate request body
    const body = (await request.json()) as StartGenerationRequestDto;
    const validation = sourceTextSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "Source text must be between 1000 and 10000 characters",
          },
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Start generation process using DEFAULT_USER_ID
    const result = await startGeneration(DEFAULT_USER_ID, body.source_text, supabase);

    // Return successful response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Generation error:", error);
    
    // Return appropriate error response
    let status = 500;
    let message = "Generation error occurred";
    let code = "internal_server_error";

    if (error instanceof Error) {
      if (error.message.includes("text must be between")) {
        status = 400;
        code = "invalid_input";
      } else if (error.message.includes("rate limit")) {
        status = 429;
        code = "too_many_requests";
        message = "You've reached the generation rate limit. Please try again later.";
      }
    }

    return new Response(
      JSON.stringify({
        error: {
          code,
          message,
        },
      }),
      {
        status,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};

// Disable prerendering for API routes
export const prerender = false; 