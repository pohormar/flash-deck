-- Migration: 20250509233621_disable_policies
-- Description: Disable all previously defined RLS policies on tables
-- Created at: 2025-05-09T23:36:21Z

-- Disable policies for flashcards table
drop policy if exists "Users can select their own flashcards" on flashcards;
drop policy if exists "Users can insert their own flashcards" on flashcards;
drop policy if exists "Users can update their own flashcards" on flashcards;
drop policy if exists "Users can delete their own flashcards" on flashcards;
drop policy if exists "Anonymous users cannot access flashcards" on flashcards;

-- Disable policies for flashcard_progress table
drop policy if exists "Users can select their own flashcard progress" on flashcard_progress;
drop policy if exists "Users can insert their own flashcard progress" on flashcard_progress;
drop policy if exists "Users can update their own flashcard progress" on flashcard_progress;
drop policy if exists "Users can delete their own flashcard progress" on flashcard_progress;
drop policy if exists "Anonymous users cannot access flashcard progress" on flashcard_progress;

-- Disable policies for generations table
drop policy if exists "Users can select their own generations" on generations;
drop policy if exists "Users can insert their own generations" on generations;
drop policy if exists "Users can update their own generations" on generations;
drop policy if exists "Users can delete their own generations" on generations;
drop policy if exists "Anonymous users cannot access generations" on generations;

-- Disable policies for generation_error_logs table
drop policy if exists "Users can select their own generation error logs" on generation_error_logs;
drop policy if exists "Users can insert their own generation error logs" on generation_error_logs;
drop policy if exists "Users can delete their own generation error logs" on generation_error_logs;
drop policy if exists "Anonymous users cannot access generation error logs" on generation_error_logs; 