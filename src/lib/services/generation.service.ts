import { supabaseClient } from '../../db/supabase.client';
import type { SupabaseClient } from '../../db/supabase.client';
import type { 
  FlashcardProposalDto,
  GenerationDetailResponseDto, 
  GenerationRow, 
  StartGenerationResponseDto,
  FlashcardRow,
  FlashcardAcceptDto,
  AcceptGenerationFlashcardsResponseDto,
  FlashcardDto
} from '../../types';

/**
 * Type for Supabase client from context
 */
export type SupabaseClient = any; // This will be properly imported or defined in a real implementation

/**
 * Starts a new flashcard generation process
 * @param userId - The ID of the authenticated user
 * @param sourceText - The source text to generate flashcards from
 * @param supabase - The Supabase client instance
 * @returns The generation details with flashcard proposals
 * @throws Error if the generation process fails
 */
export async function startGeneration(
  userId: string,
  sourceText: string,
  supabase: SupabaseClient
): Promise<StartGenerationResponseDto> {
  // Validate input text length
  if (sourceText.length < 1000 || sourceText.length > 10000) {
    throw new Error("Source text must be between 1000 and 10000 characters");
  }

  // Create initial generation record
  const startTime = Date.now();
  const { data: generation, error: creationError } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      source_text_length: sourceText.length,
      status: "pending", // Add initial status
    })
    .select()
    .single();

  if (creationError) {
    await logGenerationError(
      userId,
      "db_insert_failed",
      "Failed to create generation record",
      sourceText.length,
      supabase
    );
    throw new Error("Failed to start generation process");
  }

  try {
    // Call AI service to generate flashcards
    const flashcardProposals = await generateFlashcardsFromText(sourceText);
    const generationDuration = Date.now() - startTime;

    // Update generation record with results
    const { error: updateError } = await supabase
      .from("generations")
      .update({
        generation_duration: generationDuration,
        flashcards_count: flashcardProposals.length,
      })
      .eq("id", generation.id);

    if (updateError) {
      throw new Error("Failed to update generation record");
    }

    // Return generation details and flashcard proposals
    return {
      id: generation.id,
      user_id: userId,
      source_text_length: sourceText.length,
      generation_duration: generationDuration,
      created_at: generation.created_at,
      flashcards_count: flashcardProposals.length,
      flashcards_proposals: flashcardProposals,
    };
  } catch (error) {
    // Log error and rethrow
    await logGenerationError(
      userId,
      "ai_service_error",
      error instanceof Error ? error.message : "Unknown AI service error",
      sourceText.length,
      supabase,
      generation.id
    );
    throw new Error("Generation error occurred");
  }
}

/**
 * Retrieves a generation by ID
 * @param generationId - The ID of the generation to retrieve
 * @param userId - The ID of the authenticated user
 * @param supabase - The Supabase client instance
 * @returns The generation details with associated flashcards
 * @throws Error if the generation is not found or doesn't belong to the user
 */
export async function getGenerationById(
  generationId: number,
  userId: string,
  supabase: SupabaseClient
): Promise<GenerationDetailResponseDto> {
  // Fetch generation record
  const { data: generation, error: generationError } = await supabase
    .from("generations")
    .select("*")
    .eq("id", generationId)
    .single();

  if (generationError) {
    throw new Error("Generation not found");
  }

  // Verify ownership
  if (generation.user_id !== userId) {
    throw new Error("You do not have access to this generation");
  }

  // Fetch associated flashcards
  const { data: flashcards, error: flashcardsError } = await supabase
    .from("flashcards")
    .select("*")
    .eq("generation_id", generationId);

  if (flashcardsError) {
    throw new Error("Failed to retrieve flashcards");
  }

  // Return generation details with flashcards
  return {
    id: generation.id,
    user_id: generation.user_id,
    source_text_length: generation.source_text_length,
    generation_duration: generation.generation_duration,
    created_at: generation.created_at,
    flashcards_count: generation.flashcards_count,
    flashcards: flashcards.map((card: FlashcardRow) => ({
      id: card.id,
      front_text: card.front_text,
      back_text: card.back_text,
      source_type: card.source_type,
      created_at: card.created_at,
      updated_at: card.updated_at,
      generation_id: card.generation_id,
    })),
  };
}

/**
 * Accept generated flashcards and save them to the database
 * @param generationId - The ID of the generation
 * @param flashcards - The flashcards to accept
 * @param userId - The ID of the authenticated user
 * @param supabase - The Supabase client instance
 * @returns The accepted flashcards
 * @throws Error if the generation is not found or doesn't belong to the user
 */
export async function acceptGenerationFlashcards(
  generationId: number,
  flashcards: FlashcardAcceptDto[],
  userId: string,
  supabase: SupabaseClient
): Promise<AcceptGenerationFlashcardsResponseDto> {
  // Verify that the generation exists and belongs to the user
  const { data: generation, error: generationError } = await supabase
    .from("generations")
    .select("*")
    .eq("id", generationId)
    .eq("user_id", userId)
    .single();

  if (generationError) {
    throw new Error("Generation not found");
  }

  // Validate that the flashcards belong to the correct generation
  flashcards.forEach(card => {
    if (card.generation_id !== generationId) {
      throw new Error("One or more flashcards do not belong to the specified generation");
    }
  });

  // Insert the flashcards into the database
  const { data: insertedFlashcards, error: insertError } = await supabase
    .from("flashcards")
    .insert(
      flashcards.map(card => ({
        front_text: card.front_text,
        back_text: card.back_text,
        source_type: card.source_type,
        generation_id: generationId,
        user_id: userId,
      }))
    )
    .select();

  if (insertError) {
    throw new Error("Failed to save flashcards");
  }

  // Count unedited and edited cards
  const unedited = flashcards.filter(card => card.source_type === "ai_full").length;
  const edited = flashcards.filter(card => card.source_type === "ai_edited").length;

  // Update the generation record with acceptance counts and status
  await supabase
    .from("generations")
    .update({
      accepted_unedited_count: unedited,
      accepted_edited_count: edited,
      status: "accepted",
    })
    .eq("id", generationId);

  // Convert the inserted flashcards to DTOs and return the response
  const flashcardDtos: FlashcardDto[] = insertedFlashcards.map(card => ({
    id: card.id,
    front_text: card.front_text,
    back_text: card.back_text,
    source_type: card.source_type,
    created_at: card.created_at,
    updated_at: card.updated_at,
    generation_id: card.generation_id,
  }));

  return {
    accepted_count: flashcardDtos.length,
    flashcards: flashcardDtos,
  };
}

/**
 * Reject a generation and mark it as rejected
 * @param generationId - The ID of the generation to reject
 * @param userId - The ID of the authenticated user
 * @param supabase - The Supabase client instance
 * @returns Success status
 * @throws Error if the generation is not found or doesn't belong to the user
 */
export async function rejectGeneration(
  generationId: number,
  userId: string,
  supabase: SupabaseClient
): Promise<{ success: boolean; id: number }> {
  // Verify that the generation exists and belongs to the user
  const { data: generation, error: generationError } = await supabase
    .from("generations")
    .select("*")
    .eq("id", generationId)
    .eq("user_id", userId)
    .single();

  if (generationError) {
    throw new Error("Generation not found");
  }

  // Update the generation status to rejected
  const { error: updateError } = await supabase
    .from("generations")
    .update({
      status: "rejected",
    })
    .eq("id", generationId);

  if (updateError) {
    throw new Error("Failed to reject generation");
  }

  return {
    success: true,
    id: generationId,
  };
}

/**
 * Logs a generation error
 * @param userId - The ID of the authenticated user
 * @param errorCode - The error code
 * @param errorMessage - The error message
 * @param sourceTextLength - The length of the source text
 * @param supabase - The Supabase client instance
 * @param generationId - The ID of the generation (if available)
 */
async function logGenerationError(
  userId: string,
  errorCode: string,
  errorMessage: string,
  sourceTextLength: number,
  supabase: SupabaseClient,
  generationId?: number
): Promise<void> {
  await supabase.from("generation_error_logs").insert({
    user_id: userId,
    generation_id: generationId,
    error_code: errorCode,
    error_message: errorMessage,
    source_text_length: sourceTextLength,
    model: "unknown", // Would be updated with actual model in production
  });
}

/**
 * Calls AI service to generate flashcards from source text
 * @param sourceText - The source text to generate flashcards from
 * @returns An array of flashcard proposals
 * @throws Error if the AI service call fails
 */
async function generateFlashcardsFromText(sourceText: string): Promise<FlashcardProposalDto[]> {
  // In a real implementation, this would call an external AI service like OpenRouter.ai
  // For now, we'll return some mock flashcards
  
  // Simulate processing time and potential timeout
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("AI service timeout")), 60000);
  });

  const aiServiceCall = new Promise<FlashcardProposalDto[]>((resolve) => {
    setTimeout(() => {
      // Generate mock flashcards based on the first 100 chars of text
      const firstWords = sourceText.slice(0, 100);
      const mockFlashcards: FlashcardProposalDto[] = [
        {
          id: undefined as unknown as number, // Type assertion to fix type error
          front_text: `What is the main topic of: "${firstWords}..."?`,
          back_text: "This would be filled with AI-generated content",
          source_type: "ai_full",
        },
        {
          id: undefined as unknown as number, // Type assertion to fix type error
          front_text: `Define the key concept in: "${firstWords}..."`,
          back_text: "This would be filled with AI-generated content",
          source_type: "ai_full",
        },
      ];
      resolve(mockFlashcards);
    }, 2000); // Simulate 2 second processing time
  });

  // Race between the AI service call and the timeout
  return Promise.race([aiServiceCall, timeout]);
} 
