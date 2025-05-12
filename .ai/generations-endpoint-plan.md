# API Endpoint Implementation Plan: Flashcard Generations

## 1. Endpoint Overview
This plan covers the implementation of two REST endpoints for managing AI-generated flashcards:
1. **POST /api/generations** - Initiates a new flashcard generation process from source text
2. **GET /api/generations/{id}** - Retrieves generation status and results

These endpoints allow users to generate educational flashcards from their source text using AI services, review the generated proposals, and later accept them into their collection.

## 2. Request Details

### POST /api/generations
- **Method**: POST
- **URL Structure**: `/api/generations`
- **Parameters**:
  - **Required**: None in URL
  - **Optional**: None in URL
- **Request Body**: 
  ```json
  {
    "source_text": "Text content to generate flashcards from..."
  }
  ```
- **Headers**:
  - `Authorization: Bearer <jwt_token>` - Supabase JWT for authentication

### GET /api/generations/{id}
- **Method**: GET
- **URL Structure**: `/api/generations/{id}`
- **Parameters**:
  - **Required**: `id` (path parameter) - ID of the generation to retrieve
  - **Optional**: None
- **Request Body**: None
- **Headers**:
  - `Authorization: Bearer <jwt_token>` - Supabase JWT for authentication

## 3. Types and Models

### DTOs (Data Transfer Objects)
From `src/types.ts`:
- `StartGenerationRequestDto` - Request body for POST endpoint
- `StartGenerationResponseDto` - Response body for POST endpoint
- `GenerationDetailResponseDto` - Response body for GET endpoint
- `FlashcardProposalDto` - Lightweight flashcard object for generation proposals
- `FlashcardDto` - Full flashcard representation


## 4. Response Details

### POST /api/generations
- **Success Response**: 
  - **Status**: 200 OK (if synchronous) or 202 Accepted (if asynchronous)
  - **Body**: 
    ```json
    {
      "id": 1,
      "user_id": "uuid",
      "source_text_length": 1234,
      "generation_duration": 3200,
      "created_at": "timestamp",
      "flashcards_count": 10,
      "flashcards_proposals": [
        {
          "front_text": "Question?",
          "back_text": "Answer",
          "source_type": "ai_full"
        },
        ...
      ]
    }
    ```
- **Error Responses**:
  - **400 Bad Request**: Text too short or too long
  - **401 Unauthorized**: User not authenticated
  - **429 Too Many Requests**: Rate limit exceeded
  - **500 Internal Server Error**: Unexpected server error

### GET /api/generations/{id}
- **Success Response**:
  - **Status**: 200 OK
  - **Body**:
    ```json
    {
      "id": 1,
      "user_id": "uuid",
      "source_text_length": 1234,
      "generation_duration": 3200,
      "created_at": "timestamp",
      "flashcards_count": 10,
      "flashcards": [
        {
          "id": 1,
          "front_text": "Question?",
          "back_text": "Answer",
          "source_type": "ai_full",
          "created_at": "timestamp",
          "updated_at": "timestamp"
        },
        ...
      ]
    }
    ```
- **Error Responses**:
  - **401 Unauthorized**: User not authenticated
  - **403 Forbidden**: User doesn't own this generation
  - **404 Not Found**: Generation not found
  - **500 Internal Server Error**: Unexpected server error

## 5. Data Flow

### POST /api/generations Flow
1. **Endpoint Handler**:
   - Receives request with source text
   - Validates user authentication via Supabase Auth
   - Validates source text length (1000-10000 characters)
2. **Service Layer**:
   - Create a new record in the `generations` table with initial data
   - Call AI service to generate flashcard proposals
   - Measure generation duration
   - Update the generation record with results
   - Record error in generation_error_logs if issue appear
3. **Response**:
   - Return generation metadata and flashcard proposals

### GET /api/generations/{id} Flow
1. **Endpoint Handler**:
   - Receives request with generation ID
   - Validates user authentication via Supabase Auth
   - Validates user ownership of the generation
2. **Service Layer**:
   - Fetch generation record from `generations` table
   - Fetch associated flashcards from `flashcards` table (if any have been accepted)
3. **Response**:
   - Return generation metadata and flashcards

## 6. Security Considerations

### Authentication
- All endpoints require Supabase Auth

### Input Validation
- Validate source text length (between 1000 and 10000 characters)
- Use Zod schemas for request validation
- Sanitize input to prevent SQL injection and XSS attacks


## 7. Error Handling
- Use consistent error response format:
  ```json
  {
    "error": {
      "code": "error_code",
      "message": "Human-readable error message"
    }
  }
  ```

### Generation Error Logging
- Log AI service errors in the `generation_error_logs` table with:
  - User ID
  - AI model used
  - Source text (and its length)
  - Error code and message
  - Timestamp
- Generation error details should not be returned to end user
- In case of an generation error, the user should see the message “Generation error occurred” all details should be stored in `generation_error_logs`

### Common Error Scenarios
- **Source Text Validation Failure**:
  - Status: 400 Bad Request
  - Log: Validation error
- **AI Service Failure**:
  - Status: 500 Internal Server Error
  - Log: AI service error in `generation_error_logs`
- **Rate Limit Exceeded**:
  - Status: 429 Too Many Requests
  - Log: Rate limit breach


## 8. Performance Considerations  

### AI Service Integration
- Implement 60 seconds timeout handling for AI service calls


### Response Size Management
- Limit the number of flashcards returned in a single response
- Implement pagination if the number of flashcards becomes large
- Consider compression for large response payloads

## 9. Implementation Steps

### 1. Create Directory Structure
```
src/
├── pages/
│   └── api/
│       └── generations/
│           ├── index.ts    # POST endpoint
│           └── [id].ts     # GET endpoint
├── lib/
│   └── services/
│       ├── generation.service.ts   # All generation logic and AI communication here
```

### 2. Create Service Layer

1. Implement `lib/services/generation.service.ts`:
   - Create function to start a new generation
   - Create function to retrieve generation by ID
   - Handle database interactions with Supabase
   - Create function to call AI service (OpenRouter.ai)
   - Implement error handling and timeout management
   - Return structured flashcard proposals

### 3. Create API Endpoints
1. Implement `pages/api/generations/index.ts`:
   - Create Astro API route with POST handler
   - Implement request validation with Zod
   - Use generation service to process request
   - Return appropriate response with status code

2. Implement `pages/api/generations/[id].ts`:
   - Create Astro API route with GET handler
   - Extract ID from route parameters
   - Implement validation and authorization
   - Use generation service to retrieve data
   - Return appropriate response with status code

### 4. Add Validation
1. Create Zod schemas for request validation:
   - Schema for POST `/api/generations` request body
   - Schema for generation ID validation

2. Authentication:
   - The endpoint should be secured using Supabase Auth. Only authorized users are allowed to initiate the generation process

