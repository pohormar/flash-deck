-- Migration: 20250509232354_initial_schema
-- Description: Initial database schema setup for flash-deck application
-- Created at: 2025-05-09T23:23:54Z

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- create generations table
create table generations (
    id SERIAL PRIMARY KEY,
    user_id uuid not null references auth.users(id) on delete cascade,
    source_text text not null,
    source_text_length integer not null check(source_text_length between 1000 and 10000),
    generation_duration integer, 
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone,
    flashcards_count integer not null default 0,
    accepted_unedited_count integer,
    accepted_edited_count integer,
    error_message text
);

-- index for generations
create index idx_generations_user_id on generations(user_id);

-- enable row level security
alter table generations enable row level security;

-- create source_type enum
create type source_type as enum ('ai_full', 'ai_edited', 'manual');

-- create flashcards table
create table flashcards (
    id SERIAL PRIMARY KEY,
    front_text varchar(200) not null,
    back_text varchar(500) not null,
    user_id uuid not null references auth.users(id) on delete cascade,
    generation_id integer references generations(id) on delete set null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone,
    source_type source_type not null
);

-- indexes for flashcards
create index idx_flashcards_user_id on flashcards(user_id);
create index idx_flashcards_generation_id on flashcards(generation_id);

-- enable row level security
alter table flashcards enable row level security;

-- create generation_error_logs table
create table generation_error_logs (
    id SERIAL PRIMARY KEY,
    user_id uuid not null references auth.users(id) on delete cascade,
    model text not null,
    source_text text not null,
    source_text_length integer not null check(source_text_length between 1000 and 10000),
    error_code text not null,
    error_message text not null,
    created_at timestamp with time zone default now()
);

-- index for generation_error_logs
create index idx_generation_error_logs_user_id on generation_error_logs(user_id);

-- enable row level security
alter table generation_error_logs enable row level security;

-- create trigger function for updating updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- create triggers for updating updated_at
create trigger update_flashcards_updated_at
before update on flashcards
for each row
execute function update_updated_at();

create trigger update_generations_updated_at
before update on generations
for each row
execute function update_updated_at();

-- create row level security policies

-- policies for flashcards table
create policy "Users can select their own flashcards" 
on flashcards for select 
to authenticated 
using (auth.uid() = user_id);

create policy "Users can insert their own flashcards" 
on flashcards for insert 
to authenticated 
with check (auth.uid() = user_id);

create policy "Users can update their own flashcards" 
on flashcards for update 
to authenticated 
using (auth.uid() = user_id);

create policy "Users can delete their own flashcards" 
on flashcards for delete 
to authenticated 
using (auth.uid() = user_id);


-- policies for generations table
create policy "Users can select their own generations" 
on generations for select 
to authenticated 
using (auth.uid() = user_id);

create policy "Users can insert their own generations" 
on generations for insert 
to authenticated 
with check (auth.uid() = user_id);

create policy "Users can update their own generations" 
on generations for update 
to authenticated 
using (auth.uid() = user_id);

create policy "Users can delete their own generations" 
on generations for delete 
to authenticated 
using (auth.uid() = user_id);

-- policies for generation_error_logs table
create policy "Users can select their own generation error logs" 
on generation_error_logs for select 
to authenticated 
using (auth.uid() = user_id);

create policy "Users can insert their own generation error logs" 
on generation_error_logs for insert 
to authenticated 
with check (auth.uid() = user_id);

create policy "Users can delete their own generation error logs" 
on generation_error_logs for delete 
to authenticated 
using (auth.uid() = user_id);

-- Add policies for anon access
create policy "Anonymous users cannot access flashcards"
on flashcards for all
to anon
using (false);

create policy "Anonymous users cannot access generations"
on generations for all
to anon
using (false);

create policy "Anonymous users cannot access generation error logs"
on generation_error_logs for all
to anon
using (false); 