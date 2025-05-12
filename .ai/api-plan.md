# REST API Plan

## 1. Resources

- **Users** - Represented by the `auth.users` table, managed by Supabase Auth
- **Generations** - Represented by the `generations` table
- **Flashcards** - Represented by the `flashcards` table
- **Generation Error Logs** - Represented by the `generation_error_logs`

## 2. Endpoints


### Generations

#### Start a new generation
- **Method**: POST
- **Path**: `/api/generations`
- **Description**: Initiates a new flashcard generation proposals from source text
- **Errors**: AI services errors logs should be recorded in `generation_error_logs`
- **Request Body**:
  ```json
  {
    "source_text": "Text content to generate flashcards from..."
  }
  ```
- **Response**:
  ```json
  {
    "id": "uuid",
    "user_id": "uuid",
    "source_text_length": 1234,
    "generation_duration": 3200,
    "created_at": "timestamp",
    "flashcards_count": 10,
    "flashcards": [
      {
        "id": "card-1",
        "front_text": "What is photosynthesis?",
        "back_text": "Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize nutrients from carbon dioxide and water.",
        "source_type": "ai_full",
      },
      {
        "id": "card-2",
        "front_text": "What are the primary reactants in photosynthesis?",
        "back_text": "The primary reactants in photosynthesis are carbon dioxide, water, and sunlight energy.",
        "source_type": "ai_full",
      },
      {
        "id": "card-3",
        "front_text": "What is the main product of photosynthesis?",
        "back_text": "The main products of photosynthesis are glucose (sugar) and oxygen.",
        "source_type": "ai_full",
      }
    ]
      }
  ```
- **Success Codes**: 200 OK (if synchronous) or 202 Accepted (if asynchronous)
- **Error Codes**: 
  - 400 Bad Request - Text too short or too long
  - 401 Unauthorized - User not authenticated
  - 429 Too Many Requests - Rate limit exceeded

#### Get generation status and results
- **Method**: GET
- **Path**: `/api/generations/{id}`
- **Description**: Retrieves the status of a generation and its results if complete
- **Response**:
  ```json
  {
    "id": "uuid",
    "user_id": "uuid",
    "source_text_length": 1234,
    "generation_duration": 3200,
    "created_at": "timestamp",
    "flashcards_count": 10,
    "flashcards": [
      {
        "id": "card-1",
        "front_text": "What is photosynthesis?",
        "back_text": "Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize nutrients from carbon dioxide and water.",
        "source_type": "ai_full"
      },
      {
        "id": "card-2",
        "front_text": "What are the primary reactants in photosynthesis?",
        "back_text": "The primary reactants in photosynthesis are carbon dioxide, water, and sunlight energy.",
        "source_type": "ai_full"
      },
      {
        "id": "card-3",
        "front_text": "What is the main product of photosynthesis?",
        "back_text": "The main products of photosynthesis are glucose (sugar) and oxygen.",
        "source_type": "ai_full"
      }
    ]
  }
  ```
- **Success Codes**: 200 OK
- **Error Codes**:
  - 401 Unauthorized - User not authenticated
  - 403 Forbidden - User doesn't own this generation
  - 404 Not Found - Generation not found

#### List user's generations
- **Method**: GET
- **Path**: `/api/generations`
- **Description**: Lists all generations created by the authenticated user
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `sort`: Sort field (default: created_at)
  - `order`: Sort order (asc/desc, default: desc)
- **Response**:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "source_text_length": 1234,
        "created_at": "timestamp",
        "flashcards_count": 10,
        "accepted_unedited_count": 7,
        "accepted_edited_count": 2,
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 10,
      "pages": 5
    }
  }
  ```
- **Success Codes**: 200 OK
- **Error Codes**:
  - 401 Unauthorized - User not authenticated

#### Accept generated flashcards
- **Method**: POST
- **Path**: `/api/generations/{id}/accept`
- **Description**: Accepts specified flashcards from a generation into the user's collection
- **Request Body**:
  ```json
  {
    "flashcards": [
      {
        "id": "uuid",
        "front_text": "Question?", 
        "back_text": "Answer",
        "source": "manual",
        "generation_id": null
      }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "accepted_count": 5,
    "flashcards": [
      {
        "id": "uuid",
        "front_text": "Question?",
        "back_text": "Answer",
        "created_at": "timestamp"
      }
    ]
  }
  ```
- **Success Codes**: 201 Created
- **Error Codes**:
  - 400 Bad Request - Invalid flashcard data
  - 401 Unauthorized - User not authenticated
  - 403 Forbidden - User doesn't own this generation
  - 404 Not Found - Generation not found

### Flashcards

#### Create flashcard
- **Method**: POST
- **Path**: `/api/flashcards`
- **Description**: Creates a new flashcard manually
- **Request Body**:
  ```json
  {"flashcards": [
    {
    "front_text": "Question 1?",
    "back_text": "Answer 1",
    "source_type": "manual",
    "generation_id": null
    },
    {
    "front_text": "Question 2?",
    "back_text": "Answer 2",
    "source_type": "ai-full",
    "generation_id": 1234
    },
    ]
  }
  ```
- **Response**:
  ```json
  {"flashcards": [
    {
    "front_text": "Question 1?",
    "back_text": "Answer 1",
    "source_type": "manual",
    "generation_id": null
    },
    {
    "front_text": "Question 2?",
    "back_text": "Answer 2",
    "source_type": "ai-full",
    "generation_id": 1234
    },
    ]
  } 
  ```
- **Success Codes**: 201 Created
- **Error Codes**:
  - 400 Bad Request - Invalid flashcard data
  - 401 Unauthorized - User not authenticated

#### List flashcards
- **Method**: GET
- **Path**: `/api/flashcards`
- **Description**: Lists all flashcards created by the authenticated user
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20)
  - `sort`: Sort field (default: created_at)
  - `order`: Sort order (asc/desc, default: desc)
  - `source_type`: Filter by source type (manual, ai_full, ai_edited)
  - `generation_id`: Filter by generation ID
- **Response**:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "front_text": "Question?",
        "back_text": "Answer",
        "created_at": "timestamp",
        "updated_at": "timestamp", 
        "source_type": "manual",
      }
    ],
    "pagination": {
      "total": 120,
      "page": 1,
      "limit": 20,
      "pages": 6
    }
  }
  ```
- **Success Codes**: 200 OK
- **Error Codes**:
  - 401 Unauthorized - User not authenticated

#### Get flashcard
- **Method**: GET
- **Path**: `/api/flashcards/{id}`
- **Description**: Retrieves a specific flashcard
- **Response**:
  ```json
  {
    "id": "uuid",
    "front_text": "Question?",
    "back_text": "Answer",
    "user_id": "uuid",
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "source_type": "manual",
    "generation_id": null,
  }
  ```
- **Success Codes**: 200 OK
- **Error Codes**:
  - 401 Unauthorized - User not authenticated
  - 403 Forbidden - User doesn't own this flashcard
  - 404 Not Found - Flashcard not found

#### Update flashcard
- **Method**: PATCH
- **Path**: `/api/flashcards/{id}`
- **Description**: Updates a specific flashcard
- **Request Body**:
  ```json
  {
    "front_text": "Updated question?",
    "back_text": "Updated answer"
   }
  ```
- **Response**:
  ```json
  {
    "id": "uuid",
    "front_text": "Updated question?",
    "back_text": "Updated answer",
    "user_id": "uuid",
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "source_type": "manual"
  }
  ```
- **Success Codes**: 200 OK
- **Error Codes**:
  - 400 Bad Request - Invalid flashcard data
  - 401 Unauthorized - User not authenticated
  - 403 Forbidden - User doesn't own this flashcard
  - 404 Not Found - Flashcard not found

#### Delete flashcard
- **Method**: DELETE
- **Path**: `/api/flashcards/{id}`
- **Description**: Deletes a specific flashcard
- **Response**: None
- **Success Codes**: 204 No Content
- **Error Codes**:
  - 401 Unauthorized - User not authenticated
  - 403 Forbidden - User doesn't own this flashcard
  - 404 Not Found - Flashcard not found

 

### User Data

#### Export user data
- **Method**: GET
- **Path**: `/api/user/data`
- **Description**: Exports all user data (GDPR compliance)
- **Response**: Application/JSON file with all user data
- **Success Codes**: 200 OK
- **Error Codes**:
  - 401 Unauthorized - User not authenticated

#### Delete user account
- **Method**: DELETE
- **Path**: `/api/user`
- **Description**: Deletes user account and all associated data
- **Response**: None
- **Success Codes**: 204 No Content
- **Error Codes**:
  - 401 Unauthorized - User not authenticated

### Generation Error Logs

#### List generation error logs
- **Method**: GET
- **Path**: `/api/generation-error-logs`
- **Description**: Lists error logs for ai services generation attempts by the authenticated user,
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `sort`: Sort field (default: created_at)
  - `order`: Sort order (asc/desc, default: desc)
- **Response**:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "model": "gpt-4",
        "source_text_length": 2500,
        "error_code": "context_length_exceeded",
        "error_message": "The provided text exceeds the model's context length limit",
        "created_at": "timestamp"
      }
    ],
    "pagination": {
      "total": 8,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  }
  ```
- **Success Codes**: 200 OK
- **Error Codes**:
  - 401 Unauthorized - User not authenticated

#### Get generation error log
- **Method**: GET
- **Path**: `/api/generation-error-logs/{id}`
- **Description**: Retrieves a specific generation error log
- **Response**:
  ```json
  {
    "id": "uuid",
    "user_id": "uuid",
    "model": "gpt-4",
    "source_text": "Full text that caused the error...",
    "source_text_length": 2500,
    "error_code": "context_length_exceeded",
    "error_message": "The provided text exceeds the model's context length limit",
    "created_at": "timestamp"
  }
  ```
- **Success Codes**: 200 OK
- **Error Codes**:
  - 401 Unauthorized - User not authenticated
  - 403 Forbidden - User doesn't own this error log
  - 404 Not Found - Error log not found

## 3. Authentication and Authorization

Authentication will be handled by Supabase Auth. All API endpoints will require a valid JWT token from Supabase Auth, which should be included in the request headers as:

```
Authorization: Bearer <jwt_token>
```

Authorization will be enforced at two levels:

1. **API Level**: The API will verify the JWT token and extract the user ID from it. All endpoints will only allow access to resources owned by the authenticated user.

2. **Database Level**: Supabase Row Level Security (RLS) policies will ensure that even if the API has bugs, users can only access their own data:

```sql
-- Example RLS policy for flashcards
CREATE POLICY flashcards_policy ON flashcards 
    USING (auth.uid() = user_id);
```

## 4. Validation and Business Logic

### Validation Rules

#### Generations
- Source text must be between 1000 and 10000 characters
- User must be authenticated
- Call the AI Service to generate flashcard proposal  
- The respose must contain at least 1 and at most 100 flashcards in a single batch
- If any flashcard in the batch fails validation, none of the flashcards will be created (all-or-nothing transaction), any issues with flashcards generations should be recorded in generation_error_logs
- When generation_id is provided:
  - The generation must exist and belong to the authenticated user
  - For flashcards with source_type 'ai_full' or 'ai_edited', the generation_id is required
  - For flashcards with source_type 'manual', the generation_id is optional
- If flashcard proposal generated by AI was edited then set source_type to 'ai_edited'

#### Flashcards
- Front text must be 1-200 characters
- Back text must be 1-500 characters
- Source type must be one of: 'ai_full', 'ai_edited', 'manual'
- User must be authenticated


### Business Logic Implementation

1. **AI Flashcard Generation**
   - When a user submits text, the API initiates an async process to generate flashcards
   - The API polls the LLM service for results and updates the generation record
   - Generated flashcards are temporarily stored and associated with the generation
   - User can review, edit, and accept flashcards into their collection

2. **User Data Management**
   - Export functionality provides all user data in a structured format for GDPR compliance
   - Account deletion cascades to all user data through database relationships

3 . **Error Handling**
   - Generation errors are logged with detailed information for troubleshooting
   - Appropriate HTTP status codes and error messages are returned to the client 