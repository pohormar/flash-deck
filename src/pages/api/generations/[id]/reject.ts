import { z } from "zod";
import type { APIRoute } from "astro";
import { rejectGeneration } from "../../../../lib/services/generation.service";
import { DEFAULT_USER_ID } from "../../../../db/supabase.client";

// ID parameter schema for validation
const idSchema = z.coerce.number().positive().int();

// Handler for POST /api/generations/:id/reject
export const POST: APIRoute = async ({ params, locals }) => {
  // Get Supabase client from context
  const supabase = locals.supabase;

  // Validate and parse the ID parameter
  const { id } = params;
  const validationResult = idSchema.safeParse(id);

  if (!validationResult.success) {
    return new Response(
      JSON.stringify({
        error: {
          code: "invalid_id",
          message: "Invalid generation ID",
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

  try {
    // Reject the generation
    const generationId = validationResult.data;
    const result = await rejectGeneration(generationId, DEFAULT_USER_ID, supabase);

    // Return successful response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error rejecting generation:", error);

    // Handle different error types
    let status = 500;
    let message = "An error occurred while rejecting the generation";
    let code = "internal_server_error";

    if (error instanceof Error) {
      if (error.message === "Generation not found") {
        status = 404;
        code = "not_found";
        message = "Generation not found";
      } else if (error.message === "You do not have access to this generation") {
        status = 403;
        code = "forbidden";
        message = "You do not have access to this generation";
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