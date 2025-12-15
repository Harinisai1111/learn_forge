import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export interface SavedNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  concept_count: number;
  mastery_summary: {
    total: number;
    mastered: number;
    concepts: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface NoteData {
  title: string;
  content: string;
  concept_count: number;
  mastery_summary: {
    total: number;
    mastered: number;
    concepts: string[];
  };
}

/**
 * Save a generated note to the database
 */
export const saveNote = async (userId: string, noteData: NoteData): Promise<SavedNote | null> => {
  try {
    const { data, error } = await supabase
      .from('saved_notes')
      .insert([
        {
          user_id: userId,
          title: noteData.title,
          content: noteData.content,
          concept_count: noteData.concept_count,
          mastery_summary: noteData.mastery_summary,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error saving note:', error);
      return null;
    }

    return data as SavedNote;
  } catch (err) {
    console.error('Exception saving note:', err);
    return null;
  }
};

/**
 * Get all notes for a specific user
 */
export const getUserNotes = async (userId: string): Promise<SavedNote[]> => {
  try {
    const { data, error } = await supabase
      .from('saved_notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return [];
    }

    return (data as SavedNote[]) || [];
  } catch (err) {
    console.error('Exception fetching notes:', err);
    return [];
  }
};

/**
 * Get a specific note by ID
 */
export const getNoteById = async (noteId: string, userId: string): Promise<SavedNote | null> => {
  try {
    const { data, error } = await supabase
      .from('saved_notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching note:', error);
      return null;
    }

    return data as SavedNote;
  } catch (err) {
    console.error('Exception fetching note:', err);
    return null;
  }
};

/**
 * Delete a note
 */
export const deleteNote = async (noteId: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('saved_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting note:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Exception deleting note:', err);
    return false;
  }
};

/**
 * Update a note's title
 */
export const updateNoteTitle = async (
  noteId: string,
  userId: string,
  newTitle: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('saved_notes')
      .update({ title: newTitle })
      .eq('id', noteId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating note:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Exception updating note:', err);
    return false;
  }
};
