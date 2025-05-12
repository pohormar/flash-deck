import { z } from "zod";
import type { APIRoute } from "astro";
import { acceptGenerationFlashcards } from "../../../../lib/services/generation.service";
import type { AcceptGenerationFlashcardsRequestDto } from "../../../../types";
import { DEFAULT_USER_ID } from "../../../../db/supabase.client";

// ID parameter schema for validation
const idSchema = z.coerce.number().positive().int();

// Flashcard schema for validation
const flashcardSchema = z.object({
  id: z.number().optional(),
  front_text: z.string().min(1),
  back_text: z.string().min(1),
  source_type: z.enum(["ai_full", "ai_edited"]),
  generation_id: z.number().positive().int(),
});

// Request schema validation
const requestSchema = z.object({
  flashcards: z.array(flashcardSchema).min(1),
});

// Handler for POST /api/generations/:id/accept
export const POST: APIRoute = async ({ params, request, locals }) => {
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
    // Parse and validate request body
    const body = (await request.json()) as AcceptGenerationFlashcardsRequestDto;
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "Invalid flashcards data",
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

    // Validate that all flashcards belong to the specified generation
    const generationId = validationResult.data;
    const invalidFlashcards = body.flashcards.filter(
      (card) => card.generation_id !== generationId
    );

    if (invalidFlashcards.length > 0) {
      return new Response(
        JSON.stringify({
          error: {
            code: "mismatched_generation",
            message: "One or more flashcards do not belong to the specified generation",
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

    // Accept the flashcards
    const result = await acceptGenerationFlashcards(
      generationId,
      body.flashcards,
      DEFAULT_USER_ID,
      supabase
    );

    // Return successful response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error accepting flashcards:", error);

    // Handle different error types
    let status = 500;
    let message = "An error occurred while accepting flashcards";
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
      } else if (error.message.includes("do not belong to the specified generation")) {
        status = 400;
        code = "invalid_data";
        message = error.message;
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