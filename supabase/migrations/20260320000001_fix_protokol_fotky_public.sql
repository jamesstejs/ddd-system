-- ============================================================
-- Fix: protokol-fotky bucket must be public
-- ============================================================
-- The migration 20260317000003 incorrectly set this bucket to private.
-- All image uploads use getPublicUrl() and store absolute public URLs in DB.
-- Signed URLs would expire and break image display.
-- RLS policies still protect upload/delete operations.

UPDATE storage.buckets
SET public = true
WHERE id = 'protokol-fotky';
