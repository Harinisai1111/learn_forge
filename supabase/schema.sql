-- LearnForge Database Schema
-- This schema stores generated notes and optional session analytics
-- Uploaded files are NOT stored - only generated notes

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Saved Notes Table
CREATE TABLE IF NOT EXISTS saved_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    concept_count INTEGER DEFAULT 0,
    mastery_summary JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_notes_user_id ON saved_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_notes_created_at ON saved_notes(created_at DESC);

-- Optional: Session Analytics Table (for future use)
CREATE TABLE IF NOT EXISTS session_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    session_duration INTEGER,
    concepts_mastered INTEGER DEFAULT 0,
    total_questions_answered INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_analytics_user_id ON session_analytics(user_id);

-- Row Level Security (RLS) Policies
-- Note: For Clerk authentication, we'll disable RLS for now
-- In production, you'd want to implement proper JWT verification
ALTER TABLE saved_notes DISABLE ROW LEVEL SECURITY;

-- Commented out RLS policies - enable these when you set up proper Clerk JWT integration
-- ALTER TABLE saved_notes ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Users can view their own notes"
--     ON saved_notes
--     FOR SELECT
--     USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
-- 
-- CREATE POLICY "Users can insert their own notes"
--     ON saved_notes
--     FOR INSERT
--     WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
-- 
-- CREATE POLICY "Users can update their own notes"
--     ON saved_notes
--     FOR UPDATE
--     USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
-- 
-- CREATE POLICY "Users can delete their own notes"
--     ON saved_notes
--     FOR DELETE
--     USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_saved_notes_updated_at
    BEFORE UPDATE ON saved_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
