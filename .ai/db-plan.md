# Schemat bazy danych dla aplikacji 10x-cards

## 1. Tabele

### auth.users
Standardowa tabela dostarczana przez Supabase Auth. Będzie wykorzystywana bez modyfikacji. 
Tabela "users" będzie obsługiwana przez Supabase Auth


### generations
```sql
CREATE TABLE generations (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_text TEXT NOT NULL,
    source_text_length INTEGER NOT NULL CHECK(source_text_length BETWEEN 1000 and 10000),
    generation_duration INTEGER, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    flashcards_count INTEGER NOT NULL DEFAULT 0,
    accepted_unedited_count INTEGER,
    accepted_edited_count INTEGER,
    error_message TEXT
);

CREATE INDEX idx_generations_user_id ON generations(user_id);
```

### flashcards
```sql
CREATE TYPE source_type AS ENUM ('ai_full', 'ai_edited', 'manual');

CREATE TABLE flashcards (
    id SERIAL PRIMARY KEY,
    front_text VARCHAR(200) NOT NULL,
    back_text VARCHAR(500) NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    generation_id INTEGER REFERENCES generations(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    source_type source_type NOT NULL
    );

CREATE INDEX idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX idx_flashcards_generation_id ON flashcards(generation_id);
```

### generation_error_logs
```sql
CREATE TABLE generation_error_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model TEXT NOT NULL,
    source_text TEXT NOT NULL,
    source_text_length INTEGER NOT NULL CHECK(source_text_length BETWEEN 1000 and 10000),
    error_code TEXT NOT NULL,
    error_message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_generation_error_logs_user_id ON generation_error_logs(user_id);
```

## 2. Relacje między tabelami

1. **auth.users - flashcards**: Relacja jeden-do-wielu. Jeden użytkownik może mieć wiele fiszek.
2. **auth.users - generations**: Relacja jeden-do-wielu. Jeden użytkownik może mieć wiele historii generowania przez AI.
3. **generations - flashcards**: Relacja jeden-do-wielu. Jedna sesja generowania może utworzyć wiele fiszek. Każda fiszka może opcjonalnie odnosić się do jednej sesji generowania (generations) poprzez pole generation_id.
4. **auth.users - generation_error_logs**: Relacja jeden-do-wielu. Jeden użytkownik może mieć wiele logów błędów generowania.

## 3. Indeksy

1. `idx_flashcards_user_id`: Indeks na polu user_id w tabeli flashcards.
2. `idx_flashcards_generation_id`: Indeks na polu generation_id w tabeli flashcards.
3. `idx_generations_user_id`: Indeks na polu user_id w tabeli generations.
4. `idx_generation_error_logs_user_id`: Indeks na polu user_id w tabeli generation_error_logs.

## 4. Triggery i funkcje

### Trigger dla automatycznej aktualizacji pola updated_at
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_flashcards_updated_at
BEFORE UPDATE ON flashcards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_generations_updated_at
BEFORE UPDATE ON generations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```


## 5. Polityki RLS (Row Level Security)

```sql
-- Włączenie RLS dla wszystkich tabel
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_error_logs ENABLE ROW LEVEL SECURITY;

-- Polityki dostępu dla wszystkich operacji
CREATE POLICY flashcards_policy ON flashcards 
    USING (auth.uid() = user_id);

CREATE POLICY generations_policy ON generations 
    USING (auth.uid() = user_id);

CREATE POLICY generation_error_logs_policy ON generation_error_logs 
    USING (auth.uid() = user_id);
```

Powyższe polityki RLS zapewniają, że użytkownik ma dostęp (odczyt, zapis, aktualizacja, usuwanie) tylko do rekordów, gdzie wartość pola `user_id` odpowiada jego identyfikatorowi z Supabase Auth. Zabezpiecza to dane użytkowników przed nieautoryzowanym dostępem.

## 6. Uwagi do implementacji

1. **Supabase Auth**: Wykorzystujemy standardową tabelę auth.users z Supabase, co upraszcza implementację autentykacji i autoryzacji.

2. **Bezpieczeństwo**: Wszystkie tabele mają polityki RLS, które zapewniają, że użytkownicy mają dostęp tylko do własnych danych.

3. **Przechowywanie historii generowania**: Tabela generations przechowuje podstawowe informacje o procesie generowania, takie jak sam tekst źródłowy, jego długość, liczba wygenerowanych i zaakceptowanych fiszek oraz ewentualne błędy.

4. **Logowanie błędów**: Tabela generation_error_logs służy do szczegółowego logowania błędów podczas generowania fiszek, przechowując informacje o użytym modelu AI, tekście wejściowym i szczegółach błędu.

5. **Relacja między generacjami a fiszkami**: Każda fiszka może być powiązana z konkretną sesją generowania przez AI za pomocą pola generation_id, co pozwala na śledzenie pochodzenia fiszek i analizę skuteczności różnych sesji generowania.